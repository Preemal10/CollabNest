/// <reference types="cypress" />

describe('Kanban Board', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
  };

  const mockProject = {
    id: '1',
    name: 'Project Alpha',
    description: 'Test project with board',
    ownerId: '1',
  };

  const mockColumns = [
    { id: 'col-1', name: 'To Do', order: 0 },
    { id: 'col-2', name: 'In Progress', order: 1 },
    { id: 'col-3', name: 'Done', order: 2 },
  ];

  const mockTasks = [
    { id: 'task-1', title: 'Task 1', description: 'First task', columnId: 'col-1', order: 0 },
    { id: 'task-2', title: 'Task 2', description: 'Second task', columnId: 'col-1', order: 1 },
    { id: 'task-3', title: 'Task 3', description: 'Third task', columnId: 'col-2', order: 0 },
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

    // Mock project data
    cy.intercept('GET', '**/projects/1', {
      statusCode: 200,
      body: mockProject,
    }).as('getProject');

    // Mock board data
    cy.intercept('GET', '**/projects/1/board', {
      statusCode: 200,
      body: { columns: mockColumns, tasks: mockTasks },
    }).as('getBoard');

    cy.login(testUser.email, testUser.password);
    cy.wait('@loginRequest');
  });

  describe('Board Display', () => {
    it('should display kanban board with columns', () => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');
      cy.contains('To Do').should('be.visible');
      cy.contains('In Progress').should('be.visible');
      cy.contains('Done').should('be.visible');
    });

    it('should display tasks in correct columns', () => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');

      // Check To Do column has Task 1 and Task 2
      cy.get('[data-testid="column-col-1"]').within(() => {
        cy.contains('Task 1').should('be.visible');
        cy.contains('Task 2').should('be.visible');
      });

      // Check In Progress column has Task 3
      cy.get('[data-testid="column-col-2"]').within(() => {
        cy.contains('Task 3').should('be.visible');
      });

      // Check Done column is empty
      cy.get('[data-testid="column-col-3"]').within(() => {
        cy.get('[data-testid^="task-"]').should('not.exist');
      });
    });

    it('should show task count in column headers', () => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');
      cy.get('[data-testid="column-col-1"]').contains('2').should('be.visible');
      cy.get('[data-testid="column-col-2"]').contains('1').should('be.visible');
    });
  });

  describe('Task Interactions', () => {
    beforeEach(() => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');
    });

    it('should open task details on click', () => {
      cy.contains('Task 1').click();
      cy.get('[data-testid="task-modal"]').should('be.visible');
      cy.contains('First task').should('be.visible');
    });

    it('should create a new task', () => {
      const newTask = {
        id: 'task-4',
        title: 'New Task',
        description: 'A new task',
        columnId: 'col-1',
        order: 2,
      };

      cy.intercept('POST', '**/projects/1/tasks', {
        statusCode: 201,
        body: newTask,
      }).as('createTask');

      cy.get('[data-testid="column-col-1"]').within(() => {
        cy.get('[data-testid="add-task"]').click();
      });

      cy.get('[data-testid="task-form"]').within(() => {
        cy.get('input[name="title"]').type(newTask.title);
        cy.get('textarea[name="description"]').type(newTask.description);
        cy.get('button[type="submit"]').click();
      });

      cy.wait('@createTask');
      cy.contains('New Task').should('be.visible');
    });

    it('should edit a task', () => {
      cy.intercept('PUT', '**/tasks/task-1', {
        statusCode: 200,
        body: { ...mockTasks[0], title: 'Updated Task 1' },
      }).as('updateTask');

      cy.contains('Task 1').click();
      cy.get('[data-testid="edit-task"]').click();
      cy.get('input[name="title"]').clear().type('Updated Task 1');
      cy.get('button[type="submit"]').click();
      cy.wait('@updateTask');
      cy.contains('Updated Task 1').should('be.visible');
    });

    it('should delete a task', () => {
      cy.intercept('DELETE', '**/tasks/task-1', {
        statusCode: 204,
      }).as('deleteTask');

      cy.contains('Task 1').click();
      cy.get('[data-testid="delete-task"]').click();
      cy.contains('button', 'Confirm').click();
      cy.wait('@deleteTask');
      cy.contains('Task 1').should('not.exist');
    });

    it('should close task modal on escape key', () => {
      cy.contains('Task 1').click();
      cy.get('[data-testid="task-modal"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[data-testid="task-modal"]').should('not.exist');
    });
  });

  describe('Drag and Drop', () => {
    beforeEach(() => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');
    });

    it('should move task to different column', () => {
      cy.intercept('PUT', '**/tasks/task-1', {
        statusCode: 200,
        body: { ...mockTasks[0], columnId: 'col-2' },
      }).as('moveTask');

      // Simulate drag and drop
      cy.get('[data-testid="task-task-1"]')
        .trigger('dragstart', { dataTransfer: new DataTransfer() });

      cy.get('[data-testid="column-col-2"]')
        .trigger('dragover')
        .trigger('drop', { dataTransfer: new DataTransfer() });

      cy.get('[data-testid="task-task-1"]').trigger('dragend');

      cy.wait('@moveTask');

      // Verify task moved to new column
      cy.get('[data-testid="column-col-2"]').within(() => {
        cy.contains('Task 1').should('be.visible');
      });
    });

    it('should reorder tasks within same column', () => {
      cy.intercept('PUT', '**/tasks/task-2', {
        statusCode: 200,
        body: { ...mockTasks[1], order: 0 },
      }).as('reorderTask');

      // Drag Task 2 above Task 1
      cy.get('[data-testid="task-task-2"]')
        .trigger('dragstart', { dataTransfer: new DataTransfer() });

      cy.get('[data-testid="task-task-1"]')
        .trigger('dragover')
        .trigger('drop', { dataTransfer: new DataTransfer() });

      cy.get('[data-testid="task-task-2"]').trigger('dragend');

      cy.wait('@reorderTask');
    });
  });

  describe('Column Management', () => {
    beforeEach(() => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');
    });

    it('should add a new column', () => {
      const newColumn = { id: 'col-4', name: 'Review', order: 3 };

      cy.intercept('POST', '**/projects/1/columns', {
        statusCode: 201,
        body: newColumn,
      }).as('createColumn');

      cy.get('[data-testid="add-column"]').click();
      cy.get('input[name="columnName"]').type('Review');
      cy.get('button[type="submit"]').click();
      cy.wait('@createColumn');
      cy.contains('Review').should('be.visible');
    });

    it('should rename a column', () => {
      cy.intercept('PUT', '**/columns/col-1', {
        statusCode: 200,
        body: { ...mockColumns[0], name: 'Backlog' },
      }).as('renameColumn');

      cy.get('[data-testid="column-col-1"]').within(() => {
        cy.get('[data-testid="column-menu"]').click();
      });
      cy.contains('Rename').click();
      cy.get('input[name="columnName"]').clear().type('Backlog');
      cy.get('button[type="submit"]').click();
      cy.wait('@renameColumn');
      cy.contains('Backlog').should('be.visible');
    });

    it('should delete a column', () => {
      cy.intercept('DELETE', '**/columns/col-3', {
        statusCode: 204,
      }).as('deleteColumn');

      cy.get('[data-testid="column-col-3"]').within(() => {
        cy.get('[data-testid="column-menu"]').click();
      });
      cy.contains('Delete').click();
      cy.contains('button', 'Confirm').click();
      cy.wait('@deleteColumn');
      cy.contains('Done').should('not.exist');
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(() => {
      cy.visit('/projects/1/board');
      cy.wait('@getBoard');
    });

    it('should filter tasks by search query', () => {
      cy.get('[data-testid="search-tasks"]').type('Task 1');
      cy.contains('Task 1').should('be.visible');
      cy.contains('Task 2').should('not.be.visible');
      cy.contains('Task 3').should('not.be.visible');
    });

    it('should clear search filter', () => {
      cy.get('[data-testid="search-tasks"]').type('Task 1');
      cy.get('[data-testid="clear-search"]').click();
      cy.contains('Task 1').should('be.visible');
      cy.contains('Task 2').should('be.visible');
      cy.contains('Task 3').should('be.visible');
    });
  });
});
