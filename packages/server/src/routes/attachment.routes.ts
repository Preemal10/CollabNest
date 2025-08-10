import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { validate, mongoIdSchema } from '../middleware/validate.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { asyncHandler, ApiError } from '../utils/errors.js';
import { attachmentService } from '../services/attachment.service.js';
import { MAX_ATTACHMENT_FILE_SIZE } from '@collabnest/shared';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_FILE_SIZE,
  },
});

// All routes require authentication
router.use(authenticate);

/**
 * GET /attachments/task/:taskId
 * Get all attachments for a task
 */
const taskIdParamSchema = z.object({
  taskId: mongoIdSchema,
});

router.get(
  '/task/:taskId',
  validate(taskIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const attachments = await attachmentService.getByTask(
      req.params.taskId!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { attachments },
    });
  })
);

/**
 * POST /attachments/task/:taskId
 * Upload attachment to task
 */
router.post(
  '/task/:taskId',
  validate(taskIdParamSchema, 'params'),
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.invalidInput('No file provided');
    }

    const attachment = await attachmentService.upload(
      req.params.taskId!,
      {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      },
      req.user!._id
    );

    res.status(201).json({
      success: true,
      data: { attachment },
      message: 'File uploaded successfully',
    });
  })
);

/**
 * GET /attachments/:id
 * Get attachment by ID
 */
const idParamSchema = z.object({
  id: mongoIdSchema,
});

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const attachment = await attachmentService.getById(
      req.params.id!,
      req.user!._id
    );

    res.json({
      success: true,
      data: { attachment },
    });
  })
);

/**
 * GET /attachments/:id/download
 * Download attachment file
 */
router.get(
  '/:id/download',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const attachment = await attachmentService.getById(
      req.params.id!,
      req.user!._id
    );

    const filePath = await attachmentService.getFilePath(
      req.params.id!,
      req.user!._id
    );

    res.download(filePath, attachment.originalFilename);
  })
);

/**
 * DELETE /attachments/:id
 * Delete attachment
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await attachmentService.delete(req.params.id!, req.user!._id);

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  })
);

export default router;
