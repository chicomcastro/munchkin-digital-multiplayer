import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockSocket, resetMockSocket } from '../test/mockSocket';
import { PlayerView } from './PlayerView';
import { makeCard, makeCombat, makePlayer, makeState } from '../test/fixtures';
import { t } from '../i18n';

beforeEach(() => {
  resetMockSocket();
});

describe('PlayerView', () => {
  function renderView(state = makeState(), hand = [makeCard()], fist: any[] = []) {
    return render(
      <PlayerView state={state} hand={hand} fist={fist} myId="p1" />,
    );
  }

  it('renders status header with room code, turn, and player info', () => {
    renderView();
    expect(screen.getByText(/MNK-AAA/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${t.turn} 1`))).toBeInTheDocument();
  });

  it('disables kick door when not active', () => {
    const state = makeState({ activePlayerId: 'p2' });
    renderView(state);
    expect(screen.getByRole('button', { name: new RegExp(t.kickDoor) })).toBeDisabled();
  });

  it('emits kickDoor when active', async () => {
    mockSocket.queueAck('game:kickDoor', { ok: true });
    renderView();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.kickDoor) }));
    await waitFor(() => expect(mockSocket.lastEmit('game:kickDoor')).toBeTruthy());
  });

  it('emits listenDoor button when feature enabled', async () => {
    mockSocket.queueAck('game:listenDoor', { ok: true });
    renderView();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.listen) }));
    await waitFor(() => expect(mockSocket.lastEmit('game:listenDoor')).toBeTruthy());
  });

  it('emits endTurn', async () => {
    mockSocket.queueAck('game:endTurn', { ok: true });
    renderView();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.endTurn) }));
    await waitFor(() => expect(mockSocket.lastEmit('game:endTurn')).toBeTruthy());
  });

  it('lootRoom only enabled in look phase', () => {
    const state = makeState({ turnPhase: 'lookForTroubleOrLoot' });
    renderView(state);
    expect(screen.getByRole('button', { name: new RegExp(t.lootRoom) })).not.toBeDisabled();
  });

  it('selecting a card shows action panel and equipping emits playCard', async () => {
    mockSocket.queueAck('game:playCard', { ok: true });
    const c = makeCard({ name: 'Long Sword' });
    renderView(makeState(), [c]);
    fireEvent.click(screen.getByText('Long Sword'));
    fireEvent.click(screen.getByRole('button', { name: t.equip }));
    await waitFor(() => {
      expect(mockSocket.lastEmit('game:playCard')?.payload.cardId).toBe(c.id);
    });
  });

  it('selecting a race card shows "Become" action', async () => {
    mockSocket.queueAck('game:playCard', { ok: true });
    const c = makeCard({ type: 'race', deck: 'door', name: 'Elf', slot: undefined, bonus: undefined, value: undefined });
    renderView(makeState(), [c]);
    fireEvent.click(screen.getByText('Elf'));
    fireEvent.click(screen.getByRole('button', { name: t.become }));
    await waitFor(() => expect(mockSocket.lastEmit('game:playCard')).toBeTruthy());
  });

  it('selecting a curse card lets user pick a target', async () => {
    mockSocket.queueAck('game:playCard', { ok: true });
    const c = makeCard({ type: 'curse', deck: 'door', name: 'Bad Curse', special: 'loseLevel', bonus: undefined, value: undefined, slot: undefined });
    renderView(makeState(), [c]);
    fireEvent.click(screen.getByText('Bad Curse'));
    fireEvent.click(screen.getByRole('button', { name: t.castOn }));
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));
    await waitFor(() => {
      const last = mockSocket.lastEmit('game:playCard');
      expect(last?.payload.targetId).toBe('p2');
    });
  });

  it('selling marks total and confirms sell', async () => {
    mockSocket.queueAck('game:sellItems', { ok: true });
    const item = makeCard({ name: 'Gold Sword', value: 1200 });
    renderView(makeState(), [item]);
    fireEvent.click(screen.getByText('Gold Sword'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.markForSale, 'i') }));
    expect(screen.getByText(/Vendendo 1 item/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t.sellForLevels }));
    await waitFor(() => {
      expect(mockSocket.lastEmit('game:sellItems')?.payload.cardIds).toContain(item.id);
    });
  });

  it('shows combat arena and a resolve button when attacker', async () => {
    mockSocket.queueAck('game:resolveCombat', { ok: true });
    const combat = makeCombat({ attackerId: 'p1', playerPower: 7, monsterPower: 4 });
    const state = makeState({ combatState: combat, turnPhase: 'combat' });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.resolveCombat) }));
    await waitFor(() => expect(mockSocket.lastEmit('game:resolveCombat')).toBeTruthy());
  });

  it('shows flee button and emits flee', async () => {
    mockSocket.queueAck('game:flee', { ok: true });
    const combat = makeCombat({ attackerId: 'p1' });
    const state = makeState({ combatState: combat, turnPhase: 'combat' });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.flee) }));
    await waitFor(() => expect(mockSocket.lastEmit('game:flee')).toBeTruthy());
  });

  it('non-combatants see a help button when combat has no ally', async () => {
    mockSocket.queueAck('game:helpInCombat', { ok: true });
    const combat = makeCombat({ attackerId: 'p2' });
    const state = makeState({ activePlayerId: 'p2', combatState: combat, turnPhase: 'combat' });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.helpInCombat) }));
    await waitFor(() => expect(mockSocket.lastEmit('game:helpInCombat')).toBeTruthy());
  });

  it('shows turn timer countdown', () => {
    const state = makeState({ turnTimerEndsAt: Date.now() + 30_000 });
    renderView(state, []);
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
  });


  it('renders fist reserve cards when present', () => {
    const fistCard = makeCard({ name: 'Fist Card' });
    renderView(makeState(), [], [fistCard]);
    expect(screen.getByText('Fist Card')).toBeInTheDocument();
  });

  it('emits fist play on click', async () => {
    mockSocket.queueAck('fist:playCard', { ok: true });
    const fistCard = makeCard({ name: 'Fist Card' });
    renderView(makeState(), [], [fistCard]);
    fireEvent.click(screen.getByText('Fist Card'));
    await waitFor(() => expect(mockSocket.lastEmit('fist:playCard')).toBeTruthy());
  });

  it('look-for-trouble emits monster play', async () => {
    mockSocket.queueAck('game:playCard', { ok: true });
    const m = makeCard({ type: 'monster', deck: 'door', name: 'Bad Beast', level: 2, value: undefined, slot: undefined, bonus: undefined });
    const state = makeState({ turnPhase: 'lookForTroubleOrLoot' });
    renderView(state, [m]);
    fireEvent.click(screen.getByText('Bad Beast'));
    fireEvent.click(screen.getByRole('button', { name: t.lookForTrouble }));
    await waitFor(() => expect(mockSocket.lastEmit('game:playCard')).toBeTruthy());
  });

  it('playing a one-shot into combat works', async () => {
    mockSocket.queueAck('game:playCard', { ok: true });
    const potion = makeCard({ type: 'oneShot', name: 'Magic Missile', combatBonus: 5, value: undefined, slot: undefined, bonus: undefined });
    const combat = makeCombat({ attackerId: 'p1' });
    const state = makeState({ combatState: combat, turnPhase: 'combat' });
    renderView(state, [potion]);
    fireEvent.click(screen.getByText('Magic Missile'));
    fireEvent.click(screen.getByRole('button', { name: t.playIntoCombat }));
    await waitFor(() => expect(mockSocket.lastEmit('game:playCard')).toBeTruthy());
  });

  it('toggling sale selection clears total when unmarked', () => {
    const item = makeCard({ name: 'Gold Sword', value: 1200 });
    renderView(makeState(), [item]);
    fireEvent.click(screen.getByText('Gold Sword'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.markForSale, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.unmarkForSale, 'i') }));
    expect(screen.queryByText(/Vendendo \d+ ite/)).not.toBeInTheDocument();
  });

  it('renders opponents panel with level and power', () => {
    const state = makeState();
    renderView(state, []);
    expect(screen.getByText(t.opponents)).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows a bot badge and difficulty label on bot opponents', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 'p1', name: 'Alice' }),
        makePlayer({ id: 'b1', name: 'Bot 1', isBot: true, botDifficulty: 'hard', socketId: null }),
      ],
      activePlayerId: 'p1',
    });
    renderView(state, []);
    const bot = screen.getByTestId('opponent-b1');
    expect(bot.textContent).toMatch(new RegExp(`${t.bot}.*${t.botDifficultyHard}`, 'i'));
  });

  it('shows a "thinking" indicator when a bot is the active player', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 'p1', name: 'Alice' }),
        makePlayer({ id: 'b1', name: 'Bot 1', isBot: true, botDifficulty: 'normal', socketId: null }),
      ],
      activePlayerId: 'b1',
      phase: 'playing',
    });
    renderView(state, []);
    expect(screen.getByTestId('opponent-thinking-b1')).toBeInTheDocument();
  });

  it('omits the "thinking" indicator when a human is active', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 'p1', name: 'Alice' }),
        makePlayer({ id: 'b1', name: 'Bot 1', isBot: true, botDifficulty: 'normal' }),
      ],
      activePlayerId: 'p1',
    });
    renderView(state, []);
    expect(screen.queryByTestId('opponent-thinking-b1')).toBeNull();
  });

  it('renders deck and discard boxes', () => {
    const state = makeState({ doorDeckSize: 42, treasureDeckSize: 17 });
    renderView(state, []);
    expect(screen.getByText(t.decksLabel)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('shows discard top card name when set', () => {
    const top = makeCard({ name: 'Old Sword', type: 'item' });
    const state = makeState({ treasureDiscardTop: top });
    renderView(state, []);
    expect(screen.getByText('Old Sword')).toBeInTheDocument();
  });

  it('shows the Fist deposit button when a door card is selected and mechanic is on', async () => {
    mockSocket.queueAck('fist:deposit', { ok: true });
    const doorCard = makeCard({ type: 'race', deck: 'door', name: 'Elf', slot: undefined, bonus: undefined, value: undefined });
    const state = makeState({ config: { ...makeState().config, fistMechanicEnabled: true } });
    renderView(state, [doorCard]);
    fireEvent.click(screen.getByText('Elf'));
    const fistBtn = await screen.findByRole('button', { name: new RegExp(t.reserveInFist) });
    fireEvent.click(fistBtn);
    await waitFor(() => expect(mockSocket.lastEmit('fist:deposit')).toBeTruthy());
  });

  it('shows the Thief steal button only for Thieves', () => {
    const me = { ...makeState().players[0]!, class: makeCard({ type: 'class', deck: 'door', name: 'Thief' }) };
    const state = makeState({ players: [me, makeState().players[1]!] });
    renderView(state, []);
    expect(screen.getByRole('button', { name: new RegExp(t.steal) })).toBeInTheDocument();
  });

  it('Thief steal asks for a target and emits game:stealItem', async () => {
    mockSocket.queueAck('game:stealItem', { ok: true });
    const me = { ...makeState().players[0]!, class: makeCard({ type: 'class', deck: 'door', name: 'Thief' }) };
    const state = makeState({ players: [me, makeState().players[1]!] });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.steal) }));
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));
    await waitFor(() => {
      expect(mockSocket.lastEmit('game:stealItem')?.payload.targetId).toBe('p2');
    });
  });

  it('Thief steal cancellable from target selection', () => {
    const me = { ...makeState().players[0]!, class: makeCard({ type: 'class', deck: 'door', name: 'Thief' }) };
    const state = makeState({ players: [me, makeState().players[1]!] });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.steal) }));
    fireEvent.click(screen.getByRole('button', { name: t.cancel }));
    expect(screen.getByRole('button', { name: new RegExp(t.steal) })).toBeInTheDocument();
  });

  it('Cleric panel shows when in combat with undead and emits clericVsUndead', async () => {
    mockSocket.queueAck('game:clericVsUndead', { ok: true });
    const me = { ...makeState().players[0]!, class: makeCard({ type: 'class', deck: 'door', name: 'Cleric' }) };
    const combat = makeCombat({
      attackerId: 'p1',
      monsters: [makeCard({ type: 'monster', deck: 'door', name: 'Undead Horse', level: 4, tags: ['undead'] })],
    });
    const state = makeState({ players: [me, makeState().players[1]!], combatState: combat, turnPhase: 'combat' });
    const discardCard = makeCard({ id: 'c-1', name: 'Discard Me' });
    renderView(state, [discardCard]);
    expect(screen.getAllByText(/Clérigo/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Discard Me' }));
    fireEvent.click(screen.getByRole('button', { name: /\+3/ }));
    await waitFor(() => expect(mockSocket.lastEmit('game:clericVsUndead')).toBeTruthy());
  });

  it('Wizard panel emits wizardCharm when 3 cards selected', async () => {
    mockSocket.queueAck('game:wizardCharm', { ok: true });
    const me = { ...makeState().players[0]!, class: makeCard({ type: 'class', deck: 'door', name: 'Wizard' }) };
    const combat = makeCombat({ attackerId: 'p1' });
    const state = makeState({ players: [me, makeState().players[1]!], combatState: combat, turnPhase: 'combat' });
    const hand = [makeCard({ id: 'w1', name: 'W1' }), makeCard({ id: 'w2', name: 'W2' }), makeCard({ id: 'w3', name: 'W3' })];
    renderView(state, hand);
    fireEvent.click(screen.getByRole('button', { name: 'W1' }));
    fireEvent.click(screen.getByRole('button', { name: 'W2' }));
    fireEvent.click(screen.getByRole('button', { name: 'W3' }));
    fireEvent.click(screen.getByRole('button', { name: '3/3' }));
    await waitFor(() => expect(mockSocket.lastEmit('game:wizardCharm')).toBeTruthy());
  });

  it('Dual-character swap button emits swapCharacter', async () => {
    mockSocket.queueAck('game:swapCharacter', { ok: true });
    const me = {
      ...makeState().players[0]!,
      characters: [{
        level: 3, hand: [], equipped: [], carried: [], race: null, class: null, combatPower: 3,
      }],
    };
    const state = makeState({
      players: [me, makeState().players[1]!],
      config: { ...makeState().config, twoPlayerDualCharacter: true },
    });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.swapCharacter) }));
    await waitFor(() => {
      const last = mockSocket.lastEmit('game:swapCharacter');
      expect(last?.payload.alternateIdx).toBe(0);
    });
  });

  it('Dual-character: characters panel shows both active and alternate with race/class/level/power', () => {
    const base = makeState();
    const me = {
      ...base.players[0]!,
      level: 5,
      combatPower: 9,
      race: makeCard({ type: 'race', deck: 'door', name: 'Elf' }),
      class: makeCard({ type: 'class', deck: 'door', name: 'Wizard' }),
      characters: [{
        level: 3,
        hand: [],
        equipped: [],
        carried: [],
        race: makeCard({ type: 'race', deck: 'door', name: 'Dwarf', id: 'r2' }),
        class: makeCard({ type: 'class', deck: 'door', name: 'Cleric', id: 'c2' }),
        combatPower: 6,
      }],
    };
    const state = makeState({
      players: [me, base.players[1]!],
      config: { ...base.config, twoPlayerDualCharacter: true },
    });
    renderView(state, []);
    const panel = screen.getByTestId('characters-panel');
    expect(panel).toBeInTheDocument();
    // Active row reveals the main character
    const activeRow = screen.getByTestId('character-row-active');
    expect(activeRow).toHaveTextContent('Elf');
    expect(activeRow).toHaveTextContent('Wizard');
    expect(activeRow).toHaveTextContent('5');
    expect(activeRow).toHaveTextContent('9');
    // Alternate row reveals the second character
    const altRow = screen.getByTestId('character-row-alt');
    expect(altRow).toHaveTextContent('Dwarf');
    expect(altRow).toHaveTextContent('Cleric');
    expect(altRow).toHaveTextContent('3');
    expect(altRow).toHaveTextContent('6');
  });

  it('Dual-character: characters panel is hidden when every character is empty (lv 1, no race/class)', () => {
    const base = makeState();
    const me = {
      ...base.players[0]!,
      level: 1,
      race: null,
      class: null,
      equipped: [],
      characters: [{
        level: 1, hand: [], equipped: [], carried: [], race: null, class: null, combatPower: 1,
      }],
    };
    const state = makeState({
      players: [me, base.players[1]!],
      config: { ...base.config, twoPlayerDualCharacter: true },
    });
    renderView(state, []);
    expect(screen.queryByTestId('characters-panel')).not.toBeInTheDocument();
  });

  it('Dual-character: characters panel is hidden when feature disabled', () => {
    const base = makeState();
    const me = {
      ...base.players[0]!,
      characters: [{
        level: 3, hand: [], equipped: [], carried: [], race: null, class: null, combatPower: 3,
      }],
    };
    const state = makeState({
      players: [me, base.players[1]!],
      config: { ...base.config, twoPlayerDualCharacter: false },
    });
    renderView(state, []);
    expect(screen.queryByTestId('characters-panel')).not.toBeInTheDocument();
  });

  it('Dual-character: per-alternate swap button passes correct index', async () => {
    mockSocket.queueAck('game:swapCharacter', { ok: true });
    const base = makeState();
    const me = {
      ...base.players[0]!,
      characters: [
        { level: 2, hand: [], equipped: [], carried: [], race: null, class: null, combatPower: 2 },
        { level: 4, hand: [], equipped: [], carried: [], race: null, class: null, combatPower: 4 },
      ],
    };
    const state = makeState({
      players: [me, base.players[1]!],
      config: { ...base.config, twoPlayerDualCharacter: true },
    });
    renderView(state, []);
    const swapButtons = screen.getAllByRole('button', { name: new RegExp(t.swapCharacter) });
    expect(swapButtons).toHaveLength(2);
    fireEvent.click(swapButtons[1]!);
    await waitFor(() => {
      const last = mockSocket.lastEmit('game:swapCharacter');
      expect(last?.payload.alternateIdx).toBe(1);
    });
  });

  it('shows a game-over overlay and disables action buttons when phase is ended', () => {
    const state = makeState({
      phase: 'ended',
      winnerId: 'p2',
      activePlayerId: 'p1',
      turnPhase: 'lookForTroubleOrLoot',
    });
    renderView(state, []);
    expect(screen.getByTestId('player-game-over')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.gameOver, 'i'))).toBeInTheDocument();
    const loot = screen.getByRole('button', { name: new RegExp(t.lootRoom) });
    expect(loot).toBeDisabled();
    const endTurn = screen.getByRole('button', { name: new RegExp(t.endTurn) });
    expect(endTurn).toBeDisabled();
  });

  it('omits the game-over overlay while the game is still playing', () => {
    renderView(makeState({ phase: 'playing' }), []);
    expect(screen.queryByTestId('player-game-over')).toBeNull();
  });

  it('game-over overlay surfaces the local victory copy when myId is the winner', () => {
    const state = makeState({ phase: 'ended', winnerId: 'p1' });
    renderView(state, []);
    expect(screen.getByText(new RegExp(t.gameWon('Alice')))).toBeInTheDocument();
  });

  it('game-over overlay shows the winning opponent label when a bot wins', () => {
    const state = makeState({ phase: 'ended', winnerId: 'p2' });
    renderView(state, []);
    expect(screen.getByText(new RegExp(t.winner))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(t.gameWon('Alice')))).toBeNull();
  });

  it('clicking an equipped slot opens the card preview modal', () => {
    const sword = makeCard({ id: 'sword1', name: 'Sword', type: 'item', slot: 'hand', bonus: 2 });
    const me = { ...makeState().players[0]!, equipped: [sword] };
    const state = makeState({ players: [me, makeState().players[1]!] });
    renderView(state, []);
    fireEvent.click(screen.getByRole('button', { name: 'Sword' }));
    // CardPreview shows the card name as a heading too
    expect(screen.getAllByText('Sword').length).toBeGreaterThan(1);
  });

  it('clicking an opponent card opens the player detail modal', () => {
    renderView(makeState(), []);
    fireEvent.click(screen.getByTestId('opponent-p2'));
    expect(screen.getByTestId('player-detail-modal-p2')).toBeInTheDocument();
  });

  it('the room-header crumb opens the modal with the current player', () => {
    renderView(makeState(), []);
    fireEvent.click(screen.getByLabelText(t.viewMySet));
    expect(screen.getByTestId('player-detail-modal-p1')).toBeInTheDocument();
  });

  it('the overlay Leave button calls the onLeave callback', () => {
    const state = makeState({ phase: 'ended', winnerId: 'p2' });
    const onLeave = vi.fn();
    render(
      <PlayerView state={state} hand={[]} fist={[]} myId="p1" onLeave={onLeave} />,
    );
    fireEvent.click(screen.getByTestId('player-game-over-leave'));
    expect(onLeave).toHaveBeenCalled();
  });
});
