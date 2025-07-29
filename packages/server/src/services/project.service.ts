import { Types } from 'mongoose';
import { Project, Organization, Board, type IProject } from '../models/index.js';
import { ApiError } from '../utils/errors.js';
import { activityService } from './activity.service.js';

// Helper to convert string to ObjectId
function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

// Create project payload
interface CreateProjectPayload {
  name: string;
  description?: string;
  organizationId?: string; // Optional - can create standalone projects
  visibility?: 'private' | 'organization' | 'public';
  color?: string;
  icon?: string;
}

// Update project payload
interface UpdateProjectPayload {
  name?: string;
  description?: string;
  visibility?: 'private' | 'organization' | 'public';
  color?: string;
  icon?: string;
  isArchived?: boolean;
}

class ProjectService {
  /**
   * Create a new project
   */
  async create(payload: CreateProjectPayload, userId: string): Promise<IProject> {
    // If organizationId provided, verify it exists and user is a member
    if (payload.organizationId) {
      const organization = await Organization.findById(payload.organizationId);
      if (!organization) {
        throw ApiError.notFound('Organization');
      }

      if (!organization.isMember(userId)) {
        throw ApiError.forbidden('You are not a member of this organization');
      }
    }

    // Create project with user as manager
    const project = new Project({
      name: payload.name,
      description: payload.description,
      organizationId: payload.organizationId ? new Types.ObjectId(payload.organizationId) : undefined,
      visibility: payload.visibility || 'private',
      color: payload.color,
      icon: payload.icon,
      createdBy: new Types.ObjectId(userId),
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'manager',
          joinedAt: new Date(),
        },
      ],
    });

    await project.save();

    // Create default board
    const board = new Board({
      name: 'Main Board',
      projectId: project._id,
      isDefault: true,
      createdBy: new Types.ObjectId(userId),
    });
    await board.save();

    // Log activity
    await activityService.log({
      type: 'project.created',
      entityType: 'project',
      entityId: project._id,
      projectId: project._id.toString(),
      userId,
      metadata: { name: project.name },
    });

    return project;
  }

  /**
   * Get project by ID
   */
  async getById(projectId: string, userId: string): Promise<IProject> {
    // First fetch without populate to check access
    const projectForAccess = await Project.findById(projectId);

    if (!projectForAccess) {
      throw ApiError.notFound('Project');
    }

    // Check access before populating (isMember needs unpopulated userId)
    if (!await this.canAccess(projectForAccess, userId)) {
      throw ApiError.forbidden('You do not have access to this project');
    }

    // Now fetch with populated fields for the response
    const project = await Project.findById(projectId)
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return project!;
  }

  /**
   * Get all projects for an organization
   */
  async getByOrganization(
    organizationId: string,
    userId: string,
    includeArchived = false
  ): Promise<IProject[]> {
    // Verify organization access
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    if (!organization.isMember(userId)) {
      throw ApiError.forbidden('You are not a member of this organization');
    }

    const query: Record<string, unknown> = { organizationId };
    if (!includeArchived) {
      query['isArchived'] = false;
    }

    // Get projects user has access to
    const userObjectId = toObjectId(userId);
    const projects = await Project.find({
      ...query,
      $or: [
        { 'members.userId': userObjectId },
        { visibility: 'organization' },
        { visibility: 'public' },
      ],
    })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email avatar');

    return projects;
  }

  /**
   * Get all projects user is a member of
   */
  async getUserProjects(userId: string): Promise<IProject[]> {
    return Project.findUserProjects(userId);
  }

  /**
   * Update project
   */
  async update(
    projectId: string,
    payload: UpdateProjectPayload,
    userId: string
  ): Promise<IProject> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Check permission
    if (!project.isManager(userId)) {
      throw ApiError.insufficientPermissions('Only project managers can update project settings');
    }

    // Update fields
    Object.assign(project, payload);
    await project.save();

    // Log activity
    const activityType = payload.isArchived ? 'project.archived' : 'project.updated';
    await activityService.log({
      type: activityType,
      entityType: 'project',
      entityId: project._id,
      projectId: project._id.toString(),
      userId,
      metadata: { updates: Object.keys(payload) },
    });

    return project.populate('members.userId', 'name email avatar');
  }

  /**
   * Delete project
   */
  async delete(projectId: string, userId: string): Promise<void> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Only manager can delete
    if (!project.isManager(userId)) {
      throw ApiError.insufficientPermissions('Only project managers can delete the project');
    }

    // Delete project and related data
    await Project.findByIdAndDelete(projectId);

    // TODO: Clean up related boards, tasks, comments, attachments
  }

  /**
   * Add member to project
   */
  async addMember(
    projectId: string,
    memberUserId: string,
    role: 'manager' | 'editor' | 'viewer',
    addedByUserId: string
  ): Promise<IProject> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Check permission
    if (!project.isManager(addedByUserId)) {
      throw ApiError.insufficientPermissions('Only project managers can add members');
    }

    // Check if already a member
    if (project.isMember(memberUserId)) {
      throw ApiError.conflict('User is already a member of this project');
    }

    // Add member
    project.members.push({
      userId: new Types.ObjectId(memberUserId),
      role,
      joinedAt: new Date(),
    });

    await project.save();

    // Log activity
    await activityService.log({
      type: 'project.member.added',
      entityType: 'project',
      entityId: project._id,
      projectId: project._id.toString(),
      userId: addedByUserId,
      metadata: { memberId: memberUserId, role },
    });

    return project.populate('members.userId', 'name email avatar');
  }

  /**
   * Remove member from project
   */
  async removeMember(
    projectId: string,
    memberUserId: string,
    removedByUserId: string
  ): Promise<IProject> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Check permission
    if (!project.isManager(removedByUserId)) {
      throw ApiError.insufficientPermissions('Only project managers can remove members');
    }

    // Cannot remove yourself as the only manager
    const managers = project.members.filter(m => m.role === 'manager');
    if (managers.length === 1 && managers[0]?.userId.toString() === memberUserId) {
      throw ApiError.conflict('Cannot remove the only project manager');
    }

    // Find and remove member
    const memberIndex = project.members.findIndex(
      m => m.userId.toString() === memberUserId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound('Member', 'User is not a member of this project');
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    // Log activity
    await activityService.log({
      type: 'project.member.removed',
      entityType: 'project',
      entityId: project._id,
      projectId: project._id.toString(),
      userId: removedByUserId,
      metadata: { memberId: memberUserId },
    });

    return project.populate('members.userId', 'name email avatar');
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    projectId: string,
    memberUserId: string,
    newRole: 'manager' | 'editor' | 'viewer',
    updatedByUserId: string
  ): Promise<IProject> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw ApiError.notFound('Project');
    }

    // Check permission
    if (!project.isManager(updatedByUserId)) {
      throw ApiError.insufficientPermissions('Only project managers can change roles');
    }

    // Find member
    const member = project.members.find(
      m => m.userId.toString() === memberUserId
    );

    if (!member) {
      throw ApiError.notFound('Member', 'User is not a member of this project');
    }

    // Cannot downgrade the only manager
    if (member.role === 'manager' && newRole !== 'manager') {
      const managers = project.members.filter(m => m.role === 'manager');
      if (managers.length === 1) {
        throw ApiError.conflict('Cannot change role of the only project manager');
      }
    }

    const oldRole = member.role;
    member.role = newRole;
    await project.save();

    // Log activity
    await activityService.log({
      type: 'project.member.role_changed',
      entityType: 'project',
      entityId: project._id,
      projectId: project._id.toString(),
      userId: updatedByUserId,
      metadata: { memberId: memberUserId, oldRole, newRole },
    });

    return project.populate('members.userId', 'name email avatar');
  }

  /**
   * Check if user can access project
   */
  private async canAccess(project: IProject, userId: string): Promise<boolean> {
    // Direct member
    if (project.isMember(userId)) return true;

    // Public project
    if (project.visibility === 'public') return true;

    // Organization visibility - check org membership
    if (project.visibility === 'organization') {
      const organization = await Organization.findById(project.organizationId);
      return organization?.isMember(userId) ?? false;
    }

    return false;
  }
}

export const projectService = new ProjectService();
