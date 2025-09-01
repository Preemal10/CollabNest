import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  # User types
  type User {
    _id: ID!
    name: String!
    email: String!
    avatar: String
  }

  # Label type
  type Label {
    _id: ID!
    name: String!
    color: String!
  }

  # Checklist item type
  type ChecklistItem {
    _id: ID!
    text: String!
    isCompleted: Boolean!
    completedAt: DateTime
    completedBy: ID
  }

  # Column type
  type Column {
    _id: ID!
    name: String!
    color: String
    order: Int!
    taskLimit: Int
    taskCount: Int
  }

  # Task type
  type Task {
    _id: ID!
    title: String!
    description: String
    boardId: ID!
    columnId: ID!
    order: Int!
    assignees: [User!]!
    labels: [Label!]!
    priority: TaskPriority!
    dueDate: DateTime
    startDate: DateTime
    estimatedHours: Float
    checklist: [ChecklistItem!]!
    attachmentCount: Int!
    commentCount: Int!
    isArchived: Boolean!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum TaskPriority {
    low
    medium
    high
    urgent
  }

  # Board type
  type Board {
    _id: ID!
    name: String!
    description: String
    projectId: ID!
    columns: [Column!]!
    isDefault: Boolean!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
    tasks: [Task!]!
    taskCount: Int!
  }

  # Member type
  type Member {
    user: User!
    role: MemberRole!
    joinedAt: DateTime!
  }

  enum MemberRole {
    owner
    admin
    member
    viewer
  }

  # Project type
  type Project {
    _id: ID!
    name: String!
    description: String
    key: String!
    visibility: ProjectVisibility!
    status: ProjectStatus!
    members: [Member!]!
    boards: [Board!]!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
    taskStats: TaskStats!
  }

  enum ProjectVisibility {
    private
    organization
    public
  }

  enum ProjectStatus {
    active
    archived
    completed
  }

  # Organization type
  type Organization {
    _id: ID!
    name: String!
    slug: String!
    description: String
    avatar: String
    memberCount: Int!
    projectCount: Int!
    createdAt: DateTime!
  }

  # Task statistics
  type TaskStats {
    total: Int!
    byStatus: TaskStatusCounts!
    byPriority: TaskPriorityCounts!
    overdue: Int!
    dueSoon: Int!
  }

  type TaskStatusCounts {
    todo: Int!
    inProgress: Int!
    review: Int!
    done: Int!
  }

  type TaskPriorityCounts {
    low: Int!
    medium: Int!
    high: Int!
    urgent: Int!
  }

  # Dashboard summary
  type DashboardSummary {
    totalProjects: Int!
    totalTasks: Int!
    completedTasks: Int!
    pendingTasks: Int!
    overdueTasks: Int!
    recentActivity: [Activity!]!
    assignedTasks: [Task!]!
    upcomingDeadlines: [Task!]!
  }

  # Activity type
  type Activity {
    _id: ID!
    type: String!
    entityType: String!
    entityId: ID!
    userId: User!
    metadata: ActivityMetadata
    createdAt: DateTime!
  }

  type ActivityMetadata {
    title: String
    name: String
    columnName: String
    fromColumnId: String
    toColumnId: String
    updates: [String!]
  }

  # Notification type
  type Notification {
    _id: ID!
    type: String!
    title: String!
    message: String!
    link: String
    isRead: Boolean!
    createdAt: DateTime!
  }

  # Board with tasks grouped by column
  type BoardWithTasks {
    board: Board!
    columns: [ColumnWithTasks!]!
  }

  type ColumnWithTasks {
    column: Column!
    tasks: [Task!]!
  }

  # Queries
  type Query {
    # Dashboard
    dashboardSummary: DashboardSummary!
    
    # Organizations
    organizations: [Organization!]!
    organization(id: ID!): Organization
    
    # Projects
    projects(organizationId: ID): [Project!]!
    project(id: ID!): Project
    
    # Boards
    boards(projectId: ID!): [Board!]!
    board(id: ID!): Board
    boardWithTasks(id: ID!): BoardWithTasks!
    
    # Tasks
    task(id: ID!): Task
    myTasks(status: String, priority: TaskPriority): [Task!]!
    searchTasks(query: String!, projectId: ID): [Task!]!
    
    # Activity
    projectActivity(projectId: ID!, limit: Int): [Activity!]!
    
    # Notifications
    notifications(limit: Int): [Notification!]!
    unreadNotificationCount: Int!
  }
`;

export default typeDefs;
