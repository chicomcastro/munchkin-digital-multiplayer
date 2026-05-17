import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerStatus } from './PlayerStatus';
import { makeCard, makePlayer } from '../test/fixtures';
import { t } from '../i18n';

describe('PlayerStatus', () => {
  it('renders name, level and power', () => {
    render(<PlayerStatus player={makePlayer({ name: 'Alice', level: 4, combatPower: 7 })} active />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows online indicator when socketId present', () => {
    render(<PlayerStatus player={makePlayer({ socketId: 's1' })} active={false} />);
    expect(screen.getByText(t.online)).toBeInTheDocument();
  });

  it('shows offline when socketId is null', () => {
    render(<PlayerStatus player={makePlayer({ socketId: null })} active={false} />);
    expect(screen.getByText(t.offline)).toBeInTheDocument();
  });

  it('applies active ring class when active', () => {
    const { container } = render(<PlayerStatus player={makePlayer()} active />);
    expect(container.querySelector('.ring-4')).toBeTruthy();
  });

  it('shows equipped cards when detailed', () => {
    const sword = makeCard({ name: 'Sword' });
    render(
      <PlayerStatus
        player={makePlayer({ equipped: [sword] })}
        active={false}
        detailed
      />,
    );
    expect(screen.getByText('Sword')).toBeInTheDocument();
  });

  it('shows a flavorful empty-state when no equipped cards', () => {
    render(<PlayerStatus player={makePlayer({ equipped: [] })} active={false} detailed />);
    expect(screen.getByText(t.emptyEquipped)).toBeInTheDocument();
  });

  it('fades dead players', () => {
    const { container } = render(
      <PlayerStatus player={makePlayer({ isAlive: false })} active={false} />,
    );
    expect(container.querySelector('.opacity-40')).toBeTruthy();
  });

  it('shows race and class names', () => {
    const race = makeCard({ type: 'race', deck: 'door', name: 'Elf' });
    const klass = makeCard({ type: 'class', deck: 'door', name: 'Warrior' });
    render(
      <PlayerStatus
        player={makePlayer({ race, class: klass })}
        active={false}
      />,
    );
    expect(screen.getByText(/Elf/)).toBeInTheDocument();
    expect(screen.getByText(/Warrior/)).toBeInTheDocument();
  });
});
