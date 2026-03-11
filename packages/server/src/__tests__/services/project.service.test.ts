import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { projectService } from '../../services/project.service.js';
import { Project, Board, Organization } from '../../models/index.js';
import {
  createTestUser,
  createTestOrganization,
} from '../utils/testHelpers.js';

describe('ProjectService', () => {
  // Common test users
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeEach(async () => {
    // Create test users before each test
    const user1 = await createTestUser({ email: 'user1@example.com', name: 'User One' });
    const user2 = await createTestUser({ email: 'user2@example.com', name: 'User Two' });
    const user3 = await createTestUser({ email: 'user3@example.com', name: 'User Three' });
    user1Id = user1._id.toString();
    user2Id = user2._id.toString();
    user3Id = user3._id.toString();
  });

  describe('create', () => {
    it('should create a standalone project without organization', async () => {
      const payload = {
        name: 'My Standalone Project',
        description: 'A project without an organization',
        visibility: 'private' as const,
      };

      const project = await projectService.create(payload, user1Id);

      expect(project).toBeDefined();
      expect(project.name).toBe(payload.name);
      expect(project.description).toBe(payload.description);
      expect(project.visibility).toBe('private');
      expect(project.organizationId).toBeUndefined();
      expect(project.createdBy.toString()).toBe(user1Id);
    });

    it('should add creator as manager when creating project', async () => {
      const project = await projectService.create(
        { name: 'Test Project' },
        user1Id
      );

      expect(project.members).toHaveLength(1);
      expect(project.members[0].userId.toString()).toBe(user1Id);
      expect(project.members[0].role).toBe('manager');
      expect(project.members[0].joinedAt).toBeInstanceOf(Date);
    });

    it('should create a default board when creating project', async () => {
      const project = await projectService.create(
        { name: 'Project with Board' },
        user1Id
      );

      const board = await Board.findOne({ projectId: project._id });
      
      expect(board).toBeDefined();
      expect(board!.name).toBe('Main Board');
      expect(board!.isDefault).toBe(true);
      expect(board!.createdBy.toString()).toBe(user1Id);
    });

    it('should create project with organization when user is org member', async () => {
      // Create organization with user1 as owner
      const org = await Organization.create({
        name: 'Test Org',
        slug: `test-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user1Id), role: 'owner' }],
      });

      const payload = {
        name: 'Org Project',
        organizationId: org._id.toString(),
        visibility: 'organization' as const,
      };

      const project = await projectService.create(payload, user1Id);

      expect(project.organizationId?.toString()).toBe(org._id.toString());
      expect(project.visibility).toBe('organization');
    });

    it('should throw error when organization not found', async () => {
      const fakeOrgId = new Types.ObjectId().toString();

      await expect(
        projectService.create(
          { name: 'Test', organizationId: fakeOrgId },
          user1Id
        )
      ).rejects.toThrow('Organization not found');
    });

    it('should throw error when user is not org member', async () => {
      // Create org without user1
      const org = await Organization.create({
        name: 'Other Org',
        slug: `other-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user2Id), role: 'owner' }],
      });

      await expect(
        projectService.create(
          { name: 'Test', organizationId: org._id.toString() },
          user1Id
        )
      ).rejects.toThrow('You are not a member of this organization');
    });

    it('should set default visibility to private', async () => {
      const project = await projectService.create(
        { name: 'Default Visibility Project' },
        user1Id
      );

      expect(project.visibility).toBe('private');
    });

    it('should apply custom color and icon', async () => {
      const payload = {
        name: 'Styled Project',
        color: '#FF5733',
        icon: 'rocket',
      };

      const project = await projectService.create(payload, user1Id);

      expect(project.color).toBe('#FF5733');
      expect(project.icon).toBe('rocket');
    });
  });

  describe('getById', () => {
    it('should return project when user is a member', async () => {
      const created = await projectService.create(
        { name: 'Member Project' },
        user1Id
      );

      const project = await projectService.getById(
        created._id.toString(),
        user1Id
      );

      expect(project).toBeDefined();
      expect(project._id.toString()).toBe(created._id.toString());
      expect(project.name).toBe('Member Project');
    });

    it('should populate member details', async () => {
      const created = await projectService.create(
        { name: 'Populated Project' },
        user1Id
      );

      const project = await projectService.getById(
        created._id.toString(),
        user1Id
      );

      // Members should be populated with user details
      expect(project.members[0].userId).toBeDefined();
    });

    it('should throw error when project not found', async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(projectService.getById(fakeId, user1Id)).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw forbidden when user has no access to private project', async () => {
      // Create private project with user1
      const created = await projectService.create(
        { name: 'Private Project', visibility: 'private' },
        user1Id
      );

      // Try to access with user2
      await expect(
        projectService.getById(created._id.toString(), user2Id)
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should allow access to public project for any user', async () => {
      // Create public project with user1
      const created = await projectService.create(
        { name: 'Public Project', visibility: 'public' },
        user1Id
      );

      // user2 should be able to access
      const project = await projectService.getById(
        created._id.toString(),
        user2Id
      );

      expect(project).toBeDefined();
      expect(project.name).toBe('Public Project');
    });

    it('should allow org member to access organization-visible project', async () => {
      // Create org with both users
      const org = await Organization.create({
        name: 'Shared Org',
        slug: `shared-org-${Date.now()}`,
        members: [
          { userId: new Types.ObjectId(user1Id), role: 'owner' },
          { userId: new Types.ObjectId(user2Id), role: 'member' },
        ],
      });

      // Create org-visible project
      const created = await projectService.create(
        {
          name: 'Org Visible Project',
          organizationId: org._id.toString(),
          visibility: 'organization',
        },
        user1Id
      );

      // user2 (org member) should be able to access
      const project = await projectService.getById(
        created._id.toString(),
        user2Id
      );

      expect(project).toBeDefined();
      expect(project.name).toBe('Org Visible Project');
    });

    it('should deny non-org member access to organization-visible project', async () => {
      // Create org with only user1
      const org = await Organization.create({
        name: 'Private Org',
        slug: `private-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user1Id), role: 'owner' }],
      });

      // Create org-visible project
      const created = await projectService.create(
        {
          name: 'Org Only Project',
          organizationId: org._id.toString(),
          visibility: 'organization',
        },
        user1Id
      );

      // user2 (not org member) should not be able to access
      await expect(
        projectService.getById(created._id.toString(), user2Id)
      ).rejects.toThrow('You do not have access to this project');
    });
  });

  describe('getByOrganization', () => {
    it('should return projects for organization member', async () => {
      const org = await Organization.create({
        name: 'Test Org',
        slug: `test-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user1Id), role: 'owner' }],
      });

      // Create multiple projects
      await projectService.create(
        { name: 'Org Project 1', organizationId: org._id.toString() },
        user1Id
      );
      await projectService.create(
        { name: 'Org Project 2', organizationId: org._id.toString() },
        user1Id
      );

      const projects = await projectService.getByOrganization(
        org._id.toString(),
        user1Id
      );

      expect(projects).toHaveLength(2);
    });

    it('should exclude archived projects by default', async () => {
      const org = await Organization.create({
        name: 'Archive Org',
        slug: `archive-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user1Id), role: 'owner' }],
      });

      // Create active and archived projects
      await projectService.create(
        { name: 'Active Project', organizationId: org._id.toString() },
        user1Id
      );
      const archived = await projectService.create(
        { name: 'Archived Project', organizationId: org._id.toString() },
        user1Id
      );

      // Archive one project
      await projectService.update(
        archived._id.toString(),
        { isArchived: true },
        user1Id
      );

      const projects = await projectService.getByOrganization(
        org._id.toString(),
        user1Id
      );

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Active Project');
    });

    it('should include archived projects when flag is true', async () => {
      const org = await Organization.create({
        name: 'Include Archive Org',
        slug: `include-archive-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user1Id), role: 'owner' }],
      });

      await projectService.create(
        { name: 'Active', organizationId: org._id.toString() },
        user1Id
      );
      const archived = await projectService.create(
        { name: 'Archived', organizationId: org._id.toString() },
        user1Id
      );

      await projectService.update(
        archived._id.toString(),
        { isArchived: true },
        user1Id
      );

      const projects = await projectService.getByOrganization(
        org._id.toString(),
        user1Id,
        true // includeArchived
      );

      expect(projects).toHaveLength(2);
    });

    it('should throw error when organization not found', async () => {
      const fakeOrgId = new Types.ObjectId().toString();

      await expect(
        projectService.getByOrganization(fakeOrgId, user1Id)
      ).rejects.toThrow('Organization not found');
    });

    it('should throw forbidden when user is not org member', async () => {
      const org = await Organization.create({
        name: 'Restricted Org',
        slug: `restricted-org-${Date.now()}`,
        members: [{ userId: new Types.ObjectId(user1Id), role: 'owner' }],
      });

      await expect(
        projectService.getByOrganization(org._id.toString(), user2Id)
      ).rejects.toThrow('You are not a member of this organization');
    });

    it('should return organization-visible and public projects for org members', async () => {
      const org = await Organization.create({
        name: 'Mixed Visibility Org',
        slug: `mixed-vis-org-${Date.now()}`,
        members: [
          { userId: new Types.ObjectId(user1Id), role: 'owner' },
          { userId: new Types.ObjectId(user2Id), role: 'member' },
        ],
      });

      // user1 creates projects
      await projectService.create(
        {
          name: 'Org Visible',
          organizationId: org._id.toString(),
          visibility: 'organization',
        },
        user1Id
      );
      await projectService.create(
        {
          name: 'Public Project',
          organizationId: org._id.toString(),
          visibility: 'public',
        },
        user1Id
      );

      // user2 should see both
      const projects = await projectService.getByOrganization(
        org._id.toString(),
        user2Id
      );

      expect(projects).toHaveLength(2);
    });
  });

  describe('getUserProjects', () => {
    it('should return all projects user is member of', async () => {
      // Create projects for user1
      await projectService.create({ name: 'Project 1' }, user1Id);
      await projectService.create({ name: 'Project 2' }, user1Id);

      // Create project for user2
      await projectService.create({ name: 'Other Project' }, user2Id);

      const projects = await projectService.getUserProjects(user1Id);

      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toContain('Project 1');
      expect(projects.map(p => p.name)).toContain('Project 2');
    });

    it('should exclude archived projects', async () => {
      const active = await projectService.create(
        { name: 'Active' },
        user1Id
      );
      const archived = await projectService.create(
        { name: 'Archived' },
        user1Id
      );

      await projectService.update(
        archived._id.toString(),
        { isArchived: true },
        user1Id
      );

      const projects = await projectService.getUserProjects(user1Id);

      expect(projects).toHaveLength(1);
      expect(projects[0]._id.toString()).toBe(active._id.toString());
    });

    it('should return empty array if user has no projects', async () => {
      const projects = await projectService.getUserProjects(user1Id);

      expect(projects).toHaveLength(0);
    });

    it('should include projects where user was added as member', async () => {
      // user1 creates project
      const project = await projectService.create(
        { name: 'Shared Project' },
        user1Id
      );

      // Add user2 as member
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      const user2Projects = await projectService.getUserProjects(user2Id);

      expect(user2Projects).toHaveLength(1);
      expect(user2Projects[0].name).toBe('Shared Project');
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      const project = await projectService.create(
        { name: 'Original Name' },
        user1Id
      );

      const updated = await projectService.update(
        project._id.toString(),
        { name: 'New Name' },
        user1Id
      );

      expect(updated.name).toBe('New Name');
    });

    it('should update multiple fields', async () => {
      const project = await projectService.create(
        { name: 'Test Project' },
        user1Id
      );

      const updated = await projectService.update(
        project._id.toString(),
        {
          name: 'Updated Project',
          description: 'New description',
          color: '#00FF00',
          visibility: 'public',
        },
        user1Id
      );

      expect(updated.name).toBe('Updated Project');
      expect(updated.description).toBe('New description');
      expect(updated.color).toBe('#00FF00');
      expect(updated.visibility).toBe('public');
    });

    it('should archive project', async () => {
      const project = await projectService.create(
        { name: 'To Archive' },
        user1Id
      );

      const updated = await projectService.update(
        project._id.toString(),
        { isArchived: true },
        user1Id
      );

      expect(updated.isArchived).toBe(true);
    });

    it('should throw error when project not found', async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(
        projectService.update(fakeId, { name: 'Test' }, user1Id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error when user is not manager', async () => {
      const project = await projectService.create(
        { name: 'Manager Only' },
        user1Id
      );

      // Add user2 as editor
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      await expect(
        projectService.update(
          project._id.toString(),
          { name: 'Attempted Update' },
          user2Id
        )
      ).rejects.toThrow('Only project managers can update project settings');
    });

    it('should throw error when viewer tries to update', async () => {
      const project = await projectService.create(
        { name: 'Viewer Test' },
        user1Id
      );

      // Add user2 as viewer
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'viewer',
        user1Id
      );

      await expect(
        projectService.update(
          project._id.toString(),
          { name: 'Update by Viewer' },
          user2Id
        )
      ).rejects.toThrow('Only project managers can update project settings');
    });
  });

  describe('delete', () => {
    it('should delete project when user is manager', async () => {
      const project = await projectService.create(
        { name: 'To Delete' },
        user1Id
      );
      const projectId = project._id.toString();

      await projectService.delete(projectId, user1Id);

      const deleted = await Project.findById(projectId);
      expect(deleted).toBeNull();
    });

    it('should throw error when project not found', async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(projectService.delete(fakeId, user1Id)).rejects.toThrow(
        'Project not found'
      );
    });

    it('should throw error when user is not manager', async () => {
      const project = await projectService.create(
        { name: 'Protected Project' },
        user1Id
      );

      // Add user2 as editor
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      await expect(
        projectService.delete(project._id.toString(), user2Id)
      ).rejects.toThrow('Only project managers can delete the project');
    });

    it('should throw error when non-member tries to delete', async () => {
      const project = await projectService.create(
        { name: 'Non-member Delete' },
        user1Id
      );

      await expect(
        projectService.delete(project._id.toString(), user2Id)
      ).rejects.toThrow('Only project managers can delete the project');
    });
  });

  describe('addMember', () => {
    it('should add member with specified role', async () => {
      const project = await projectService.create(
        { name: 'Member Test' },
        user1Id
      );

      const updated = await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      expect(updated.members).toHaveLength(2);
      // After populate, userId may be an object with _id
      const newMember = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user2Id;
      });
      expect(newMember).toBeDefined();
      expect(newMember!.role).toBe('editor');
    });

    it('should add member as viewer', async () => {
      const project = await projectService.create(
        { name: 'Viewer Test' },
        user1Id
      );

      const updated = await projectService.addMember(
        project._id.toString(),
        user2Id,
        'viewer',
        user1Id
      );

      const newMember = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user2Id;
      });
      expect(newMember!.role).toBe('viewer');
    });

    it('should add member as manager', async () => {
      const project = await projectService.create(
        { name: 'Manager Add Test' },
        user1Id
      );

      const updated = await projectService.addMember(
        project._id.toString(),
        user2Id,
        'manager',
        user1Id
      );

      const newMember = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user2Id;
      });
      expect(newMember!.role).toBe('manager');
    });

    it('should throw error when project not found', async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(
        projectService.addMember(fakeId, user2Id, 'editor', user1Id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error when non-manager tries to add member', async () => {
      const project = await projectService.create(
        { name: 'Permission Test' },
        user1Id
      );

      // Add user2 as editor
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      // user2 (editor) tries to add user3
      await expect(
        projectService.addMember(
          project._id.toString(),
          user3Id,
          'viewer',
          user2Id
        )
      ).rejects.toThrow('Only project managers can add members');
    });

    it('should throw error when adding existing member', async () => {
      const project = await projectService.create(
        { name: 'Duplicate Test' },
        user1Id
      );

      // Add user2
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      // Try to add user2 again
      await expect(
        projectService.addMember(
          project._id.toString(),
          user2Id,
          'viewer',
          user1Id
        )
      ).rejects.toThrow('User is already a member of this project');
    });

    it('should set joinedAt date when adding member', async () => {
      const project = await projectService.create(
        { name: 'Join Date Test' },
        user1Id
      );

      const beforeAdd = new Date();
      const updated = await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      const newMember = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user2Id;
      });
      expect(newMember!.joinedAt).toBeInstanceOf(Date);
      expect(newMember!.joinedAt.getTime()).toBeGreaterThanOrEqual(
        beforeAdd.getTime()
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      const project = await projectService.create(
        { name: 'Remove Test' },
        user1Id
      );

      // Add then remove user2
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      const updated = await projectService.removeMember(
        project._id.toString(),
        user2Id,
        user1Id
      );

      expect(updated.members).toHaveLength(1);
      // After populate, userId may be an object with _id
      const memberId = (updated.members[0].userId as any)._id || updated.members[0].userId;
      expect(memberId.toString()).toBe(user1Id);
    });

    it('should throw error when project not found', async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(
        projectService.removeMember(fakeId, user2Id, user1Id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error when non-manager tries to remove member', async () => {
      const project = await projectService.create(
        { name: 'Remove Permission' },
        user1Id
      );

      // Add user2 and user3
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );
      await projectService.addMember(
        project._id.toString(),
        user3Id,
        'viewer',
        user1Id
      );

      // user2 (editor) tries to remove user3
      await expect(
        projectService.removeMember(project._id.toString(), user3Id, user2Id)
      ).rejects.toThrow('Only project managers can remove members');
    });

    it('should throw error when removing only manager', async () => {
      const project = await projectService.create(
        { name: 'Last Manager' },
        user1Id
      );

      // Try to remove the only manager (user1)
      await expect(
        projectService.removeMember(project._id.toString(), user1Id, user1Id)
      ).rejects.toThrow('Cannot remove the only project manager');
    });

    it('should allow removing manager when another manager exists', async () => {
      const project = await projectService.create(
        { name: 'Two Managers' },
        user1Id
      );

      // Add user2 as manager
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'manager',
        user1Id
      );

      // Should be able to remove user1
      const updated = await projectService.removeMember(
        project._id.toString(),
        user1Id,
        user2Id
      );

      expect(updated.members).toHaveLength(1);
      // After populate, userId may be an object with _id
      const memberId = (updated.members[0].userId as any)._id || updated.members[0].userId;
      expect(memberId.toString()).toBe(user2Id);
    });

    it('should throw error when member not found', async () => {
      const project = await projectService.create(
        { name: 'Not Found Member' },
        user1Id
      );

      await expect(
        projectService.removeMember(project._id.toString(), user2Id, user1Id)
      ).rejects.toThrow('User is not a member of this project');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role from editor to viewer', async () => {
      const project = await projectService.create(
        { name: 'Role Update Test' },
        user1Id
      );

      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );

      const updated = await projectService.updateMemberRole(
        project._id.toString(),
        user2Id,
        'viewer',
        user1Id
      );

      const member = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user2Id;
      });
      expect(member!.role).toBe('viewer');
    });

    it('should promote member to manager', async () => {
      const project = await projectService.create(
        { name: 'Promote Test' },
        user1Id
      );

      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'viewer',
        user1Id
      );

      const updated = await projectService.updateMemberRole(
        project._id.toString(),
        user2Id,
        'manager',
        user1Id
      );

      const member = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user2Id;
      });
      expect(member!.role).toBe('manager');
    });

    it('should throw error when project not found', async () => {
      const fakeId = new Types.ObjectId().toString();

      await expect(
        projectService.updateMemberRole(fakeId, user2Id, 'editor', user1Id)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error when non-manager tries to update role', async () => {
      const project = await projectService.create(
        { name: 'Role Permission' },
        user1Id
      );

      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'editor',
        user1Id
      );
      await projectService.addMember(
        project._id.toString(),
        user3Id,
        'viewer',
        user1Id
      );

      // user2 (editor) tries to change user3's role
      await expect(
        projectService.updateMemberRole(
          project._id.toString(),
          user3Id,
          'editor',
          user2Id
        )
      ).rejects.toThrow('Only project managers can change roles');
    });

    it('should throw error when member not found', async () => {
      const project = await projectService.create(
        { name: 'Member Not Found' },
        user1Id
      );

      await expect(
        projectService.updateMemberRole(
          project._id.toString(),
          user2Id,
          'editor',
          user1Id
        )
      ).rejects.toThrow('User is not a member of this project');
    });

    it('should throw error when downgrading only manager', async () => {
      const project = await projectService.create(
        { name: 'Only Manager Downgrade' },
        user1Id
      );

      // Try to downgrade the only manager
      await expect(
        projectService.updateMemberRole(
          project._id.toString(),
          user1Id,
          'editor',
          user1Id
        )
      ).rejects.toThrow('Cannot change role of the only project manager');
    });

    it('should allow downgrading manager when another manager exists', async () => {
      const project = await projectService.create(
        { name: 'Two Manager Downgrade' },
        user1Id
      );

      // Add user2 as manager
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'manager',
        user1Id
      );

      // Should be able to downgrade user1
      const updated = await projectService.updateMemberRole(
        project._id.toString(),
        user1Id,
        'editor',
        user2Id
      );

      const member = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user1Id;
      });
      expect(member!.role).toBe('editor');
    });

    it('should allow manager to change their role to viewer when other managers exist', async () => {
      const project = await projectService.create(
        { name: 'Self Downgrade' },
        user1Id
      );

      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'manager',
        user1Id
      );

      const updated = await projectService.updateMemberRole(
        project._id.toString(),
        user1Id,
        'viewer',
        user2Id
      );

      const member = updated.members.find(m => {
        const id = (m.userId as any)._id || m.userId;
        return id.toString() === user1Id;
      });
      expect(member!.role).toBe('viewer');
    });
  });

  describe('access control edge cases', () => {
    it('should deny access to private project for non-member', async () => {
      const project = await projectService.create(
        { name: 'Private', visibility: 'private' },
        user1Id
      );

      await expect(
        projectService.getById(project._id.toString(), user2Id)
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should allow access after user is added as member', async () => {
      const project = await projectService.create(
        { name: 'Access After Add', visibility: 'private' },
        user1Id
      );

      // Initially user2 cannot access
      await expect(
        projectService.getById(project._id.toString(), user2Id)
      ).rejects.toThrow('You do not have access to this project');

      // Add user2
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'viewer',
        user1Id
      );

      // Now user2 can access
      const accessed = await projectService.getById(
        project._id.toString(),
        user2Id
      );
      expect(accessed).toBeDefined();
    });

    it('should deny access after user is removed as member', async () => {
      const project = await projectService.create(
        { name: 'Access After Remove', visibility: 'private' },
        user1Id
      );

      // Add user2
      await projectService.addMember(
        project._id.toString(),
        user2Id,
        'viewer',
        user1Id
      );

      // user2 can access
      const accessed = await projectService.getById(
        project._id.toString(),
        user2Id
      );
      expect(accessed).toBeDefined();

      // Remove user2
      await projectService.removeMember(
        project._id.toString(),
        user2Id,
        user1Id
      );

      // Now user2 cannot access
      await expect(
        projectService.getById(project._id.toString(), user2Id)
      ).rejects.toThrow('You do not have access to this project');
    });
  });
});
