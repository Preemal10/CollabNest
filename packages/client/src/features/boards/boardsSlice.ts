import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Board, Column, CreateTaskPayload, UpdateTaskPayload, MoveTaskPayload, CreateBoardPayload } from '@collabnest/shared';
import { boardsApi, tasksApi } from '@/services/api';

// Task type from API (with populated fields)
interface TaskWithAssignees {
  _id: string;
  title: string;
  description?: string;
  boardId: string;
  columnId: string;
  order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  labels: Array<{ _id: string; name: string; color: string }>;
  checklist: Array<{ _id: string; text: string; isCompleted: boolean }>;
  assignees: Array<{ _id: string; name: string; email: string; avatar?: string }>;
  createdBy?: { _id: string; name: string; email: string; avatar?: string };
  commentCount: number;
  attachmentCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Board state interface
interface BoardsState {
  currentBoard: Board | null;
  boards: Board[];
  tasks: TaskWithAssignees[];
  tasksByColumn: Record<string, TaskWithAssignees[]>;
  isLoading: boolean;
  isLoadingTasks: boolean;
  error: string | null;
  selectedTask: TaskWithAssignees | null;
  isTaskModalOpen: boolean;
}

// Initial state
const initialState: BoardsState = {
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

// Async thunks
export const fetchBoardsByProject = createAsyncThunk(
  'boards/fetchByProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await boardsApi.listByProject(projectId);
      return response.boards;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch boards');
    }
  }
);

export const fetchBoard = createAsyncThunk(
  'boards/fetchBoard',
  async (boardId: string, { rejectWithValue }) => {
    try {
      const response = await boardsApi.get(boardId);
      return response.board;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch board');
    }
  }
);

export const fetchBoardWithTasks = createAsyncThunk(
  'boards/fetchBoardWithTasks',
  async (boardId: string, { rejectWithValue }) => {
    try {
      const [boardResponse, tasksResponse] = await Promise.all([
        boardsApi.get(boardId),
        tasksApi.listByBoard(boardId),
      ]);
      return {
        board: boardResponse.board,
        tasks: tasksResponse.tasks as unknown as TaskWithAssignees[],
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch board');
    }
  }
);

export const createTask = createAsyncThunk(
  'boards/createTask',
  async (payload: CreateTaskPayload, { rejectWithValue }) => {
    try {
      const response = await tasksApi.create(payload);
      return response.task as unknown as TaskWithAssignees;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'boards/updateTask',
  async ({ id, payload }: { id: string; payload: UpdateTaskPayload }, { rejectWithValue }) => {
    try {
      const response = await tasksApi.update(id, payload);
      return response.task as unknown as TaskWithAssignees;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update task');
    }
  }
);

export const moveTask = createAsyncThunk(
  'boards/moveTask',
  async ({ id, payload }: { id: string; payload: MoveTaskPayload }, { rejectWithValue }) => {
    try {
      const response = await tasksApi.move(id, payload);
      return response.task as unknown as TaskWithAssignees;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to move task');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'boards/deleteTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      await tasksApi.delete(taskId);
      return taskId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete task');
    }
  }
);

export const addColumn = createAsyncThunk(
  'boards/addColumn',
  async ({ boardId, payload }: { boardId: string; payload: { name: string; color?: string } }, { rejectWithValue }) => {
    try {
      const response = await boardsApi.addColumn(boardId, payload);
      return response.board;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add column');
    }
  }
);

export const createBoard = createAsyncThunk(
  'boards/createBoard',
  async (payload: CreateBoardPayload, { rejectWithValue }) => {
    try {
      const response = await boardsApi.create(payload);
      return response.board;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create board');
    }
  }
);

// Helper to group tasks by column
function groupTasksByColumn(tasks: TaskWithAssignees[]): Record<string, TaskWithAssignees[]> {
  const grouped: Record<string, TaskWithAssignees[]> = {};
  for (const task of tasks) {
    const columnId = task.columnId;
    if (!grouped[columnId]) {
      grouped[columnId] = [];
    }
    grouped[columnId].push(task);
  }
  // Sort tasks by order within each column
  for (const columnId of Object.keys(grouped)) {
    grouped[columnId]!.sort((a, b) => a.order - b.order);
  }
  return grouped;
}

// Boards slice
const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setCurrentBoard(state, action: PayloadAction<Board | null>) {
      state.currentBoard = action.payload;
    },
    openTaskModal(state, action: PayloadAction<TaskWithAssignees | null>) {
      state.selectedTask = action.payload;
      state.isTaskModalOpen = true;
    },
    closeTaskModal(state) {
      state.selectedTask = null;
      state.isTaskModalOpen = false;
    },
    // Optimistic task movement
    optimisticMoveTask(
      state,
      action: PayloadAction<{ taskId: string; toColumnId: string; newOrder: number }>
    ) {
      const { taskId, toColumnId, newOrder } = action.payload;
      
      // Find the task
      const taskIndex = state.tasks.findIndex(t => t._id === taskId);
      if (taskIndex === -1) return;

      // Update task directly
      state.tasks[taskIndex]!.columnId = toColumnId;
      state.tasks[taskIndex]!.order = newOrder;

      // Regroup tasks
      state.tasksByColumn = groupTasksByColumn([...state.tasks]);
    },
    // Real-time task updates
    addTaskFromSocket(state, action: PayloadAction<TaskWithAssignees>) {
      const task = action.payload;
      // Check if task already exists
      if (!state.tasks.find(t => t._id === task._id)) {
        state.tasks.push(task);
        state.tasksByColumn = groupTasksByColumn(state.tasks);
      }
    },
    updateTaskFromSocket(state, action: PayloadAction<{ taskId: string; updates: Partial<TaskWithAssignees> }>) {
      const { taskId, updates } = action.payload;
      const taskIndex = state.tasks.findIndex(t => t._id === taskId);
      if (taskIndex !== -1) {
        Object.assign(state.tasks[taskIndex]!, updates);
        state.tasksByColumn = groupTasksByColumn([...state.tasks]);
      }
    },
    moveTaskFromSocket(
      state,
      action: PayloadAction<{ taskId: string; toColumnId: string; order: number }>
    ) {
      const { taskId, toColumnId, order } = action.payload;
      const taskIndex = state.tasks.findIndex(t => t._id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex]!.columnId = toColumnId;
        state.tasks[taskIndex]!.order = order;
        state.tasksByColumn = groupTasksByColumn([...state.tasks]);
      }
    },
    removeTaskFromSocket(state, action: PayloadAction<string>) {
      const taskId = action.payload;
      state.tasks = state.tasks.filter(t => t._id !== taskId);
      state.tasksByColumn = groupTasksByColumn(state.tasks);
    },
    // Column updates from socket
    updateColumnFromSocket(state, action: PayloadAction<{ columnId: string; updates: Partial<Column> }>) {
      if (state.currentBoard) {
        const colIndex = state.currentBoard.columns.findIndex(c => c._id === action.payload.columnId);
        if (colIndex !== -1) {
          Object.assign(state.currentBoard.columns[colIndex]!, action.payload.updates);
        }
      }
    },
    addColumnFromSocket(state, action: PayloadAction<Column>) {
      if (state.currentBoard) {
        state.currentBoard.columns.push(action.payload);
        state.currentBoard.columns.sort((a, b) => a.order - b.order);
      }
    },
    removeColumnFromSocket(state, action: PayloadAction<string>) {
      if (state.currentBoard) {
        state.currentBoard.columns = state.currentBoard.columns.filter(c => c._id !== action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch boards by project
    builder
      .addCase(fetchBoardsByProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBoardsByProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoardsByProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single board
    builder
      .addCase(fetchBoard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBoard = action.payload;
      })
      .addCase(fetchBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch board with tasks
    builder
      .addCase(fetchBoardWithTasks.pending, (state) => {
        state.isLoading = true;
        state.isLoadingTasks = true;
        state.error = null;
      })
      .addCase(fetchBoardWithTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoadingTasks = false;
        state.currentBoard = action.payload.board;
        state.tasks = action.payload.tasks;
        state.tasksByColumn = groupTasksByColumn(action.payload.tasks);
      })
      .addCase(fetchBoardWithTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingTasks = false;
        state.error = action.payload as string;
      });

    // Create task
    builder
      .addCase(createTask.pending, (state) => {
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
        state.tasksByColumn = groupTasksByColumn(state.tasks);
        state.isTaskModalOpen = false;
        state.selectedTask = null;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update task
    builder
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
          state.tasksByColumn = groupTasksByColumn(state.tasks);
        }
        if (state.selectedTask?._id === action.payload._id) {
          state.selectedTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Move task
    builder
      .addCase(moveTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
          state.tasksByColumn = groupTasksByColumn(state.tasks);
        }
      })
      .addCase(moveTask.rejected, (state, action) => {
        state.error = action.payload as string;
        // Regroup to revert optimistic update
        state.tasksByColumn = groupTasksByColumn(state.tasks);
      });

    // Delete task
    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t._id !== action.payload);
        state.tasksByColumn = groupTasksByColumn(state.tasks);
        if (state.selectedTask?._id === action.payload) {
          state.selectedTask = null;
          state.isTaskModalOpen = false;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Add column
    builder
      .addCase(addColumn.fulfilled, (state, action) => {
        state.currentBoard = action.payload;
      })
      .addCase(addColumn.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Create board
    builder
      .addCase(createBoard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.boards.push(action.payload);
      })
      .addCase(createBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentBoard,
  openTaskModal,
  closeTaskModal,
  optimisticMoveTask,
  addTaskFromSocket,
  updateTaskFromSocket,
  moveTaskFromSocket,
  removeTaskFromSocket,
  updateColumnFromSocket,
  addColumnFromSocket,
  removeColumnFromSocket,
} = boardsSlice.actions;

export default boardsSlice.reducer;
