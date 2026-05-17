/// <reference types="cypress" />

const SERVER_URL = Cypress.env('SERVER_URL') || 'http://localhost:3001';

// Full game flow with one visible player (the phone) and one ghost player
// joining the same room from the Node side. UI labels are now PT-BR.

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
    // Pre-mark onboarding seen so it doesn't cover the home for this flow.
    cy.window().then((w) => w.localStorage.setItem('munchkin:onboarding', '1'));
    cy.reload();

    // ----- Home -----
    cy.contains('Munchkin').should('be.visible');
    cy.snapshot('01-home');

    cy.get('input[placeholder="Aventureiro"]').type('Alice');
    cy.contains('button', 'Criar sala').click();

    // ----- Lobby (single creator) -----
    cy.contains(/^MNK-/, { timeout: 15000 }).should('be.visible');
    cy.snapshot('02-lobby-single-player');

    // Quick presets panel.
    cy.contains(/Configurações rápidas/i).should('be.visible');
    cy.snapshot('02b-lobby-presets');

    // Apply a preset in one click.
    cy.contains(/Duelo Longo/).click();
    cy.wait(300);
    cy.snapshot('02c-lobby-preset-applied');

    // Open advanced config and force the long variant (no auto-market, no global timer).
    cy.contains('Mostrar configuração').click();
    cy.contains('Variante').parent().find('select').select('long');

    // Bring in a ghost player from the Node side.
    cy.contains(/^MNK-/).invoke('text').then((text) => {
      const roomCode = text.trim();
      cy.task('ghost:join', { serverUrl: SERVER_URL, roomCode, name: 'Bob' });
    });

    // Wait for the ghost to show up in the UI.
    cy.contains('Bob', { timeout: 15000 }).should('be.visible');
    cy.snapshot('03-lobby-with-ghost');

    // Tweak a config option to demonstrate the controls.
    cy.contains('Sem morte').parent().find('input[type="checkbox"]').check({ force: true });
    cy.snapshot('04-lobby-config-tweaked');

    // Start the game.
    cy.contains('button', /^Iniciar jogo/).should('not.be.disabled').click();

    // ----- PlayerView, Alice's turn -----
    cy.contains('button', 'Chutar porta', { timeout: 15000 }).should('be.visible');
    cy.snapshot('05-player-view-turn-start');

    // Kick the door (likely yields a monster, a curse, or a card into hand).
    cy.contains('button', 'Chutar porta').click();
    cy.wait(600);
    cy.snapshot('06-player-view-after-kick');

    // Either resolve combat or loot the room — whatever the UI offers.
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Resolver combate")').length > 0) {
        cy.contains('button', 'Resolver combate').click();
        cy.wait(500);
        cy.snapshot('07-player-view-combat-resolved');
      } else if ($body.find('button:contains("Saquear")').length > 0) {
        cy.contains('button', 'Saquear').click();
        cy.wait(500);
        cy.snapshot('07-player-view-after-loot');
      }
    });

    // End the turn.
    cy.contains('button', 'Encerrar turno').click();
    cy.wait(600);
    cy.snapshot('08-player-view-turn-ended');

    // Toggle to BoardView.
    cy.contains('button', /modo tabuleiro/i).click();
    cy.contains(/Vez de:/i, { timeout: 15000 }).should('be.visible');
    cy.snapshot('09-board-mode');

    // Capture board view in a tablet/notebook-sized viewport — this is the
    // intended layout for the shared screen, which the mobile viewport hides.
    cy.viewport(1280, 800);
    cy.snapshot('09b-board-mode-landscape');
    cy.viewport(414, 896);

    // Toggle back.
    cy.contains('button', /modo jogador/i).click();
    cy.contains('Chutar porta').should('be.visible');
    cy.snapshot('10-player-mode-again');
  });

  it('shows the onboarding modal on first visit', () => {
    cy.visit('/');
    cy.cleanState();
    cy.reload();
    cy.contains(/Bem-vindo ao Munchkin/i).should('be.visible');
    cy.snapshot('13-onboarding-step-1');
    cy.contains('button', /Próximo/i).click();
    cy.snapshot('14-onboarding-step-2');
    cy.contains('button', /Próximo/i).click();
    cy.snapshot('15-onboarding-step-3');
    cy.contains('button', /Começar/i).click();
    cy.contains(/Bem-vindo ao Munchkin/i).should('not.exist');
  });

  it('Home: validates name and room code', () => {
    cy.visit('/');
    cy.cleanState();
    cy.window().then((w) => {
      w.localStorage.setItem('munchkin:onboarding', '1');
      w.localStorage.setItem('munchkin:locale', 'pt-BR');
    });
    cy.reload();

    cy.contains('button', 'Criar sala').click();
    cy.contains(/escolha um nome/i).should('be.visible');
    cy.snapshot('11-home-name-error');

    cy.get('input[placeholder="Aventureiro"]').type('Alice');
    cy.contains('button', 'Entrar na sala').click();
    cy.contains(/digite o código/i).should('be.visible');
    cy.snapshot('12-home-code-error');
  });

  it('language picker switches strings live', () => {
    cy.visit('/');
    cy.cleanState();
    cy.window().then((w) => w.localStorage.setItem('munchkin:onboarding', '1'));
    cy.reload();

    cy.contains('Criar sala').should('be.visible');
    cy.snapshot('16-home-pt');

    cy.get('select[aria-label="Language"]').select('en');
    cy.contains('Create room').should('be.visible');
    cy.snapshot('17-home-en');

    cy.get('select[aria-label="Language"]').select('es');
    cy.contains('Crear sala').should('be.visible');
    cy.snapshot('18-home-es');
  });

  it('deep-link prefills the join code field', () => {
    cy.visit('/?code=MNK-XYZ');
    cy.cleanState();
    cy.window().then((w) => w.localStorage.setItem('munchkin:onboarding', '1'));
    cy.visit('/?code=MNK-XYZ');
    cy.get('input[placeholder="MNK-XXX"]').should('have.value', 'MNK-XYZ');
    cy.snapshot('19-home-deep-link');
  });
});
