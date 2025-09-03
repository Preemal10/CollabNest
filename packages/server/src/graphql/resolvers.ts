import { GraphQLScalarType, Kind } from 'graphql';
import { Types } from 'mongoose';
import {
  User,
  Organization,
  Project,
  Board,
  Task,
  Activity,
  Notification,
} from '../models/index.js';
import { ApiError } from '../utils/errors.js';

// Helper to convert string to ObjectId for MongoDB queries
function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

// DateTime scalar
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime scalar type',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  },
  parseValue(value: unknown): Date {
    return new Date(String(value));
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Context type
interface Context {
  userId: string;
}

export const resolvers = {
  DateTime: DateTimeScalar,

  Query: {
    // Dashboard summary
    dashboardSummary: async (_: unknown, __: unknown, { userId }: Context) => {
      // Get user's projects
      const userObjectId = toObjectId(userId);
      const projects = await Project.find({
        'members.userId': userObjectId,
        isArchived: { $ne: true },
      });

      const projectIds = projects.map(p => p._id);

      // Get boards for these projects
      const boards = await Board.find({ projectId: { $in: projectIds } });
      const boardIds = boards.map(b => b._id);

      // Get task counts
      const [totalTasks, completedTasks, assignedTasks, overdueTasks, upcomingDeadlines, recentActivity] = 
        await Promise.all([
          Task.countDocuments({ boardId: { $in: boardIds }, isArchived: false }),
          Task.countDocuments({
            boardId: { $in: boardIds },
            isArchived: false,
            // Tasks in "Done" columns - simplified check
          }),
          Task.find({
            assignees: userId,
            isArchived: false,
          })
            .populate('assignees', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .sort({ updatedAt: -1 })
            .limit(10),
          Task.countDocuments({
            boardId: { $in: boardIds },
            isArchived: false,
            dueDate: { $lt: new Date() },
          }),
          Task.find({
            boardId: { $in: boardIds },
            isArchived: false,
            dueDate: {
              $gte: new Date(),
              $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            },
          })
            .populate('assignees', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .sort({ dueDate: 1 })
            .limit(10),
          Activity.find({ projectId: { $in: projectIds } })
            .populate('userId', 'name email avatar')
            .sort({ createdAt: -1 })
            .limit(20),
        ]);

      // Calculate completed tasks (tasks in columns containing "done")
      const doneColumnIds: string[] = [];
      for (const board of boards) {
        for (const col of board.columns) {
          if (col.name.toLowerCase().includes('done')) {
            doneColumnIds.push(col._id.toString());
          }
        }
      }

      const completedCount = await Task.countDocuments({
        boardId: { $in: boardIds },
        columnId: { $in: doneColumnIds },
        isArchived: false,
      });

      return {
        totalProjects: projects.length,
        totalTasks,
        completedTasks: completedCount,
        pendingTasks: totalTasks - completedCount,
        overdueTasks,
        recentActivity,
        assignedTasks,
        upcomingDeadlines,
      };
    },

    // Organizations
    organizations: async (_: unknown, __: unknown, { userId }: Context) => {
      return Organization.find({ 'members.userId': toObjectId(userId) });
    },

    organization: async (_: unknown, { id }: { id: string }, { userId }: Context) => {
      const org = await Organization.findById(id);
      if (!org) {
        throw ApiError.notFound('Organization');
      }
      if (!org.isMember(userId)) {
        throw ApiError.forbidden('You do not have access to this organization');
      }
      return org;
    },

    // Projects
    projects: async (
      _: unknown,
      { organizationId }: { organizationId?: string },
      { userId }: Context
    ) => {
      const query: Record<string, unknown> = { 'members.userId': toObjectId(userId) };
      if (organizationId) {
        query.organizationId = organizationId;
      }
      return Project.find(query)
        .populate('members.userId', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .sort({ updatedAt: -1 });
    },

    project: async (_: unknown, { id }: { id: string }, { userId }: Context) => {
      const project = await Project.findById(id)
        .populate('members.userId', 'name email avatar')
        .populate('createdBy', 'name email avatar');

      if (!project) {
        throw ApiError.notFound('Project');
      }
      if (!project.canView(userId)) {
        throw ApiError.forbidden('You do not have access to this project');
      }
      return project;
    },

    // Boards
    boards: async (
      _: unknown,
      { projectId }: { projectId: string },
      { userId }: Context
    ) => {
      const project = await Project.findById(projectId);
      if (!project || !project.canView(userId)) {
        throw ApiError.forbidden('You do not have access to this project');
      }
      return Board.find({ projectId }).sort({ isDefault: -1, name: 1 });
    },

    board: async (_: unknown, { id }: { id: string }, { userId }: Context) => {
      const board = await Board.findById(id).populate('createdBy', 'name email avatar');
      if (!board) {
        throw ApiError.notFound('Board');
      }
      const project = await Project.findById(board.projectId);
      if (!project || !project.canView(userId)) {
        throw ApiError.forbidden('You do not have access to this board');
      }
      return board;
    },

    boardWithTasks: async (_: unknown, { id }: { id: string }, { userId }: Context) => {
      const board = await Board.findById(id).populate('createdBy', 'name email avatar');
      if (!board) {
        throw ApiError.notFound('Board');
      }

      const project = await Project.findById(board.projectId);
      if (!project || !project.canView(userId)) {
        throw ApiError.forbidden('You do not have access to this board');
      }

      const tasks = await Task.find({ boardId: id, isArchived: false })
        .populate('assignees', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .sort({ order: 1 });

      // Group tasks by column
      const tasksByColumn = new Map<string, typeof tasks>();
      for (const task of tasks) {
        const columnId = task.columnId.toString();
        if (!tasksByColumn.has(columnId)) {
          tasksByColumn.set(columnId, []);
        }
        tasksByColumn.get(columnId)!.push(task);
      }

      const columns = board.columns
        .sort((a, b) => a.order - b.order)
        .map(col => ({
          column: {
            _id: col._id.toString(),
            name: col.name,
            color: col.color,
            order: col.order,
            taskLimit: col.taskLimit,
            taskCount: tasksByColumn.get(col._id.toString())?.length || 0,
          },
          tasks: tasksByColumn.get(col._id.toString()) || [],
        }));

      return {
        board,
        columns,
      };
    },

    // Tasks
    task: async (_: unknown, { id }: { id: string }, { userId }: Context) => {
      const task = await Task.findById(id)
        .populate('assignees', 'name email avatar')
        .populate('createdBy', 'name email avatar');

      if (!task) {
        throw ApiError.notFound('Task');
      }

      const board = await Board.findById(task.boardId);
      const project = await Project.findById(board?.projectId);
      if (!project || !project.canView(userId)) {
        throw ApiError.forbidden('You do not have access to this task');
      }

      return task;
    },

    myTasks: async (
      _: unknown,
      { status, priority }: { status?: string; priority?: string },
      { userId }: Context
    ) => {
      const query: Record<string, unknown> = {
        assignees: userId,
        isArchived: false,
      };

      if (priority) {
        query.priority = priority;
      }

      return Task.find(query)
        .populate('assignees', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .sort({ updatedAt: -1 });
    },

    searchTasks: async (
      _: unknown,
      { query, projectId }: { query: string; projectId?: string },
      { userId }: Context
    ) => {
      // Get accessible board IDs
      const projectQuery: Record<string, unknown> = { 'members.userId': toObjectId(userId) };
      if (projectId) {
        projectQuery._id = projectId;
      }
      const projects = await Project.find(projectQuery);
      const boards = await Board.find({ projectId: { $in: projects.map(p => p._id) } });
      const boardIds = boards.map(b => b._id);

      return Task.find({
        boardId: { $in: boardIds },
        isArchived: false,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      })
        .populate('assignees', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .limit(20);
    },

    // Activity
    projectActivity: async (
      _: unknown,
      { projectId, limit = 50 }: { projectId: string; limit?: number },
      { userId }: Context
    ) => {
      const project = await Project.findById(projectId);
      if (!project || !project.canView(userId)) {
        throw ApiError.forbidden('You do not have access to this project');
      }

      return Activity.find({ projectId })
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(limit);
    },

    // Notifications
    notifications: async (
      _: unknown,
      { limit = 50 }: { limit?: number },
      { userId }: Context
    ) => {
      return Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
    },

    unreadNotificationCount: async (_: unknown, __: unknown, { userId }: Context) => {
      return Notification.countDocuments({ userId, isRead: false });
    },
  },

  // Field resolvers
  Project: {
    boards: async (project: { _id: string }) => {
      return Board.find({ projectId: project._id }).sort({ isDefault: -1, name: 1 });
    },

    taskStats: async (project: { _id: string }) => {
      const boards = await Board.find({ projectId: project._id });
      const boardIds = boards.map(b => b._id);

      const [total, byPriority, overdue, dueSoon] = await Promise.all([
        Task.countDocuments({ boardId: { $in: boardIds }, isArchived: false }),
        Task.aggregate([
          { $match: { boardId: { $in: boardIds }, isArchived: false } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        Task.countDocuments({
          boardId: { $in: boardIds },
          isArchived: false,
          dueDate: { $lt: new Date() },
        }),
        Task.countDocuments({
          boardId: { $in: boardIds },
          isArchived: false,
          dueDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      // Count by status (based on column names)
      const statusCounts = { todo: 0, inProgress: 0, review: 0, done: 0 };
      for (const board of boards) {
        for (const col of board.columns) {
          const colName = col.name.toLowerCase();
          const count = await Task.countDocuments({
            boardId: board._id,
            columnId: col._id,
            isArchived: false,
          });

          if (colName.includes('done') || colName.includes('complete')) {
            statusCounts.done += count;
          } else if (colName.includes('review') || colName.includes('testing')) {
            statusCounts.review += count;
          } else if (colName.includes('progress') || colName.includes('doing')) {
            statusCounts.inProgress += count;
          } else {
            statusCounts.todo += count;
          }
        }
      }

      // Convert priority counts to object
      const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
      for (const p of byPriority) {
        if (p._id in priorityCounts) {
          priorityCounts[p._id as keyof typeof priorityCounts] = p.count;
        }
      }

      return {
        total,
        byStatus: statusCounts,
        byPriority: priorityCounts,
        overdue,
        dueSoon,
      };
    },

    members: async (project: { members: Array<{ userId: string; role: string; joinedAt: Date }> }) => {
      const memberIds = project.members.map(m => m.userId);
      const users = await User.find({ _id: { $in: memberIds } }).select('name email avatar');
      const userMap = new Map(users.map(u => [u._id.toString(), u]));

      return project.members.map(m => ({
        user: userMap.get(m.userId.toString()),
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    },
  },

  Board: {
    tasks: async (board: { _id: string }) => {
      return Task.find({ boardId: board._id, isArchived: false })
        .populate('assignees', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .sort({ order: 1 });
    },

    taskCount: async (board: { _id: string }) => {
      return Task.countDocuments({ boardId: board._id, isArchived: false });
    },

    columns: async (board: { columns: Array<{ _id: { toString(): string }; name: string; color?: string; order: number; taskLimit?: number }> }) => {
      // Add task count to each column
      const columnsWithCount = await Promise.all(
        board.columns.map(async col => ({
          _id: col._id.toString(),
          name: col.name,
          color: col.color,
          order: col.order,
          taskLimit: col.taskLimit,
          taskCount: await Task.countDocuments({ columnId: col._id, isArchived: false }),
        }))
      );
      return columnsWithCount.sort((a, b) => a.order - b.order);
    },
  },

  Organization: {
    memberCount: async (org: { members: unknown[] }) => {
      return org.members?.length || 0;
    },

    projectCount: async (org: { _id: string }) => {
      return Project.countDocuments({ organizationId: org._id });
    },
  },

  Activity: {
    userId: async (activity: { userId: string | { _id: string } }) => {
      if (typeof activity.userId === 'object') {
        return activity.userId;
      }
      return User.findById(activity.userId).select('name email avatar');
    },

    metadata: (activity: { metadata?: Record<string, unknown> }) => {
      return activity.metadata || null;
    },
  },
};

export default resolvers;
