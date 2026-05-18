import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppBar } from './AppBar';
import { t } from '../i18n';

describe('AppBar', () => {
  function setup(override: Partial<Parameters<typeof AppBar>[0]> = {}) {
    const props = {
      locale: 'pt-BR' as const,
      onLocale: vi.fn(),
      soundEnabled: false,
      onToggleSound: vi.fn(),
      onOpenHelp: vi.fn(),
      onLeave: vi.fn(),
      ...override,
    };
    render(<AppBar {...props} />);
    return props;
  }

  it('renders all four controls', () => {
    setup();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.onboardingHelp })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.toggleSound })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.leave })).toBeInTheDocument();
  });

  it('omits the leave button when no onLeave provided', () => {
    setup({ onLeave: undefined });
    expect(screen.queryByRole('button', { name: t.leave })).not.toBeInTheDocument();
  });

  it('locale picker calls onLocale on change', () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'en' } });
    expect(props.onLocale).toHaveBeenCalledWith('en');
  });

  it('help button calls onOpenHelp', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: t.onboardingHelp }));
    expect(props.onOpenHelp).toHaveBeenCalled();
  });

  it('sound button calls onToggleSound and shows the right icon', () => {
    const props = setup({ soundEnabled: false });
    const btn = screen.getByRole('button', { name: t.toggleSound });
    expect(btn.textContent).toBe('🔇');
    fireEvent.click(btn);
    expect(props.onToggleSound).toHaveBeenCalled();
  });

  it('shows 🔊 when sound is enabled', () => {
    setup({ soundEnabled: true });
    expect(screen.getByRole('button', { name: t.toggleSound }).textContent).toBe('🔊');
  });

  it('leave button calls onLeave', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: t.leave }));
    expect(props.onLeave).toHaveBeenCalled();
  });

  it('renders as a banner landmark', () => {
    setup();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
