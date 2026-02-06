import { describe, it, expect, beforeEach, vi } from 'vitest';
import { taskService } from '../../services/task.service.js';
import { Task } from '../../models/index.js';
import {
  createTestUser,
  createTestProject,
  createTestBoard,
} from '../utils/testHelpers.js';

// Mock the websocket emitters
vi.mock('../../websocket/emitters.js', () => ({
  emitTaskCreated: vi.fn(),
  emitTaskUpdated: vi.fn(),
  emitTaskMoved: vi.fn(),
  emitTaskDeleted: vi.fn(),
}));

describe('TaskService', () => {
  let user: any;
  let project: any;
  let board: any;
  let columnId: string;

  beforeEach(async () => {
    // Create test data
    user = await createTestUser({ email: 'tasktest@example.com' });
    project = await createTestProject(user._id.toString());
    board = await createTestBoard(project._id.toString(), user._id.toString());
    columnId = board.columns[0]._id.toString();
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const task = await taskService.create(
        {
          title: 'Test Task',
          description: 'Test description',
          boardId: board._id.toString(),
          columnId,
          priority: 'high',
        },
        user._id.toString()
      );

      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test description');
      expect(task.priority).toBe('high');
      expect(task.columnId.toString()).toBe(columnId);
    });

    it('should create task with default priority', async () => {
      const task = await taskService.create(
        {
          title: 'Default Priority Task',
          boardId: board._id.toString(),
          columnId,
        },
        user._id.toString()
      );

      expect(task.priority).toBe('medium');
    });

    it('should create task with labels', async () => {
      const task = await taskService.create(
        {
          title: 'Task with Labels',
          boardId: board._id.toString(),
          columnId,
          labels: [
            { name: 'Bug', color: '#ff0000' },
            { name: 'Feature', color: '#00ff00' },
          ],
        },
        user._id.toString()
      );

      expect(task.labels).toHaveLength(2);
      expect(task.labels[0].name).toBe('Bug');
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        taskService.create(
          {
            title: 'Test Task',
            boardId: '507f1f77bcf86cd799439011',
            columnId,
          },
          user._id.toString()
        )
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for non-existent column', async () => {
      await expect(
        taskService.create(
          {
            title: 'Test Task',
            boardId: board._id.toString(),
            columnId: '507f1f77bcf86cd799439011',
          },
          user._id.toString()
        )
      ).rejects.toThrow('Column not found');
    });

    it('should throw error for user without project access', async () => {
      const anotherUser = await createTestUser({ email: 'another@example.com' });

      await expect(
        taskService.create(
          {
            title: 'Test Task',
            boardId: board._id.toString(),
            columnId,
          },
          anotherUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });

    it('should assign correct order to new tasks', async () => {
      const task1 = await taskService.create(
        {
          title: 'Task 1',
          boardId: board._id.toString(),
          columnId,
        },
        user._id.toString()
      );

      const task2 = await taskService.create(
        {
          title: 'Task 2',
          boardId: board._id.toString(),
          columnId,
        },
        user._id.toString()
      );

      expect(task1.order).toBe(0);
      expect(task2.order).toBe(1);
    });
  });

  describe('getById', () => {
    it('should return task by ID', async () => {
      const created = await taskService.create(
        {
          title: 'Get By ID Task',
          boardId: board._id.toString(),
          columnId,
        },
        user._id.toString()
      );

      const task = await taskService.getById(
        created._id.toString(),
        user._id.toString()
      );

      expect(task).toBeDefined();
      expect(task.title).toBe('Get By ID Task');
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        taskService.getById('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Task not found');
    });
  });

  describe('getByBoard', () => {
    it('should return all tasks for a board', async () => {
      await taskService.create(
        { title: 'Task 1', boardId: board._id.toString(), columnId },
        user._id.toString()
      );
      await taskService.create(
        { title: 'Task 2', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const tasks = await taskService.getByBoard(
        board._id.toString(),
        user._id.toString()
      );

      expect(tasks).toHaveLength(2);
    });

    it('should not include archived tasks by default', async () => {
      const task = await taskService.create(
        { title: 'To Archive', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      await taskService.update(
        task._id.toString(),
        { isArchived: true },
        user._id.toString()
      );

      const tasks = await taskService.getByBoard(
        board._id.toString(),
        user._id.toString()
      );

      expect(tasks).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update task title', async () => {
      const task = await taskService.create(
        { title: 'Original Title', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const updated = await taskService.update(
        task._id.toString(),
        { title: 'Updated Title' },
        user._id.toString()
      );

      expect(updated.title).toBe('Updated Title');
    });

    it('should update task priority', async () => {
      const task = await taskService.create(
        { title: 'Priority Task', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const updated = await taskService.update(
        task._id.toString(),
        { priority: 'urgent' },
        user._id.toString()
      );

      expect(updated.priority).toBe('urgent');
    });

    it('should update task due date', async () => {
      const task = await taskService.create(
        { title: 'Due Date Task', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const dueDate = '2026-12-31';
      const updated = await taskService.update(
        task._id.toString(),
        { dueDate },
        user._id.toString()
      );

      expect(updated.dueDate).toBeDefined();
      expect(updated.dueDate!.toISOString().split('T')[0]).toBe(dueDate);
    });

    it('should archive task', async () => {
      const task = await taskService.create(
        { title: 'Archive Me', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const updated = await taskService.update(
        task._id.toString(),
        { isArchived: true },
        user._id.toString()
      );

      expect(updated.isArchived).toBe(true);
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        taskService.update(
          '507f1f77bcf86cd799439011',
          { title: 'Updated' },
          user._id.toString()
        )
      ).rejects.toThrow('Task not found');
    });
  });

  describe('move', () => {
    it('should move task to different column', async () => {
      const task = await taskService.create(
        { title: 'Move Me', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const newColumnId = board.columns[1]._id.toString();
      const moved = await taskService.move(
        task._id.toString(),
        { columnId: newColumnId, order: 0 },
        user._id.toString()
      );

      expect(moved.columnId.toString()).toBe(newColumnId);
    });

    it('should update task order', async () => {
      const task = await taskService.create(
        { title: 'Reorder Me', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const moved = await taskService.move(
        task._id.toString(),
        { columnId, order: 5 },
        user._id.toString()
      );

      expect(moved.order).toBe(5);
    });

    it('should throw error for non-existent target column', async () => {
      const task = await taskService.create(
        { title: 'Bad Move', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      await expect(
        taskService.move(
          task._id.toString(),
          { columnId: '507f1f77bcf86cd799439011', order: 0 },
          user._id.toString()
        )
      ).rejects.toThrow('Column not found');
    });
  });

  describe('delete', () => {
    it('should delete task successfully', async () => {
      const task = await taskService.create(
        { title: 'Delete Me', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      await taskService.delete(task._id.toString(), user._id.toString());

      const deleted = await Task.findById(task._id);
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        taskService.delete('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for user without permission', async () => {
      const anotherUser = await createTestUser({ email: 'nodelete@example.com' });
      const task = await taskService.create(
        { title: 'Cannot Delete', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      await expect(
        taskService.delete(task._id.toString(), anotherUser._id.toString())
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('addLabel', () => {
    it('should add label to task', async () => {
      const task = await taskService.create(
        { title: 'Label Task', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const updated = await taskService.addLabel(
        task._id.toString(),
        'Bug',
        '#ff0000',
        user._id.toString()
      );

      expect(updated.labels).toHaveLength(1);
      expect(updated.labels[0].name).toBe('Bug');
      expect(updated.labels[0].color).toBe('#ff0000');
    });

    it('should enforce maximum label limit', async () => {
      const task = await taskService.create(
        { title: 'Max Labels', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      // Add 10 labels
      for (let i = 0; i < 10; i++) {
        await taskService.addLabel(
          task._id.toString(),
          `Label ${i}`,
          '#000000',
          user._id.toString()
        );
      }

      // 11th label should fail
      await expect(
        taskService.addLabel(
          task._id.toString(),
          'Too Many',
          '#ffffff',
          user._id.toString()
        )
      ).rejects.toThrow('Maximum of 10 labels');
    });
  });

  describe('removeLabel', () => {
    it('should remove label from task', async () => {
      const task = await taskService.create(
        {
          title: 'Remove Label',
          boardId: board._id.toString(),
          columnId,
          labels: [{ name: 'ToRemove', color: '#ff0000' }],
        },
        user._id.toString()
      );

      const labelId = task.labels[0]._id.toString();
      const updated = await taskService.removeLabel(
        task._id.toString(),
        labelId,
        user._id.toString()
      );

      expect(updated.labels).toHaveLength(0);
    });
  });

  describe('addChecklistItem', () => {
    it('should add checklist item', async () => {
      const task = await taskService.create(
        { title: 'Checklist Task', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      const updated = await taskService.addChecklistItem(
        task._id.toString(),
        'Do something',
        user._id.toString()
      );

      expect(updated.checklist).toHaveLength(1);
      expect(updated.checklist[0].text).toBe('Do something');
      expect(updated.checklist[0].isCompleted).toBe(false);
    });
  });

  describe('updateChecklistItem', () => {
    it('should mark checklist item as completed', async () => {
      const task = await taskService.create(
        { title: 'Complete Item', boardId: board._id.toString(), columnId },
        user._id.toString()
      );

      await taskService.addChecklistItem(
        task._id.toString(),
        'Item 1',
        user._id.toString()
      );

      const withItem = await Task.findById(task._id);
      const itemId = withItem!.checklist[0]._id.toString();

      const updated = await taskService.updateChecklistItem(
        task._id.toString(),
        itemId,
        { isCompleted: true },
        user._id.toString()
      );

      expect(updated.checklist[0].isCompleted).toBe(true);
    });
  });
});
