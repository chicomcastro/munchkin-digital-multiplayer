import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockSocket, resetMockSocket } from '../test/mockSocket';
import { PlayerView } from './PlayerView';
import { makeCard, makeCombat, makeState } from '../test/fixtures';
import { t } from '../i18n';

beforeEach(() => {
  resetMockSocket();
});

describe('PlayerView', () => {
  function renderView(state = makeState(), hand = [makeCard()], fist: any[] = []) {
    return render(
      <PlayerView state={state} hand={hand} fist={fist} myId="p1" onBoardMode={vi.fn()} />,
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

  it('clicking board mode triggers callback', () => {
    const cb = vi.fn();
    render(<PlayerView state={makeState()} hand={[]} fist={[]} myId="p1" onBoardMode={cb} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.boardMode, 'i') }));
    expect(cb).toHaveBeenCalled();
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
});
