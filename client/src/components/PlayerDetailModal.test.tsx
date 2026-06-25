import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerDetailModal } from './PlayerDetailModal';
import { makeCard, makePlayer } from '../test/fixtures';
import { t } from '../i18n';

describe('PlayerDetailModal', () => {
  it('renders nothing when player is null', () => {
    const { container } = render(<PlayerDetailModal player={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows name, level, force and race/class chips', () => {
    const player = makePlayer({
      id: 'p9',
      name: 'Alice',
      level: 5,
      combatPower: 9,
      race: makeCard({ type: 'race', deck: 'door', name: 'Elf' }),
      class: makeCard({ type: 'class', deck: 'door', name: 'Wizard', id: 'c1' }),
    });
    render(<PlayerDetailModal player={player} onClose={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Elf')).toBeInTheDocument();
    expect(screen.getByText('Wizard')).toBeInTheDocument();
  });

  it('renders equipped items in their slots', () => {
    const sword = makeCard({ id: 's1', name: 'Sword', type: 'item', slot: 'hand', bonus: 2 });
    const helmet = makeCard({ id: 'h1', name: 'Horny Helmet', type: 'item', slot: 'head', bonus: 1 });
    const player = makePlayer({ equipped: [sword, helmet] });
    render(<PlayerDetailModal player={player} onClose={vi.fn()} />);
    expect(screen.getByText(t.equipment)).toBeInTheDocument();
    expect(screen.getByText('Sword')).toBeInTheDocument();
    expect(screen.getByText('Horny Helmet')).toBeInTheDocument();
  });

  it('lists carried items separately', () => {
    const cape = makeCard({ id: 'c1', name: 'Heavy Cape', type: 'item' });
    const player = makePlayer({ equipped: [], carried: [cape] });
    render(<PlayerDetailModal player={player} onClose={vi.fn()} />);
    expect(screen.getByText(t.carried)).toBeInTheDocument();
    expect(screen.getByText('Heavy Cape')).toBeInTheDocument();
  });

  it('shows an empty-state when there is nothing equipped or carried', () => {
    const player = makePlayer({ equipped: [], carried: [] });
    render(<PlayerDetailModal player={player} onClose={vi.fn()} />);
    expect(screen.getByText(t.emptyEquipped)).toBeInTheDocument();
  });

  it('close button + backdrop click + Escape all invoke onClose', () => {
    const onClose = vi.fn();
    render(<PlayerDetailModal player={makePlayer()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(t.closePreview));
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('clicking inside the card does not close', () => {
    const onClose = vi.fn();
    const player = makePlayer({ name: 'NoClose' });
    render(<PlayerDetailModal player={player} onClose={onClose} />);
    fireEvent.click(screen.getByText('NoClose'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
