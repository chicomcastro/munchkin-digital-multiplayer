import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombatArena } from './CombatArena';
import { makeCard, makeCombat, makePlayer } from '../test/fixtures';

describe('CombatArena', () => {
  it('renders monster and player powers', () => {
    render(<CombatArena combat={makeCombat({ playerPower: 8, monsterPower: 5 })} players={[makePlayer()]} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('says players are winning when ahead', () => {
    render(<CombatArena combat={makeCombat({ playerPower: 8, monsterPower: 5 })} players={[makePlayer()]} />);
    expect(screen.getByText(/winning/i)).toBeInTheDocument();
  });

  it('says monsters are winning when behind', () => {
    render(<CombatArena combat={makeCombat({ playerPower: 2, monsterPower: 5 })} players={[makePlayer()]} />);
    expect(screen.getByText(/monsters are winning/i)).toBeInTheDocument();
  });

  it('shows resolved result label', () => {
    render(
      <CombatArena
        combat={makeCombat({ resolved: true, result: 'victory' })}
        players={[makePlayer()]}
      />,
    );
    expect(screen.getByText(/result/i)).toBeInTheDocument();
    expect(screen.getByText(/VICTORY/)).toBeInTheDocument();
  });

  it('includes the ally name when alliedPlayerId is set', () => {
    const players = [makePlayer({ id: 'p1', name: 'Alice' }), makePlayer({ id: 'p2', name: 'Bob' })];
    render(<CombatArena combat={makeCombat({ alliedPlayerId: 'p2' })} players={players} />);
    expect(screen.getByText(/Alice \+ Bob/)).toBeInTheDocument();
  });

  it('renders played-card icons on both sides', () => {
    const playerCard = makeCard({ id: 'pc', name: 'Potion' });
    const monsterCard = makeCard({ id: 'mc', name: 'Curse' });
    const combat = makeCombat({
      cardsPlayedThisRound: [
        { playerId: 'p1', card: playerCard, side: 'player' },
        { playerId: 'p2', card: monsterCard, side: 'monster' },
      ],
    });
    render(<CombatArena combat={combat} players={[makePlayer()]} />);
    expect(screen.getByText('Potion')).toBeInTheDocument();
    expect(screen.getByText('Curse')).toBeInTheDocument();
  });
});
