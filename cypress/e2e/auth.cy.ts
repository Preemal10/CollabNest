/// <reference types="cypress" />

describe('Authentication', () => {
  const testUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };

  describe('Registration', () => {
    it('should display registration form', () => {
      cy.visit('/register');
      cy.get('#name').should('be.visible');
      cy.get('#email').should('be.visible');
      cy.get('#password').should('be.visible');
      cy.get('#confirmPassword').should('be.visible');
      cy.get('#terms').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/register');
      cy.get('button[type="submit"]').click();
      cy.get('#name:invalid').should('exist');
    });

    it('should show error when passwords do not match', () => {
      cy.visit('/register');
      cy.get('#name').type(testUser.name);
      cy.get('#email').type(testUser.email);
      cy.get('#password').type(testUser.password);
      cy.get('#confirmPassword').type('DifferentPassword123!');
      cy.get('#terms').check();
      cy.get('button[type="submit"]').click();
      cy.contains('Passwords').should('be.visible');
    });

    it('should successfully register a new user', () => {
      cy.intercept('POST', '**/auth/register').as('registerRequest');
      cy.register(testUser.name, testUser.email, testUser.password);
      cy.wait('@registerRequest');
      cy.url().should('include', '/dashboard');
    });

    it('should navigate to login page from registration', () => {
      cy.visit('/register');
      cy.contains('a', 'Sign in').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Login', () => {
    it('should display login form', () => {
      cy.visit('/login');
      cy.get('#email').should('be.visible');
      cy.get('#password').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      cy.get('button[type="submit"]').click();
      cy.get('#email:invalid').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 401,
        body: { message: 'Invalid credentials' },
      }).as('loginRequest');

      cy.visit('/login');
      cy.get('#email').type('invalid@example.com');
      cy.get('#password').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      cy.wait('@loginRequest');
      cy.contains('Invalid').should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          user: { id: '1', name: testUser.name, email: testUser.email },
          token: 'mock-jwt-token',
        },
      }).as('loginRequest');

      cy.login(testUser.email, testUser.password);
      cy.wait('@loginRequest');
      cy.url().should('include', '/dashboard');
    });

    it('should navigate to registration page from login', () => {
      cy.visit('/login');
      cy.contains('a', 'Sign up').click();
      cy.url().should('include', '/register');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Mock successful login
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          user: { id: '1', name: testUser.name, email: testUser.email },
          token: 'mock-jwt-token',
        },
      }).as('loginRequest');

      cy.login(testUser.email, testUser.password);
      cy.wait('@loginRequest');
    });

    it('should successfully logout user', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.contains('button', 'Logout').click();
      cy.url().should('include', '/login');
    });

    it('should clear session on logout', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.contains('button', 'Logout').click();
      cy.window().its('localStorage').should('be.empty');
    });
  });
});
