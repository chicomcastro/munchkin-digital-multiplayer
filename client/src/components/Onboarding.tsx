import { useEffect, useState } from 'react';
import { t } from '../i18n';

const STORAGE_KEY = 'munchkin:onboarding';

interface Step {
  emoji: string;
  title: string;
  body: string;
}

function buildSteps(): Step[] {
  // Computed each render so the modal honors the active locale.
  return [
    { emoji: '🎲', title: t.onboardingTitle1, body: t.onboardingBody1 },
    { emoji: '🔁', title: t.onboardingTitle2, body: t.onboardingBody2 },
    { emoji: '⚔️', title: t.onboardingTitle3, body: t.onboardingBody3 },
  ];
}

function hasSeen(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; }
  catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1'); }
  catch {}
}

/**
 * 3-step welcome modal. Shows on first visit only. Includes a help icon
 * the caller can wire to re-open the modal.
 */
export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;
  const steps = buildSteps();
  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.onboardingTitle1}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 anim-fade"
    >
      <div className="card-shell p-6 w-full max-w-sm relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-xs opacity-60 hover:opacity-100"
        >
          {t.onboardingSkip}
        </button>
        <div className="text-center text-6xl mb-3" aria-hidden="true">{current.emoji}</div>
        <div className="text-xl font-bold text-amber-300 text-center">{current.title}</div>
        <div className="text-sm opacity-80 mt-3 leading-relaxed text-center">{current.body}</div>

        <div className="flex justify-center gap-1.5 mt-5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={[
                'w-2 h-2 rounded-full transition-colors',
                i === step ? 'bg-amber-400' : 'bg-slate-600',
              ].join(' ')}
            />
          ))}
        </div>

        <button
          className="btn-primary w-full mt-5"
          onClick={() => {
            if (last) {
              markSeen();
              onClose();
            } else {
              setStep(step + 1);
            }
          }}
        >
          {last ? t.onboardingDone : t.onboardingNext}
        </button>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(): boolean {
  return !hasSeen();
}

export function resetOnboarding() {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch {}
}
