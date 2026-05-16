/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Take a labelled screenshot tagged with the spec name. */
      snapshot(name: string): Chainable<void>;
      /** Clear localStorage on the client origin. */
      cleanState(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('snapshot', (name: string) => {
  cy.screenshot(name, { capture: 'viewport', overwrite: true });
});

Cypress.Commands.add('cleanState', () => {
  cy.window().then((w) => {
    w.localStorage.clear();
  });
});

export {};
