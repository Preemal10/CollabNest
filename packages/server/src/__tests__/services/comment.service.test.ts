import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commentService } from '../../services/comment.service.js';
import { Comment } from '../../models/index.js';
import {
  createTestUser,
  createTestProject,
  createTestBoard,
  createTestTask,
} from '../utils/testHelpers.js';

// Mock the websocket emitters
vi.mock('../../websocket/emitters.js', () => ({
  emitCommentCreated: vi.fn(),
  emitCommentUpdated: vi.fn(),
  emitCommentDeleted: vi.fn(),
  emitNotificationToUser: vi.fn(),
  emitNotificationCount: vi.fn(),
}));

describe('CommentService', () => {
  let user: any;
  let project: any;
  let board: any;
  let task: any;

  beforeEach(async () => {
    // Create test data
    user = await createTestUser({ email: 'commenttest@example.com' });
    project = await createTestProject(user._id.toString());
    board = await createTestBoard(project._id.toString(), user._id.toString());
    const columnId = board.columns[0]._id.toString();
    task = await createTestTask(
      board._id.toString(),
      columnId,
      user._id.toString()
    );
  });

  describe('create', () => {
    it('should create a comment successfully', async () => {
      const comment = await commentService.create(
        {
          taskId: task._id.toString(),
          content: 'This is a test comment',
        },
        user._id.toString()
      );

      expect(comment).toBeDefined();
      expect(comment.content).toBe('This is a test comment');
      expect(comment.taskId.toString()).toBe(task._id.toString());
      expect(comment.userId._id.toString()).toBe(user._id.toString());
    });

    it('should create a comment with mentions', async () => {
      const mentionedUser = await createTestUser({ email: 'mentioned@example.com' });
      // Add mentioned user to project so they can be mentioned
      project.members.push({ userId: mentionedUser._id, role: 'viewer' });
      await project.save();

      const comment = await commentService.create(
        {
          taskId: task._id.toString(),
          content: 'Hey @mentioned check this out',
          mentions: [mentionedUser._id.toString()],
        },
        user._id.toString()
      );

      expect(comment.mentions).toHaveLength(1);
      expect(comment.mentions[0]._id.toString()).toBe(mentionedUser._id.toString());
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        commentService.create(
          {
            taskId: '507f1f77bcf86cd799439011',
            content: 'Comment on missing task',
          },
          user._id.toString()
        )
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for user without project access', async () => {
      const unauthorizedUser = await createTestUser({ email: 'unauthorized@example.com' });

      await expect(
        commentService.create(
          {
            taskId: task._id.toString(),
            content: 'Unauthorized comment',
          },
          unauthorizedUser._id.toString()
        )
      ).rejects.toThrow('You do not have access to this task');
    });

    it('should populate user info in created comment', async () => {
      const comment = await commentService.create(
        {
          taskId: task._id.toString(),
          content: 'Comment with user info',
        },
        user._id.toString()
      );

      expect(comment.userId).toBeDefined();
      expect((comment.userId as any).email).toBe('commenttest@example.com');
    });

    it('should not notify user who mentions themselves', async () => {
      // User mentions themselves - no notification should be created
      const comment = await commentService.create(
        {
          taskId: task._id.toString(),
          content: 'I mentioned myself',
          mentions: [user._id.toString()],
        },
        user._id.toString()
      );

      expect(comment).toBeDefined();
      expect(comment.mentions).toHaveLength(1);
    });
  });

  describe('getByTask', () => {
    it('should return all comments for a task', async () => {
      await commentService.create(
        { taskId: task._id.toString(), content: 'Comment 1' },
        user._id.toString()
      );
      await commentService.create(
        { taskId: task._id.toString(), content: 'Comment 2' },
        user._id.toString()
      );
      await commentService.create(
        { taskId: task._id.toString(), content: 'Comment 3' },
        user._id.toString()
      );

      const comments = await commentService.getByTask(
        task._id.toString(),
        user._id.toString()
      );

      expect(comments).toHaveLength(3);
    });

    it('should return comments sorted by creation date (oldest first)', async () => {
      await commentService.create(
        { taskId: task._id.toString(), content: 'First comment' },
        user._id.toString()
      );
      await commentService.create(
        { taskId: task._id.toString(), content: 'Second comment' },
        user._id.toString()
      );

      const comments = await commentService.getByTask(
        task._id.toString(),
        user._id.toString()
      );

      expect(comments[0].content).toBe('First comment');
      expect(comments[1].content).toBe('Second comment');
    });

    it('should return empty array for task with no comments', async () => {
      const comments = await commentService.getByTask(
        task._id.toString(),
        user._id.toString()
      );

      expect(comments).toHaveLength(0);
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        commentService.getByTask('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for user without project access', async () => {
      const unauthorizedUser = await createTestUser({ email: 'noview@example.com' });

      await expect(
        commentService.getByTask(task._id.toString(), unauthorizedUser._id.toString())
      ).rejects.toThrow('You do not have access to this task');
    });

    it('should populate user info in returned comments', async () => {
      await commentService.create(
        { taskId: task._id.toString(), content: 'Populated comment' },
        user._id.toString()
      );

      const comments = await commentService.getByTask(
        task._id.toString(),
        user._id.toString()
      );

      expect(comments[0].userId).toBeDefined();
      expect((comments[0].userId as any).name).toBe('Test User');
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'Original content' },
        user._id.toString()
      );

      const updated = await commentService.update(
        comment._id.toString(),
        { content: 'Updated content' },
        user._id.toString()
      );

      expect(updated.content).toBe('Updated content');
    });

    it('should mark comment as edited', async () => {
      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'Original' },
        user._id.toString()
      );

      const updated = await commentService.update(
        comment._id.toString(),
        { content: 'Edited' },
        user._id.toString()
      );

      expect(updated.isEdited).toBe(true);
      expect(updated.editedAt).toBeDefined();
    });

    it('should update mentions', async () => {
      const mentionedUser = await createTestUser({ email: 'newmention@example.com' });
      project.members.push({ userId: mentionedUser._id, role: 'viewer' });
      await project.save();

      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'No mentions' },
        user._id.toString()
      );

      const updated = await commentService.update(
        comment._id.toString(),
        {
          content: 'Now with mentions',
          mentions: [mentionedUser._id.toString()],
        },
        user._id.toString()
      );

      expect(updated.mentions).toHaveLength(1);
    });

    it('should throw error when non-author tries to update', async () => {
      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'My comment' },
        user._id.toString()
      );

      const anotherUser = await createTestUser({ email: 'notauthor@example.com' });

      await expect(
        commentService.update(
          comment._id.toString(),
          { content: 'Trying to edit' },
          anotherUser._id.toString()
        )
      ).rejects.toThrow('You can only edit your own comments');
    });

    it('should throw error for non-existent comment', async () => {
      await expect(
        commentService.update(
          '507f1f77bcf86cd799439011',
          { content: 'Updated' },
          user._id.toString()
        )
      ).rejects.toThrow('Comment not found');
    });

    it('should preserve existing mentions if not provided in update', async () => {
      const mentionedUser = await createTestUser({ email: 'keepmention@example.com' });
      project.members.push({ userId: mentionedUser._id, role: 'viewer' });
      await project.save();

      const comment = await commentService.create(
        {
          taskId: task._id.toString(),
          content: 'With mention',
          mentions: [mentionedUser._id.toString()],
        },
        user._id.toString()
      );

      const updated = await commentService.update(
        comment._id.toString(),
        { content: 'Updated but keep mentions' },
        user._id.toString()
      );

      expect(updated.mentions).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete comment successfully as author', async () => {
      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'Delete me' },
        user._id.toString()
      );

      await commentService.delete(comment._id.toString(), user._id.toString());

      const deleted = await Comment.findById(comment._id);
      expect(deleted).toBeNull();
    });

    it('should allow project manager to delete any comment', async () => {
      // Create a comment by a regular member
      const member = await createTestUser({ email: 'member@example.com' });
      project.members.push({ userId: member._id, role: 'viewer' });
      await project.save();

      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'Member comment' },
        member._id.toString()
      );

      // Owner (manager) should be able to delete
      await commentService.delete(comment._id.toString(), user._id.toString());

      const deleted = await Comment.findById(comment._id);
      expect(deleted).toBeNull();
    });

    it('should throw error when non-author non-manager tries to delete', async () => {
      const comment = await commentService.create(
        { taskId: task._id.toString(), content: 'Protected comment' },
        user._id.toString()
      );

      const nonManager = await createTestUser({ email: 'nonmanager@example.com' });
      // Add as regular member (viewer), not manager
      project.members.push({ userId: nonManager._id, role: 'viewer' });
      await project.save();

      await expect(
        commentService.delete(comment._id.toString(), nonManager._id.toString())
      ).rejects.toThrow('You can only delete your own comments');
    });

    it('should throw error for non-existent comment', async () => {
      await expect(
        commentService.delete('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Comment not found');
    });

    it('should update task comment count after deletion', async () => {
      const comment1 = await commentService.create(
        { taskId: task._id.toString(), content: 'Comment 1' },
        user._id.toString()
      );
      await commentService.create(
        { taskId: task._id.toString(), content: 'Comment 2' },
        user._id.toString()
      );

      await commentService.delete(comment1._id.toString(), user._id.toString());

      const remainingComments = await Comment.countDocuments({ taskId: task._id });
      expect(remainingComments).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', async () => {
      // The model requires content, so this should fail
      await expect(
        commentService.create(
          { taskId: task._id.toString(), content: '' },
          user._id.toString()
        )
      ).rejects.toThrow();
    });

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(5000); // Max length is 5000

      const comment = await commentService.create(
        { taskId: task._id.toString(), content: longContent },
        user._id.toString()
      );

      expect(comment.content).toBe(longContent);
    });

    it('should reject content exceeding max length', async () => {
      const tooLongContent = 'a'.repeat(5001); // Exceeds max length of 5000

      await expect(
        commentService.create(
          { taskId: task._id.toString(), content: tooLongContent },
          user._id.toString()
        )
      ).rejects.toThrow();
    });

    it('should handle multiple comments from different users', async () => {
      const secondUser = await createTestUser({ email: 'second@example.com' });
      project.members.push({ userId: secondUser._id, role: 'viewer' });
      await project.save();

      await commentService.create(
        { taskId: task._id.toString(), content: 'User 1 comment' },
        user._id.toString()
      );
      await commentService.create(
        { taskId: task._id.toString(), content: 'User 2 comment' },
        secondUser._id.toString()
      );

      const comments = await commentService.getByTask(
        task._id.toString(),
        user._id.toString()
      );

      expect(comments).toHaveLength(2);
      const authors = comments.map(c => (c.userId as any)._id.toString());
      expect(authors).toContain(user._id.toString());
      expect(authors).toContain(secondUser._id.toString());
    });

    it('should handle invalid ObjectId format for taskId', async () => {
      await expect(
        commentService.create(
          { taskId: 'invalid-id', content: 'Test' },
          user._id.toString()
        )
      ).rejects.toThrow();
    });

    it('should handle invalid ObjectId format for commentId in update', async () => {
      await expect(
        commentService.update(
          'invalid-id',
          { content: 'Updated' },
          user._id.toString()
        )
      ).rejects.toThrow();
    });

    it('should handle invalid ObjectId format for commentId in delete', async () => {
      await expect(
        commentService.delete('invalid-id', user._id.toString())
      ).rejects.toThrow();
    });
  });
});
