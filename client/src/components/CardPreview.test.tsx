import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardPreview } from './CardPreview';
import { makeCard } from '../test/fixtures';

describe('CardPreview', () => {
  it('renders nothing when card is null', () => {
    const { container } = render(<CardPreview card={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the card name and description', () => {
    render(<CardPreview card={makeCard({ name: 'Big Sword', description: 'Cuts everything.' })} onClose={vi.fn()} />);
    expect(screen.getByText('Big Sword')).toBeInTheDocument();
    expect(screen.getByText('Cuts everything.')).toBeInTheDocument();
  });

  it('shows monster details', () => {
    const monster = makeCard({ type: 'monster', deck: 'door', name: 'Dragon', level: 18, treasures: 4, levelsAwarded: 3, badStuff: 'death' });
    render(<CardPreview card={monster} onClose={vi.fn()} />);
    expect(screen.getByText(/Nível 18/)).toBeInTheDocument();
    expect(screen.getByText(/4 tesouros/)).toBeInTheDocument();
    expect(screen.getByText('death')).toBeInTheDocument();
  });

  it('shows item bonus and value', () => {
    const item = makeCard({ name: 'Sword', bonus: 3, value: 500 });
    render(<CardPreview card={item} onClose={vi.fn()} />);
    expect(screen.getByText(/\+3/)).toBeInTheDocument();
    expect(screen.getByText(/500gp/)).toBeInTheDocument();
  });

  it('shows BIG label when bigItem', () => {
    const item = makeCard({ bigItem: true });
    render(<CardPreview card={item} onClose={vi.fn()} />);
    expect(screen.getByText(/GRANDE/)).toBeInTheDocument();
  });

  it('shows one-shot combat bonus', () => {
    const c = makeCard({ type: 'oneShot', combatBonus: 5 });
    render(<CardPreview card={c} onClose={vi.fn()} />);
    expect(screen.getByText(/\+5 no combate/)).toBeInTheDocument();
  });

  it('close button triggers onClose', () => {
    const onClose = vi.fn();
    render(<CardPreview card={makeCard()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/fechar/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop closes', () => {
    const onClose = vi.fn();
    render(<CardPreview card={makeCard()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking inside the card does not close', () => {
    const onClose = vi.fn();
    render(<CardPreview card={makeCard({ name: 'No-close' })} onClose={onClose} />);
    fireEvent.click(screen.getByText('No-close'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('escape key closes', () => {
    const onClose = vi.fn();
    render(<CardPreview card={makeCard()} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders slot info when set', () => {
    const item = makeCard({ slot: 'head' });
    render(<CardPreview card={item} onClose={vi.fn()} />);
    expect(screen.getByText(/Slot: head/)).toBeInTheDocument();
  });
});
