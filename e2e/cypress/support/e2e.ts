// Shared setup for every spec.
import './commands';

// Don't fail tests on uncaught socket.io reconnect noise after the page is gone.
Cypress.on('uncaught:exception', () => false);
