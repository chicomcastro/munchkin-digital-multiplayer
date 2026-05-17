import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Onboarding, shouldShowOnboarding, resetOnboarding } from './Onboarding';
import { t } from '../i18n';

beforeEach(() => {
  localStorage.clear();
});

describe('Onboarding', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Onboarding open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the first step when open', () => {
    render(<Onboarding open onClose={vi.fn()} />);
    expect(screen.getByText(t.onboardingTitle1)).toBeInTheDocument();
  });

  it('advances steps with the next button', () => {
    render(<Onboarding open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.onboardingNext }));
    expect(screen.getByText(t.onboardingTitle2)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t.onboardingNext }));
    expect(screen.getByText(t.onboardingTitle3)).toBeInTheDocument();
  });

  it('on the last step the button reads "Começar" and closes + marks seen', () => {
    const close = vi.fn();
    render(<Onboarding open onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: t.onboardingNext }));
    fireEvent.click(screen.getByRole('button', { name: t.onboardingNext }));
    fireEvent.click(screen.getByRole('button', { name: t.onboardingDone }));
    expect(close).toHaveBeenCalled();
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('skip button closes without advancing', () => {
    const close = vi.fn();
    render(<Onboarding open onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: t.onboardingSkip }));
    expect(close).toHaveBeenCalled();
  });

  it('shouldShowOnboarding reflects localStorage', () => {
    expect(shouldShowOnboarding()).toBe(true);
    localStorage.setItem('munchkin:onboarding', '1');
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('resetOnboarding clears the seen flag', () => {
    localStorage.setItem('munchkin:onboarding', '1');
    resetOnboarding();
    expect(shouldShowOnboarding()).toBe(true);
  });
});
