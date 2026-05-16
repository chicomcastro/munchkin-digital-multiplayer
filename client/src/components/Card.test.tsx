import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardView } from './Card';
import { makeCard } from '../test/fixtures';

describe('CardView', () => {
  it('renders the card name and type', () => {
    render(<CardView card={makeCard({ name: 'Big Sword' })} />);
    expect(screen.getByText('Big Sword')).toBeInTheDocument();
    expect(screen.getByText('item')).toBeInTheDocument();
  });

  it('shows monster level', () => {
    render(<CardView card={makeCard({ type: 'monster', deck: 'door', level: 7, bonus: undefined })} />);
    expect(screen.getByText(/lv\s*7/i)).toBeInTheDocument();
  });

  it('shows item bonus', () => {
    render(<CardView card={makeCard({ bonus: 3 })} />);
    expect(screen.getByText(/\+3/)).toBeInTheDocument();
  });

  it('hides description when compact', () => {
    render(<CardView card={makeCard({ description: 'Long description here' })} compact />);
    expect(screen.queryByText('Long description here')).not.toBeInTheDocument();
  });

  it('shows description when not compact', () => {
    render(<CardView card={makeCard({ description: 'Long description here' })} />);
    expect(screen.getByText('Long description here')).toBeInTheDocument();
  });

  it('renders BIG badge for big items', () => {
    render(<CardView card={makeCard({ bigItem: true })} />);
    expect(screen.getByText('BIG')).toBeInTheDocument();
  });

  it('renders value badge', () => {
    render(<CardView card={makeCard({ value: 500 })} />);
    expect(screen.getByText(/500gp/)).toBeInTheDocument();
  });

  it('omits slot badge when slot is none', () => {
    render(<CardView card={makeCard({ slot: 'none' })} />);
    expect(screen.queryByText('none')).not.toBeInTheDocument();
  });

  it('triggers onClick', () => {
    const click = vi.fn();
    render(<CardView card={makeCard()} onClick={click} />);
    fireEvent.click(screen.getByText('Sword'));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('disabled card does not fire onClick', () => {
    const click = vi.fn();
    render(<CardView card={makeCard()} onClick={click} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(click).not.toHaveBeenCalled();
  });

  it('applies a selected ring class', () => {
    const { container } = render(<CardView card={makeCard()} selected />);
    expect(container.querySelector('.ring-4')).toBeTruthy();
  });

  it('uses a different color class for each card type', () => {
    const types = ['monster', 'curse', 'race', 'class', 'item', 'oneShot', 'levelUp', 'helper'] as const;
    for (const t of types) {
      const { container } = render(<CardView card={makeCard({ type: t })} />);
      expect(container.firstChild).toBeTruthy();
    }
  });
});
