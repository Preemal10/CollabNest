import { describe, it, expect, vi } from 'vitest';
import boardsReducer, {
  setCurrentBoard,
  openTaskModal,
  closeTaskModal,
  addTaskFromSocket,
  updateTaskFromSocket,
  removeTaskFromSocket,
  optimisticMoveTask,
  clearError,
} from '@/features/boards/boardsSlice';
import { mockBoard, mockTask } from '../utils/testUtils';

// Mock api
vi.mock('@/services/api', () => ({
  boardsApi: {
    get: vi.fn(),
    listByProject: vi.fn(),
    create: vi.fn(),
    addColumn: vi.fn(),
    updateColumn: vi.fn(),
    deleteColumn: vi.fn(),
    reorderColumns: vi.fn(),
  },
  tasksApi: {
    listByBoard: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    delete: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('boardsSlice', () => {
  const initialState = {
    currentBoard: null,
    boards: [],
    tasks: [],
    tasksByColumn: {},
    isLoading: false,
    isLoadingTasks: false,
    error: null,
    selectedTask: null,
    isTaskModalOpen: false,
  };

  describe('reducers', () => {
    it('should return initial state', () => {
      const result = boardsReducer(undefined, { type: 'unknown' });
      expect(result.currentBoard).toBeNull();
      expect(result.boards).toEqual([]);
      expect(result.tasks).toEqual([]);
      expect(result.tasksByColumn).toEqual({});
    });

    it('should handle setCurrentBoard', () => {
      const result = boardsReducer(initialState, setCurrentBoard(mockBoard as any));
      
      expect(result.currentBoard).toEqual(mockBoard);
    });

    it('should handle setCurrentBoard with null', () => {
      const stateWithBoard = { ...initialState, currentBoard: mockBoard as any };
      const result = boardsReducer(stateWithBoard, setCurrentBoard(null));
      
      expect(result.currentBoard).toBeNull();
    });

    it('should handle openTaskModal with task', () => {
      const result = boardsReducer(initialState, openTaskModal(mockTask as any));
      
      expect(result.isTaskModalOpen).toBe(true);
      expect(result.selectedTask).toEqual(mockTask);
    });

    it('should handle openTaskModal with null (for new task)', () => {
      const result = boardsReducer(initialState, openTaskModal(null));
      
      expect(result.isTaskModalOpen).toBe(true);
      expect(result.selectedTask).toBeNull();
    });

    it('should handle closeTaskModal', () => {
      const openState = {
        ...initialState,
        isTaskModalOpen: true,
        selectedTask: mockTask as any,
      };

      const result = boardsReducer(openState, closeTaskModal());
      
      expect(result.isTaskModalOpen).toBe(false);
      expect(result.selectedTask).toBeNull();
    });

    it('should handle addTaskFromSocket', () => {
      const result = boardsReducer(initialState, addTaskFromSocket(mockTask as any));
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual(mockTask);
      expect(result.tasksByColumn[mockTask.columnId]).toHaveLength(1);
    });

    it('should not duplicate task in addTaskFromSocket', () => {
      const stateWithTask = {
        ...initialState,
        tasks: [mockTask as any],
        tasksByColumn: { [mockTask.columnId]: [mockTask as any] },
      };

      const result = boardsReducer(stateWithTask, addTaskFromSocket(mockTask as any));
      
      // Should not add duplicate
      expect(result.tasks).toHaveLength(1);
    });

    it('should handle updateTaskFromSocket', () => {
      const stateWithTask = {
        ...initialState,
        tasks: [mockTask as any],
        tasksByColumn: { [mockTask.columnId]: [mockTask as any] },
      };

      const result = boardsReducer(
        stateWithTask,
        updateTaskFromSocket({ taskId: mockTask._id, updates: { title: 'Updated Title' } })
      );
      
      expect(result.tasks[0].title).toBe('Updated Title');
    });

    it('should handle removeTaskFromSocket', () => {
      const stateWithTask = {
        ...initialState,
        tasks: [mockTask as any],
        tasksByColumn: { [mockTask.columnId]: [mockTask as any] },
      };

      const result = boardsReducer(stateWithTask, removeTaskFromSocket(mockTask._id));
      
      expect(result.tasks).toHaveLength(0);
      expect(result.tasksByColumn[mockTask.columnId]).toBeUndefined();
    });

    it('should handle optimisticMoveTask', () => {
      const stateWithTask = {
        ...initialState,
        tasks: [mockTask as any],
        tasksByColumn: { [mockTask.columnId]: [mockTask as any] },
      };

      const result = boardsReducer(
        stateWithTask,
        optimisticMoveTask({ taskId: mockTask._id, toColumnId: 'col-2', newOrder: 0 })
      );
      
      expect(result.tasks[0].columnId).toBe('col-2');
      expect(result.tasks[0].order).toBe(0);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Something went wrong',
      };

      const result = boardsReducer(stateWithError, clearError());
      expect(result.error).toBeNull();
    });
  });

  describe('task ordering', () => {
    it('should group tasks by column', () => {
      const task1 = { ...mockTask, _id: 'task-1', columnId: 'col-1', order: 0 };
      const task2 = { ...mockTask, _id: 'task-2', columnId: 'col-2', order: 0 };
      const task3 = { ...mockTask, _id: 'task-3', columnId: 'col-1', order: 1 };

      let state = boardsReducer(initialState, addTaskFromSocket(task1 as any));
      state = boardsReducer(state, addTaskFromSocket(task2 as any));
      state = boardsReducer(state, addTaskFromSocket(task3 as any));

      expect(state.tasks).toHaveLength(3);
      expect(state.tasksByColumn['col-1']).toHaveLength(2);
      expect(state.tasksByColumn['col-2']).toHaveLength(1);
    });

    it('should sort tasks by order within column', () => {
      const task1 = { ...mockTask, _id: 'task-1', columnId: 'col-1', order: 2 };
      const task2 = { ...mockTask, _id: 'task-2', columnId: 'col-1', order: 0 };
      const task3 = { ...mockTask, _id: 'task-3', columnId: 'col-1', order: 1 };

      let state = boardsReducer(initialState, addTaskFromSocket(task1 as any));
      state = boardsReducer(state, addTaskFromSocket(task2 as any));
      state = boardsReducer(state, addTaskFromSocket(task3 as any));

      // Tasks in tasksByColumn should be sorted by order
      const col1Tasks = state.tasksByColumn['col-1'];
      expect(col1Tasks).toBeDefined();
      expect(col1Tasks![0]!.order).toBe(0);
      expect(col1Tasks![1]!.order).toBe(1);
      expect(col1Tasks![2]!.order).toBe(2);
    });
  });

  describe('column operations', () => {
    it('should have currentBoard with columns after setCurrentBoard', () => {
      const result = boardsReducer(initialState, setCurrentBoard(mockBoard as any));
      
      expect(result.currentBoard?.columns).toHaveLength(3);
      expect(result.currentBoard?.columns?.[0]?.name).toBe('To Do');
      expect(result.currentBoard?.columns?.[1]?.name).toBe('In Progress');
      expect(result.currentBoard?.columns?.[2]?.name).toBe('Done');
    });
  });

  describe('loading states', () => {
    it('should track loading state', () => {
      const loadingState = {
        ...initialState,
        isLoading: true,
      };

      expect(loadingState.isLoading).toBe(true);
    });

    it('should track isLoadingTasks separately', () => {
      const loadingState = {
        ...initialState,
        isLoadingTasks: true,
      };

      expect(loadingState.isLoadingTasks).toBe(true);
    });
  });
});
