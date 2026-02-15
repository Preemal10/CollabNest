/// <reference types="cypress" />

// Import custom commands
import './commands';

// Prevent TypeScript from reading file as legacy script
export {};

// Hide fetch/XHR requests from command log
const app = window.top;
if (app && !app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Global before each hook
beforeEach(() => {
  // Clear local storage before each test
  cy.clearLocalStorage();
});
