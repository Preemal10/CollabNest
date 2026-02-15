/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Register a new user
       * @param name - User's full name
       * @param email - User's email address
       * @param password - User's password
       */
      register(name: string, email: string, password: string): Chainable<void>;

      /**
       * Login a user
       * @param email - User's email address
       * @param password - User's password
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Create a new project
       * @param name - Project name
       * @param description - Project description
       */
      createProject(name: string, description: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('register', (name: string, email: string, password: string) => {
  cy.visit('/register');
  cy.get('#name').type(name);
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('#confirmPassword').type(password);
  cy.get('#terms').check();
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('createProject', (name: string, description: string) => {
  cy.contains('button', 'New').click();
  cy.get('input[placeholder="My Awesome Project"]').clear().type(name);
  cy.get('textarea[placeholder="What\'s this project about?"]').clear().type(description);
  cy.get('button[type="submit"]').click();
});

export {};
