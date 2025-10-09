import { useState, useEffect } from 'react';
import { PaperAirplaneIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { commentsApi } from '@/services/api';
import { useAppSelector } from '@/hooks/useStore';

interface Comment {
  _id: string;
  taskId: string;
  userId: { _id: string; name: string; email: string; avatar?: string } | string;
  content: string;
  mentions: Array<{ _id: string; name: string }>;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskCommentsProps {
  taskId: string;
}

export default function TaskComments({ taskId }: TaskCommentsProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await commentsApi.listByTask(taskId);
        setComments(response.comments as unknown as Comment[]);
      } catch (error) {
        console.error('Failed to fetch comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await commentsApi.create({
        taskId,
        content: newComment.trim(),
      });
      setComments([...comments, response.comment as unknown as Comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await commentsApi.update(commentId, {
        content: editContent.trim(),
      });
      setComments(
        comments.map((c) =>
          c._id === commentId ? (response.comment as unknown as Comment) : c
        )
      );
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await commentsApi.delete(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment._id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const getUserId = (userId: Comment['userId']): string => {
    return typeof userId === 'string' ? userId : userId._id;
  };

  const getUserName = (userId: Comment['userId']): string => {
    return typeof userId === 'string' ? 'Unknown' : userId.name;
  };

  const getUserInitial = (userId: Comment['userId']): string => {
    const name = getUserName(userId);
    return name.charAt(0).toUpperCase();
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
      {/* Comments list */}
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                {getUserInitial(comment.userId)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getUserName(comment.userId)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {comment.isEdited && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>

                {editingId === comment._id ? (
                  <div className="mt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500 dark:bg-gray-800 dark:text-white resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleEdit(comment._id)}
                        className="text-xs text-primary-500 hover:text-primary-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-gray-500 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    {/* Actions */}
                    {user && getUserId(comment.userId) === user._id && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          <PencilIcon className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                        >
                          <TrashIcon className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
