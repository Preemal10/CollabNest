import { Types } from 'mongoose';
import { Organization, type IOrganization } from '../models/index.js';
import { ApiError } from '../utils/errors.js';
import { activityService } from './activity.service.js';

// Create organization payload
interface CreateOrganizationPayload {
  name: string;
  slug: string;
  description?: string;
}

// Update organization payload
interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
  logo?: string;
}

// Invite member payload
interface InviteMemberPayload {
  email: string;
  role: 'admin' | 'member';
}

class OrganizationService {
  /**
   * Create a new organization
   */
  async create(
    payload: CreateOrganizationPayload,
    userId: string
  ): Promise<IOrganization> {
    // Check if slug is available
    const existing = await Organization.findBySlug(payload.slug);
    if (existing) {
      throw ApiError.alreadyExists('Organization', 'An organization with this slug already exists');
    }

    // Create organization with user as owner
    const organization = new Organization({
      ...payload,
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
    });

    await organization.save();

    // Log activity
    await activityService.log({
      type: 'organization.created',
      entityType: 'organization',
      entityId: organization._id,
      userId,
      metadata: { name: organization.name },
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getById(organizationId: string, userId: string): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId)
      .populate('members.userId', 'name email avatar');

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Check if user is a member
    if (!organization.isMember(userId)) {
      throw ApiError.forbidden('You are not a member of this organization');
    }

    return organization;
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string, userId: string): Promise<IOrganization> {
    const organization = await Organization.findBySlug(slug);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Check if user is a member
    if (!organization.isMember(userId)) {
      throw ApiError.forbidden('You are not a member of this organization');
    }

    return organization.populate('members.userId', 'name email avatar');
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<IOrganization[]> {
    return Organization.findUserOrganizations(userId);
  }

  /**
   * Update organization
   */
  async update(
    organizationId: string,
    payload: UpdateOrganizationPayload,
    userId: string
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Check if user has permission
    if (!organization.isAdmin(userId)) {
      throw ApiError.insufficientPermissions('Only admins can update organization settings');
    }

    // Update fields
    Object.assign(organization, payload);
    await organization.save();

    // Log activity
    await activityService.log({
      type: 'organization.updated',
      entityType: 'organization',
      entityId: organization._id,
      userId,
      metadata: { updates: Object.keys(payload) },
    });

    return organization;
  }

  /**
   * Delete organization
   */
  async delete(organizationId: string, userId: string): Promise<void> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Only owner can delete
    if (!organization.isOwner(userId)) {
      throw ApiError.insufficientPermissions('Only the owner can delete the organization');
    }

    await Organization.findByIdAndDelete(organizationId);

    // TODO: Clean up related projects, boards, tasks, etc.
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    payload: InviteMemberPayload,
    invitedByUserId: string
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Check if inviter has permission
    if (!organization.canManageMembers(invitedByUserId)) {
      throw ApiError.insufficientPermissions('You do not have permission to invite members');
    }

    // Find user by email
    const User = (await import('../models/User.js')).User;
    const userToAdd = await User.findByEmail(payload.email);

    if (!userToAdd) {
      throw ApiError.notFound('User', 'No user found with this email');
    }

    // Check if already a member
    if (organization.isMember(userToAdd._id)) {
      throw ApiError.conflict('User is already a member of this organization');
    }

    // Add member
    organization.members.push({
      userId: userToAdd._id,
      role: payload.role,
      joinedAt: new Date(),
    });

    await organization.save();

    // Log activity
    await activityService.log({
      type: 'organization.member.added',
      entityType: 'organization',
      entityId: organization._id,
      userId: invitedByUserId,
      metadata: {
        memberId: userToAdd._id.toString(),
        memberName: userToAdd.name,
        role: payload.role,
      },
    });

    return organization.populate('members.userId', 'name email avatar');
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: string,
    memberUserId: string,
    removedByUserId: string
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Check if remover has permission
    if (!organization.canManageMembers(removedByUserId)) {
      throw ApiError.insufficientPermissions('You do not have permission to remove members');
    }

    // Cannot remove owner
    if (organization.isOwner(memberUserId)) {
      throw ApiError.conflict('Cannot remove the organization owner');
    }

    // Cannot remove yourself (use leave instead)
    if (memberUserId === removedByUserId) {
      throw ApiError.conflict('Use the leave endpoint to leave the organization');
    }

    // Find and remove member
    const memberIndex = organization.members.findIndex(
      (m) => m.userId.toString() === memberUserId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound('Member', 'User is not a member of this organization');
    }

    const removedMember = organization.members[memberIndex];
    organization.members.splice(memberIndex, 1);

    await organization.save();

    // Log activity
    await activityService.log({
      type: 'organization.member.removed',
      entityType: 'organization',
      entityId: organization._id,
      userId: removedByUserId,
      metadata: {
        memberId: memberUserId,
        role: removedMember?.role,
      },
    });

    return organization.populate('members.userId', 'name email avatar');
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    memberUserId: string,
    newRole: 'admin' | 'member',
    updatedByUserId: string
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Only owner can change roles
    if (!organization.isOwner(updatedByUserId)) {
      throw ApiError.insufficientPermissions('Only the owner can change member roles');
    }

    // Cannot change owner's role
    if (organization.isOwner(memberUserId)) {
      throw ApiError.conflict('Cannot change the owner role');
    }

    // Find member
    const member = organization.members.find(
      (m) => m.userId.toString() === memberUserId
    );

    if (!member) {
      throw ApiError.notFound('Member', 'User is not a member of this organization');
    }

    const oldRole = member.role;
    member.role = newRole;

    await organization.save();

    // Log activity
    await activityService.log({
      type: 'organization.member.role_changed',
      entityType: 'organization',
      entityId: organization._id,
      userId: updatedByUserId,
      metadata: {
        memberId: memberUserId,
        oldRole,
        newRole,
      },
    });

    return organization.populate('members.userId', 'name email avatar');
  }

  /**
   * Leave organization
   */
  async leave(organizationId: string, userId: string): Promise<void> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Owner cannot leave (must transfer ownership or delete)
    if (organization.isOwner(userId)) {
      throw ApiError.conflict(
        'Organization owner cannot leave. Transfer ownership first or delete the organization.'
      );
    }

    // Find and remove member
    const memberIndex = organization.members.findIndex(
      (m) => m.userId.toString() === userId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound('Member', 'You are not a member of this organization');
    }

    organization.members.splice(memberIndex, 1);
    await organization.save();
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(
    organizationId: string,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<IOrganization> {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Only owner can transfer
    if (!organization.isOwner(currentOwnerId)) {
      throw ApiError.insufficientPermissions('Only the owner can transfer ownership');
    }

    // New owner must be a member
    const newOwnerMember = organization.members.find(
      (m) => m.userId.toString() === newOwnerId
    );

    if (!newOwnerMember) {
      throw ApiError.notFound('Member', 'New owner must be an existing member');
    }

    // Find current owner
    const currentOwnerMember = organization.members.find(
      (m) => m.userId.toString() === currentOwnerId
    );

    // Transfer ownership
    newOwnerMember.role = 'owner';
    if (currentOwnerMember) {
      currentOwnerMember.role = 'admin';
    }

    await organization.save();

    return organization.populate('members.userId', 'name email avatar');
  }
}

export const organizationService = new OrganizationService();
