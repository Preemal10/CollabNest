import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Attachment, Task, Board, Project, type IAttachment } from '../models/index.js';
import { ApiError } from '../utils/errors.js';
import { activityService } from './activity.service.js';
import { config } from '../config/index.js';
import { isAllowedFileType, MAX_ATTACHMENT_FILE_SIZE } from '@collabnest/shared';

// Upload file info
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

class AttachmentService {
  /**
   * Upload attachment to task
   */
  async upload(
    taskId: string,
    file: UploadedFile,
    userId: string
  ): Promise<IAttachment> {
    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    // Verify access
    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canEdit(userId)) {
      throw ApiError.insufficientPermissions('You do not have permission to upload attachments');
    }

    // Validate file type
    if (!isAllowedFileType(file.mimetype)) {
      throw ApiError.invalidFileType('This file type is not allowed');
    }

    // Validate file size
    if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
      throw ApiError.fileTooLarge('File size exceeds the 10MB limit');
    }

    // Check attachment limit
    if (task.attachmentCount >= 20) {
      throw ApiError.conflict('Maximum of 20 attachments per task');
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;

    // Create upload directory if not exists
    const uploadDir = path.join(config.UPLOAD_DIR, 'attachments', taskId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, file.buffer);

    // Generate URL (for local development)
    const url = `/uploads/attachments/${taskId}/${filename}`;

    // Create attachment record
    const attachment = new Attachment({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      // TODO: Generate thumbnails for images
    });

    await attachment.save();

    // Log activity
    await activityService.log({
      type: 'attachment.uploaded',
      entityType: 'attachment',
      entityId: attachment._id,
      projectId: board?.projectId.toString(),
      boardId: board?._id.toString(),
      taskId,
      userId,
      metadata: {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    });

    return attachment.populate('userId', 'name email avatar');
  }

  /**
   * Get attachments for a task
   */
  async getByTask(taskId: string, userId: string): Promise<IAttachment[]> {
    // Verify task access
    const task = await Task.findById(taskId);
    if (!task) {
      throw ApiError.notFound('Task');
    }

    const board = await Board.findById(task.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    return Attachment.findByTask(taskId);
  }

  /**
   * Get attachment by ID
   */
  async getById(attachmentId: string, userId: string): Promise<IAttachment> {
    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      throw ApiError.notFound('Attachment');
    }

    // Verify access
    const task = await Task.findById(attachment.taskId);
    const board = await Board.findById(task?.boardId);
    const project = await Project.findById(board?.projectId);

    if (!project || !project.canView(userId)) {
      throw ApiError.forbidden('You do not have access to this attachment');
    }

    return attachment;
  }

  /**
   * Delete attachment
   */
  async delete(attachmentId: string, userId: string): Promise<void> {
    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      throw ApiError.notFound('Attachment');
    }

    // Check permission - uploader or project manager can delete
    if (attachment.userId.toString() !== userId) {
      const task = await Task.findById(attachment.taskId);
      const board = await Board.findById(task?.boardId);
      const project = await Project.findById(board?.projectId);

      if (!project || !project.isManager(userId)) {
        throw ApiError.insufficientPermissions('You can only delete your own attachments');
      }
    }

    // Delete file from disk
    try {
      const filePath = path.join(
        config.UPLOAD_DIR,
        'attachments',
        attachment.taskId.toString(),
        attachment.filename
      );
      await fs.unlink(filePath);
    } catch {
      // File might not exist, continue with db deletion
    }

    // Delete from database
    await Attachment.findByIdAndDelete(attachmentId);

    // Log activity
    await activityService.log({
      type: 'attachment.deleted',
      entityType: 'attachment',
      entityId: attachment._id,
      taskId: attachment.taskId.toString(),
      userId,
      metadata: { filename: attachment.originalFilename },
    });
  }

  /**
   * Get file path for download
   */
  async getFilePath(attachmentId: string, userId: string): Promise<string> {
    const attachment = await this.getById(attachmentId, userId);

    const filePath = path.join(
      config.UPLOAD_DIR,
      'attachments',
      attachment.taskId.toString(),
      attachment.filename
    );

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch {
      throw ApiError.notFound('File', 'Attachment file not found');
    }

    return filePath;
  }
}

export const attachmentService = new AttachmentService();
