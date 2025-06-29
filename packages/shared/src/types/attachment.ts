import { z } from 'zod';
import { PublicUserSchema } from './user.js';

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/gzip',
  // Code
  'application/json',
  'application/xml',
  'text/html',
  'text/css',
  'text/javascript',
] as const;

export const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Attachment schema
export const AttachmentSchema = z.object({
  _id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_FILE_SIZE),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

// Attachment with populated user
export const AttachmentPopulatedSchema = AttachmentSchema.extend({
  user: PublicUserSchema,
});

export type AttachmentPopulated = z.infer<typeof AttachmentPopulatedSchema>;

// Upload response
export const UploadResponseSchema = z.object({
  attachment: AttachmentSchema,
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// Helper to check if file type is allowed
export function isAllowedFileType(mimeType: string): boolean {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(mimeType);
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Helper to get file extension
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() ?? '' : '';
}

// Helper to check if file is an image
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
