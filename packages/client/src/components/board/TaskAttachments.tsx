import { useState, useEffect, useRef } from 'react';
import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import api from '@/services/api';

interface Attachment {
  _id: string;
  taskId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadedBy: { _id: string; name: string } | string;
  createdAt: string;
}

interface TaskAttachmentsProps {
  taskId: string;
  onCountChange?: (count: number) => void;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return PhotoIcon;
  if (mimeType.startsWith('video/')) return FilmIcon;
  if (mimeType.startsWith('audio/')) return MusicalNoteIcon;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return DocumentTextIcon;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return ArchiveBoxIcon;
  return DocumentIcon;
}

// Get file type color
function getFileColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'bg-pink-100 text-pink-600';
  if (mimeType.startsWith('video/')) return 'bg-purple-100 text-purple-600';
  if (mimeType.startsWith('audio/')) return 'bg-yellow-100 text-yellow-600';
  if (mimeType.includes('pdf')) return 'bg-red-100 text-red-600';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return 'bg-green-100 text-green-600';
  if (mimeType.includes('document') || mimeType.includes('word'))
    return 'bg-blue-100 text-blue-600';
  return 'bg-gray-100 text-gray-600';
}

export default function TaskAttachments({ taskId, onCountChange }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await api.get(`/attachments/task/${taskId}`);
        setAttachments(response.data.data.attachments);
        onCountChange?.(response.data.data.attachments.length);
      } catch (error) {
        console.error('Failed to fetch attachments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttachments();
  }, [taskId, onCountChange]);

  // Handle file upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.post(`/attachments/task/${taskId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          },
        });

        setAttachments((prev) => [...prev, response.data.data.attachment]);
        onCountChange?.(attachments.length + 1);
      } catch (error) {
        console.error('Failed to upload file:', error);
        alert('Failed to upload file. Please try again.');
      }
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle delete
  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;

    try {
      await api.delete(`/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
      onCountChange?.(attachments.length - 1);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  // Handle download
  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await api.get(`/attachments/${attachment._id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment:', error);
    }
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const getUploaderName = (uploadedBy: Attachment['uploadedBy']): string => {
    return typeof uploadedBy === 'string' ? 'Unknown' : uploadedBy.name;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <PaperClipIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dragActive ? (
              'Drop files here'
            ) : (
              <>
                <span className="text-primary-500 hover:text-primary-600">Click to upload</span>
                {' or drag and drop'}
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">Max file size: 10MB</p>
        </label>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Attachments list */}
      {attachments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mimeType);
            return (
              <div
                key={attachment._id}
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group"
              >
                {/* File icon */}
                <div
                  className={clsx(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                    getFileColor(attachment.mimeType)
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.originalFilename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)} •{' '}
                    {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                    {' by '}{getUploaderName(attachment.uploadedBy)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(attachment._id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
