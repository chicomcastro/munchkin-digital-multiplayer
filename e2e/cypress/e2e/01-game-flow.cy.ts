/// <reference types="cypress" />

const SERVER_URL = Cypress.env('SERVER_URL') || 'http://localhost:3001';

// Full game flow with one visible player (the phone) and one ghost player
// joining the same room from the Node side. This both validates multiplayer
// behavior and produces the per-screen visual catalog.

describe('Munchkin — full game flow', () => {
  beforeEach(() => {
    cy.task('ghost:disconnectAll');
  });

  after(() => {
    cy.task('ghost:disconnectAll');
  });

  it('walks through Home → Lobby → PlayerView → BoardView', () => {
    cy.visit('/');
    cy.cleanState();
    cy.reload();

    // ----- Home -----
    cy.contains('Munchkin').should('be.visible');
    cy.snapshot('01-home');

    cy.get('input[placeholder="Adventurer"]').type('Alice');
    cy.contains('button', 'Create room').click();

    // ----- Lobby (single creator) -----
    cy.contains(/^MNK-/, { timeout: 15000 }).should('be.visible');
    cy.snapshot('02-lobby-single-player');

    // Pick the long variant (no auto-market, no auto-listen, no global timer).
    cy.contains('Variant').parent().find('select').select('long');

    // Bring in a ghost player from the Node side.
    cy.contains(/^MNK-/).invoke('text').then((text) => {
      const roomCode = text.trim();
      cy.task('ghost:join', { serverUrl: SERVER_URL, roomCode, name: 'Bob' });
    });

    // Wait for the ghost to show up in the UI.
    cy.contains('Bob', { timeout: 15000 }).should('be.visible');
    cy.snapshot('03-lobby-with-ghost');

    // Tweak a config option to demonstrate the controls.
    cy.contains('No death').parent().find('input[type="checkbox"]').check({ force: true });

    cy.snapshot('04-lobby-config-tweaked');

    // Start the game.
    cy.contains('button', /^Start game/).should('not.be.disabled').click();

    // ----- PlayerView, Alice's turn -----
    cy.contains('button', 'Kick door', { timeout: 15000 }).should('be.visible');
    cy.snapshot('05-player-view-turn-start');

    // Kick the door (likely yields a monster, a curse, or a card into hand).
    cy.contains('button', 'Kick door').click();
    cy.wait(600);
    cy.snapshot('06-player-view-after-kick');

    // Either resolve combat or loot the room — whatever the UI offers.
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Resolve combat")').length > 0) {
        cy.contains('button', 'Resolve combat').click();
        cy.wait(500);
        cy.snapshot('07-player-view-combat-resolved');
      } else if ($body.find('button:contains("Loot room")').length > 0) {
        cy.contains('button', 'Loot room').click();
        cy.wait(500);
        cy.snapshot('07-player-view-after-loot');
      }
    });

    // End the turn.
    cy.contains('button', 'End turn').click();
    cy.wait(600);
    cy.snapshot('08-player-view-turn-ended');

    // Toggle to BoardView.
    cy.contains('button', /board mode/i).click();
    cy.contains(/Active/i, { timeout: 15000 }).should('be.visible');
    cy.snapshot('09-board-mode');

    // Toggle back.
    cy.contains('button', /player mode/i).click();
    cy.contains('Kick door').should('be.visible');
    cy.snapshot('10-player-mode-again');
  });

  it('Home: validates name and room code', () => {
    cy.visit('/');
    cy.cleanState();
    cy.reload();

    cy.contains('button', 'Create room').click();
    cy.contains(/choose a name/i).should('be.visible');
    cy.snapshot('11-home-name-error');

    cy.get('input[placeholder="Adventurer"]').type('Alice');
    cy.contains('button', 'Join room').click();
    cy.contains(/enter a room code/i).should('be.visible');
    cy.snapshot('12-home-code-error');
  });
});
