import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boardService } from '../../services/board.service.js';
import { Board, Project } from '../../models/index.js';
import {
  createTestUser,
  createTestProject,
  createTestBoard,
} from '../utils/testHelpers.js';

// Mock the websocket emitters
vi.mock('../../websocket/emitters.js', () => ({
  emitColumnCreated: vi.fn(),
  emitColumnUpdated: vi.fn(),
  emitColumnDeleted: vi.fn(),
  emitColumnsReordered: vi.fn(),
}));

describe('BoardService', () => {
  let user: any;
  let project: any;

  beforeEach(async () => {
    // Create test data
    user = await createTestUser({ email: 'boardtest@example.com' });
    project = await createTestProject(user._id.toString());
  });

  describe('create', () => {
    it('should create a board successfully', async () => {
      const board = await boardService.create(
        {
          name: 'Test Board',
          description: 'Test description',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      expect(board).toBeDefined();
      expect(board.name).toBe('Test Board');
      expect(board.description).toBe('Test description');
      expect(board.projectId.toString()).toBe(project._id.toString());
      expect(board.createdBy.toString()).toBe(user._id.toString());
    });

    it('should create board with default columns when none provided', async () => {
      const board = await boardService.create(
        {
          name: 'Default Columns Board',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      expect(board.columns).toHaveLength(4);
      expect(board.columns[0].name).toBe('To Do');
      expect(board.columns[1].name).toBe('In Progress');
      expect(board.columns[2].name).toBe('Review');
      expect(board.columns[3].name).toBe('Done');
    });

    it('should create board with custom columns', async () => {
      const board = await boardService.create(
        {
          name: 'Custom Columns Board',
          projectId: project._id.toString(),
          columns: [
            { name: 'Backlog', color: '#6B7280' },
            { name: 'Active', color: '#3B82F6' },
            { name: 'Complete', color: '#10B981' },
          ],
        },
        user._id.toString()
      );

      expect(board.columns).toHaveLength(3);
      expect(board.columns[0].name).toBe('Backlog');
      expect(board.columns[0].color).toBe('#6B7280');
      expect(board.columns[1].name).toBe('Active');
      expect(board.columns[2].name).toBe('Complete');
    });

    it('should assign correct order to custom columns', async () => {
      const board = await boardService.create(
        {
          name: 'Ordered Columns Board',
          projectId: project._id.toString(),
          columns: [
            { name: 'First' },
            { name: 'Second' },
            { name: 'Third' },
          ],
        },
        user._id.toString()
      );

      expect(board.columns[0].order).toBe(0);
      expect(board.columns[1].order).toBe(1);
      expect(board.columns[2].order).toBe(2);
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        boardService.create(
          {
            name: 'Test Board',
            projectId: '507f1f77bcf86cd799439011',
          },
          user._id.toString()
        )
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for user without project edit permission', async () => {
      const viewerUser = await createTestUser({ email: 'viewer@example.com' });
      
      // Add user as viewer (cannot edit)
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      await expect(
        boardService.create(
          {
            name: 'Unauthorized Board',
            projectId: project._id.toString(),
          },
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });

    it('should throw error for user not in project', async () => {
      const outsideUser = await createTestUser({ email: 'outside@example.com' });

      await expect(
        boardService.create(
          {
            name: 'Unauthorized Board',
            projectId: project._id.toString(),
          },
          outsideUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('getById', () => {
    it('should return board by ID', async () => {
      const created = await boardService.create(
        {
          name: 'Get By ID Board',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      const board = await boardService.getById(
        created._id.toString(),
        user._id.toString()
      );

      expect(board).toBeDefined();
      expect(board.name).toBe('Get By ID Board');
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.getById('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for user without project access', async () => {
      const board = await boardService.create(
        {
          name: 'Private Board',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      const outsideUser = await createTestUser({ email: 'noaccess@example.com' });

      await expect(
        boardService.getById(board._id.toString(), outsideUser._id.toString())
      ).rejects.toThrow('You do not have access to this board');
    });

    it('should allow project viewer to read board', async () => {
      const board = await boardService.create(
        {
          name: 'Viewable Board',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      const viewerUser = await createTestUser({ email: 'viewer2@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      const result = await boardService.getById(
        board._id.toString(),
        viewerUser._id.toString()
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Viewable Board');
    });
  });

  describe('getByProject', () => {
    it('should return all boards for a project', async () => {
      await boardService.create(
        { name: 'Board 1', projectId: project._id.toString() },
        user._id.toString()
      );
      await boardService.create(
        { name: 'Board 2', projectId: project._id.toString() },
        user._id.toString()
      );
      await boardService.create(
        { name: 'Board 3', projectId: project._id.toString() },
        user._id.toString()
      );

      const boards = await boardService.getByProject(
        project._id.toString(),
        user._id.toString()
      );

      expect(boards).toHaveLength(3);
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        boardService.getByProject('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for user without project access', async () => {
      const outsideUser = await createTestUser({ email: 'noaccess2@example.com' });

      await expect(
        boardService.getByProject(project._id.toString(), outsideUser._id.toString())
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should return empty array when project has no boards', async () => {
      const boards = await boardService.getByProject(
        project._id.toString(),
        user._id.toString()
      );

      expect(boards).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update board name', async () => {
      const board = await boardService.create(
        { name: 'Original Name', projectId: project._id.toString() },
        user._id.toString()
      );

      const updated = await boardService.update(
        board._id.toString(),
        { name: 'Updated Name' },
        user._id.toString()
      );

      expect(updated.name).toBe('Updated Name');
    });

    it('should update board description', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const updated = await boardService.update(
        board._id.toString(),
        { description: 'New description' },
        user._id.toString()
      );

      expect(updated.description).toBe('New description');
    });

    it('should update multiple fields at once', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const updated = await boardService.update(
        board._id.toString(),
        { name: 'New Name', description: 'New Description' },
        user._id.toString()
      );

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('New Description');
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.update(
          '507f1f77bcf86cd799439011',
          { name: 'Updated' },
          user._id.toString()
        )
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for user without edit permission', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const viewerUser = await createTestUser({ email: 'viewer3@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      await expect(
        boardService.update(
          board._id.toString(),
          { name: 'Hacked Name' },
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });

    it('should throw error for user not in project', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const outsideUser = await createTestUser({ email: 'outside2@example.com' });

      await expect(
        boardService.update(
          board._id.toString(),
          { name: 'Hacked Name' },
          outsideUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('delete', () => {
    it('should delete board successfully', async () => {
      const board = await boardService.create(
        { name: 'Delete Me', projectId: project._id.toString() },
        user._id.toString()
      );

      await boardService.delete(board._id.toString(), user._id.toString());

      const deleted = await Board.findById(board._id);
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.delete('507f1f77bcf86cd799439011', user._id.toString())
      ).rejects.toThrow('Board not found');
    });

    it('should throw error when deleting default board', async () => {
      const board = await boardService.create(
        { name: 'Default Board', projectId: project._id.toString() },
        user._id.toString()
      );

      // Mark as default
      await Board.findByIdAndUpdate(board._id, { isDefault: true });

      await expect(
        boardService.delete(board._id.toString(), user._id.toString())
      ).rejects.toThrow('Cannot delete the default board');
    });

    it('should throw error for non-manager user', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const memberUser = await createTestUser({ email: 'member@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: memberUser._id, role: 'editor' } },
      });

      await expect(
        boardService.delete(board._id.toString(), memberUser._id.toString())
      ).rejects.toThrow('Only project managers can delete boards');
    });

    it('should throw error for user not in project', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const outsideUser = await createTestUser({ email: 'outside3@example.com' });

      await expect(
        boardService.delete(board._id.toString(), outsideUser._id.toString())
      ).rejects.toThrow('Only project managers can delete boards');
    });
  });

  describe('addColumn', () => {
    let board: any;

    beforeEach(async () => {
      board = await boardService.create(
        { name: 'Column Board', projectId: project._id.toString() },
        user._id.toString()
      );
    });

    it('should add column to board', async () => {
      const initialColumnCount = board.columns.length;

      const updated = await boardService.addColumn(
        board._id.toString(),
        { name: 'New Column', color: '#FF0000' },
        user._id.toString()
      );

      expect(updated.columns).toHaveLength(initialColumnCount + 1);
      const newColumn = updated.columns[updated.columns.length - 1];
      expect(newColumn.name).toBe('New Column');
      expect(newColumn.color).toBe('#FF0000');
    });

    it('should add column with task limit', async () => {
      const updated = await boardService.addColumn(
        board._id.toString(),
        { name: 'Limited Column', taskLimit: 5 },
        user._id.toString()
      );

      const newColumn = updated.columns[updated.columns.length - 1];
      expect(newColumn.taskLimit).toBe(5);
    });

    it('should assign correct order to new column', async () => {
      const updated = await boardService.addColumn(
        board._id.toString(),
        { name: 'Ordered Column' },
        user._id.toString()
      );

      const newColumn = updated.columns[updated.columns.length - 1];
      expect(newColumn.order).toBe(board.columns.length);
    });

    it('should throw error when column limit reached', async () => {
      // Add columns to reach limit (20 max, already have 4 default)
      for (let i = 0; i < 16; i++) {
        await boardService.addColumn(
          board._id.toString(),
          { name: `Column ${i}` },
          user._id.toString()
        );
      }

      // 21st column should fail
      await expect(
        boardService.addColumn(
          board._id.toString(),
          { name: 'Too Many' },
          user._id.toString()
        )
      ).rejects.toThrow('Maximum of 20 columns per board');
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.addColumn(
          '507f1f77bcf86cd799439011',
          { name: 'Column' },
          user._id.toString()
        )
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for user without edit permission', async () => {
      const viewerUser = await createTestUser({ email: 'viewer4@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      await expect(
        boardService.addColumn(
          board._id.toString(),
          { name: 'Unauthorized Column' },
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('updateColumn', () => {
    let board: any;
    let columnId: string;

    beforeEach(async () => {
      board = await boardService.create(
        { name: 'Column Update Board', projectId: project._id.toString() },
        user._id.toString()
      );
      columnId = board.columns[0]._id.toString();
    });

    it('should update column name', async () => {
      const updated = await boardService.updateColumn(
        board._id.toString(),
        columnId,
        { name: 'Updated Column Name' },
        user._id.toString()
      );

      const column = updated.columns.find(
        (c: any) => c._id.toString() === columnId
      );
      expect(column.name).toBe('Updated Column Name');
    });

    it('should update column color', async () => {
      const updated = await boardService.updateColumn(
        board._id.toString(),
        columnId,
        { color: '#FF00FF' },
        user._id.toString()
      );

      const column = updated.columns.find(
        (c: any) => c._id.toString() === columnId
      );
      expect(column.color).toBe('#FF00FF');
    });

    it('should update column task limit', async () => {
      const updated = await boardService.updateColumn(
        board._id.toString(),
        columnId,
        { taskLimit: 10 },
        user._id.toString()
      );

      const column = updated.columns.find(
        (c: any) => c._id.toString() === columnId
      );
      expect(column.taskLimit).toBe(10);
    });

    it('should update multiple column properties', async () => {
      const updated = await boardService.updateColumn(
        board._id.toString(),
        columnId,
        { name: 'Multi Update', color: '#123456', taskLimit: 15 },
        user._id.toString()
      );

      const column = updated.columns.find(
        (c: any) => c._id.toString() === columnId
      );
      expect(column.name).toBe('Multi Update');
      expect(column.color).toBe('#123456');
      expect(column.taskLimit).toBe(15);
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.updateColumn(
          '507f1f77bcf86cd799439011',
          columnId,
          { name: 'Updated' },
          user._id.toString()
        )
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for non-existent column', async () => {
      await expect(
        boardService.updateColumn(
          board._id.toString(),
          '507f1f77bcf86cd799439011',
          { name: 'Updated' },
          user._id.toString()
        )
      ).rejects.toThrow('Column not found');
    });

    it('should throw error for user without edit permission', async () => {
      const viewerUser = await createTestUser({ email: 'viewer5@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      await expect(
        boardService.updateColumn(
          board._id.toString(),
          columnId,
          { name: 'Unauthorized Update' },
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('deleteColumn', () => {
    let board: any;
    let columnId: string;

    beforeEach(async () => {
      board = await boardService.create(
        { name: 'Column Delete Board', projectId: project._id.toString() },
        user._id.toString()
      );
      columnId = board.columns[0]._id.toString();
    });

    it('should delete column from board', async () => {
      const initialColumnCount = board.columns.length;

      const updated = await boardService.deleteColumn(
        board._id.toString(),
        columnId,
        user._id.toString()
      );

      expect(updated.columns).toHaveLength(initialColumnCount - 1);
      const deletedColumn = updated.columns.find(
        (c: any) => c._id.toString() === columnId
      );
      expect(deletedColumn).toBeUndefined();
    });

    it('should reorder remaining columns after deletion', async () => {
      // Delete middle column (index 1)
      const middleColumnId = board.columns[1]._id.toString();

      const updated = await boardService.deleteColumn(
        board._id.toString(),
        middleColumnId,
        user._id.toString()
      );

      // Check that orders are sequential
      updated.columns.forEach((col: any, index: number) => {
        expect(col.order).toBe(index);
      });
    });

    it('should throw error when trying to delete last column', async () => {
      // Create board with single column
      const singleColumnBoard = await createTestBoard(
        project._id.toString(),
        user._id.toString(),
        {
          columns: [
            { _id: new (await import('mongoose')).Types.ObjectId(), name: 'Only Column', order: 0 },
          ],
        }
      );

      const onlyColumnId = singleColumnBoard.columns[0]._id.toString();

      await expect(
        boardService.deleteColumn(
          singleColumnBoard._id.toString(),
          onlyColumnId,
          user._id.toString()
        )
      ).rejects.toThrow('Board must have at least one column');
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.deleteColumn(
          '507f1f77bcf86cd799439011',
          columnId,
          user._id.toString()
        )
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for non-existent column', async () => {
      await expect(
        boardService.deleteColumn(
          board._id.toString(),
          '507f1f77bcf86cd799439011',
          user._id.toString()
        )
      ).rejects.toThrow('Column not found');
    });

    it('should throw error for user without edit permission', async () => {
      const viewerUser = await createTestUser({ email: 'viewer6@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      await expect(
        boardService.deleteColumn(
          board._id.toString(),
          columnId,
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('reorderColumns', () => {
    let board: any;
    let columnIds: string[];

    beforeEach(async () => {
      board = await boardService.create(
        { name: 'Reorder Board', projectId: project._id.toString() },
        user._id.toString()
      );
      columnIds = board.columns.map((c: any) => c._id.toString());
    });

    it('should reorder columns successfully', async () => {
      // Reverse the order
      const reversedIds = [...columnIds].reverse();

      const updated = await boardService.reorderColumns(
        board._id.toString(),
        reversedIds,
        user._id.toString()
      );

      // Verify new order
      reversedIds.forEach((id, index) => {
        const column = updated.columns.find((c: any) => c._id.toString() === id);
        expect(column.order).toBe(index);
      });
    });

    it('should maintain column data after reorder', async () => {
      const firstColumnName = board.columns[0].name;
      const lastColumnName = board.columns[board.columns.length - 1].name;

      // Reverse the order
      const reversedIds = [...columnIds].reverse();

      const updated = await boardService.reorderColumns(
        board._id.toString(),
        reversedIds,
        user._id.toString()
      );

      // First column should now be last
      expect(updated.columns[updated.columns.length - 1].name).toBe(firstColumnName);
      expect(updated.columns[0].name).toBe(lastColumnName);
    });

    it('should throw error with invalid column IDs', async () => {
      const invalidIds = ['507f1f77bcf86cd799439011', ...columnIds.slice(1)];

      await expect(
        boardService.reorderColumns(
          board._id.toString(),
          invalidIds,
          user._id.toString()
        )
      ).rejects.toThrow('Invalid column IDs provided');
    });

    it('should throw error with missing column IDs', async () => {
      // Only provide partial column IDs
      const partialIds = columnIds.slice(0, 2);

      await expect(
        boardService.reorderColumns(
          board._id.toString(),
          partialIds,
          user._id.toString()
        )
      ).rejects.toThrow('Invalid column IDs provided');
    });

    it('should throw error with extra column IDs', async () => {
      const extraIds = [...columnIds, '507f1f77bcf86cd799439011'];

      await expect(
        boardService.reorderColumns(
          board._id.toString(),
          extraIds,
          user._id.toString()
        )
      ).rejects.toThrow('Invalid column IDs provided');
    });

    it('should throw error for non-existent board', async () => {
      await expect(
        boardService.reorderColumns(
          '507f1f77bcf86cd799439011',
          columnIds,
          user._id.toString()
        )
      ).rejects.toThrow('Board not found');
    });

    it('should throw error for user without edit permission', async () => {
      const viewerUser = await createTestUser({ email: 'viewer7@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      await expect(
        boardService.reorderColumns(
          board._id.toString(),
          columnIds,
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('access control', () => {
    let board: any;

    beforeEach(async () => {
      board = await boardService.create(
        { name: 'Access Control Board', projectId: project._id.toString() },
        user._id.toString()
      );
    });

    it('should allow project owner full access', async () => {
      // Owner should be able to do everything
      const updated = await boardService.update(
        board._id.toString(),
        { name: 'Owner Updated' },
        user._id.toString()
      );
      expect(updated.name).toBe('Owner Updated');

      await boardService.addColumn(
        board._id.toString(),
        { name: 'Owner Column' },
        user._id.toString()
      );

      const finalBoard = await boardService.getById(
        board._id.toString(),
        user._id.toString()
      );
      expect(finalBoard.columns).toHaveLength(5);
    });

    it('should allow project editor full access', async () => {
      const editorUser = await createTestUser({ email: 'editor@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: editorUser._id, role: 'editor' } },
      });

      // Editor should be able to edit
      const updated = await boardService.update(
        board._id.toString(),
        { name: 'Editor Updated' },
        editorUser._id.toString()
      );
      expect(updated.name).toBe('Editor Updated');
    });

    it('should allow project editor to edit', async () => {
      const editorUser = await createTestUser({ email: 'editor2@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: editorUser._id, role: 'editor' } },
      });

      // Editor should be able to edit board
      const updated = await boardService.update(
        board._id.toString(),
        { name: 'Editor Updated 2' },
        editorUser._id.toString()
      );
      expect(updated.name).toBe('Editor Updated 2');
    });

    it('should allow viewer to only read', async () => {
      const viewerUser = await createTestUser({ email: 'viewer8@example.com' });
      await Project.findByIdAndUpdate(project._id, {
        $push: { members: { userId: viewerUser._id, role: 'viewer' } },
      });

      // Viewer should be able to read
      const readBoard = await boardService.getById(
        board._id.toString(),
        viewerUser._id.toString()
      );
      expect(readBoard).toBeDefined();

      // Viewer should NOT be able to edit
      await expect(
        boardService.update(
          board._id.toString(),
          { name: 'Viewer Hack' },
          viewerUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });

    it('should deny access to users not in project', async () => {
      const outsideUser = await createTestUser({ email: 'outsider@example.com' });

      // Cannot read
      await expect(
        boardService.getById(board._id.toString(), outsideUser._id.toString())
      ).rejects.toThrow('You do not have access');

      // Cannot update
      await expect(
        boardService.update(
          board._id.toString(),
          { name: 'Hacked' },
          outsideUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');

      // Cannot add columns
      await expect(
        boardService.addColumn(
          board._id.toString(),
          { name: 'Hacked Column' },
          outsideUser._id.toString()
        )
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('edge cases', () => {
    it('should handle board with empty description', async () => {
      const board = await boardService.create(
        {
          name: 'No Description Board',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      expect(board.description).toBeUndefined();
    });

    it('should handle updating description to empty string', async () => {
      const board = await boardService.create(
        {
          name: 'Board',
          description: 'Initial description',
          projectId: project._id.toString(),
        },
        user._id.toString()
      );

      const updated = await boardService.update(
        board._id.toString(),
        { description: '' },
        user._id.toString()
      );

      expect(updated.description).toBe('');
    });

    it('should handle column with no color', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const updated = await boardService.addColumn(
        board._id.toString(),
        { name: 'No Color Column' },
        user._id.toString()
      );

      const newColumn = updated.columns[updated.columns.length - 1];
      expect(newColumn.color).toBeUndefined();
    });

    it('should handle column with no task limit', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const updated = await boardService.addColumn(
        board._id.toString(),
        { name: 'No Limit Column' },
        user._id.toString()
      );

      const newColumn = updated.columns[updated.columns.length - 1];
      expect(newColumn.taskLimit).toBeUndefined();
    });

    it('should update column task limit to 0', async () => {
      const board = await boardService.create(
        { name: 'Board', projectId: project._id.toString() },
        user._id.toString()
      );

      const columnId = board.columns[0]._id.toString();

      const updated = await boardService.updateColumn(
        board._id.toString(),
        columnId,
        { taskLimit: 0 },
        user._id.toString()
      );

      const column = updated.columns.find(
        (c: any) => c._id.toString() === columnId
      );
      expect(column.taskLimit).toBe(0);
    });
  });
});
