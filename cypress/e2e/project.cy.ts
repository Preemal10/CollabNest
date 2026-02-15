/// <reference types="cypress" />

describe('Projects', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
  };

  const mockProjects = [
    {
      id: '1',
      name: 'Project Alpha',
      description: 'First test project',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Project Beta',
      description: 'Second test project',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    // Mock login
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        user: { id: '1', name: 'Test User', email: testUser.email },
        token: 'mock-jwt-token',
      },
    }).as('loginRequest');

    // Mock projects list
    cy.intercept('GET', '**/projects', {
      statusCode: 200,
      body: mockProjects,
    }).as('getProjects');

    cy.login(testUser.email, testUser.password);
    cy.wait('@loginRequest');
  });

  describe('Dashboard', () => {
    it('should display dashboard with projects list', () => {
      cy.wait('@getProjects');
      cy.url().should('include', '/dashboard');
      cy.contains('Project Alpha').should('be.visible');
      cy.contains('Project Beta').should('be.visible');
    });

    it('should show New button for creating projects', () => {
      cy.contains('button', 'New').should('be.visible');
    });

    it('should display project cards with correct information', () => {
      cy.wait('@getProjects');
      cy.contains('Project Alpha').should('be.visible');
      cy.contains('First test project').should('be.visible');
    });
  });

  describe('Create Project', () => {
    it('should open project creation modal', () => {
      cy.contains('button', 'New').click();
      cy.get('input[placeholder="My Awesome Project"]').should('be.visible');
      cy.get('textarea[placeholder="What\'s this project about?"]').should('be.visible');
    });

    it('should create a new project successfully', () => {
      const newProject = {
        name: 'New Test Project',
        description: 'This is a new test project',
      };

      cy.intercept('POST', '**/projects', {
        statusCode: 201,
        body: {
          id: '3',
          name: newProject.name,
          description: newProject.description,
          createdAt: new Date().toISOString(),
        },
      }).as('createProject');

      cy.createProject(newProject.name, newProject.description);
      cy.wait('@createProject');
      cy.contains(newProject.name).should('be.visible');
    });

    it('should show validation error for empty project name', () => {
      cy.contains('button', 'New').click();
      cy.get('textarea[placeholder="What\'s this project about?"]').type('Some description');
      cy.get('button[type="submit"]').click();
      cy.get('input[placeholder="My Awesome Project"]:invalid').should('exist');
    });

    it('should close modal on cancel', () => {
      cy.contains('button', 'New').click();
      cy.get('input[placeholder="My Awesome Project"]').should('be.visible');
      cy.contains('button', 'Cancel').click();
      cy.get('input[placeholder="My Awesome Project"]').should('not.exist');
    });
  });

  describe('Project Details', () => {
    it('should navigate to project details on click', () => {
      cy.intercept('GET', '**/projects/1', {
        statusCode: 200,
        body: mockProjects[0],
      }).as('getProject');

      cy.wait('@getProjects');
      cy.contains('Project Alpha').click();
      cy.wait('@getProject');
      cy.url().should('include', '/projects/1');
    });

    it('should display project information', () => {
      cy.intercept('GET', '**/projects/1', {
        statusCode: 200,
        body: mockProjects[0],
      }).as('getProject');

      cy.visit('/projects/1');
      cy.wait('@getProject');
      cy.contains('Project Alpha').should('be.visible');
      cy.contains('First test project').should('be.visible');
    });

    it('should show edit button for project owner', () => {
      cy.intercept('GET', '**/projects/1', {
        statusCode: 200,
        body: { ...mockProjects[0], ownerId: '1' },
      }).as('getProject');

      cy.visit('/projects/1');
      cy.wait('@getProject');
      cy.get('[data-testid="edit-project"]').should('be.visible');
    });

    it('should allow editing project details', () => {
      cy.intercept('GET', '**/projects/1', {
        statusCode: 200,
        body: { ...mockProjects[0], ownerId: '1' },
      }).as('getProject');

      cy.intercept('PUT', '**/projects/1', {
        statusCode: 200,
        body: { ...mockProjects[0], name: 'Updated Project Name' },
      }).as('updateProject');

      cy.visit('/projects/1');
      cy.wait('@getProject');
      cy.get('[data-testid="edit-project"]').click();
      cy.get('input[placeholder="My Awesome Project"]').clear().type('Updated Project Name');
      cy.get('button[type="submit"]').click();
      cy.wait('@updateProject');
      cy.contains('Updated Project Name').should('be.visible');
    });

    it('should allow deleting a project', () => {
      cy.intercept('GET', '**/projects/1', {
        statusCode: 200,
        body: { ...mockProjects[0], ownerId: '1' },
      }).as('getProject');

      cy.intercept('DELETE', '**/projects/1', {
        statusCode: 204,
      }).as('deleteProject');

      cy.visit('/projects/1');
      cy.wait('@getProject');
      cy.get('[data-testid="delete-project"]').click();
      cy.contains('button', 'Confirm').click();
      cy.wait('@deleteProject');
      cy.url().should('include', '/dashboard');
    });
  });
});
