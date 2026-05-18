import type { LocaleCode } from '../i18n';
import { LOCALES } from '../i18n';
import { t } from '../i18n';

/**
 * Global app bar: locale picker, help, sound, leave. Fixed at the top of
 * the viewport, full-width. Replaces the previous floating icon stack that
 * overlapped screen headers.
 */
export function AppBar({
  locale,
  onLocale,
  soundEnabled,
  onToggleSound,
  onOpenHelp,
  onLeave,
}: {
  locale: LocaleCode;
  onLocale: (l: LocaleCode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHelp: () => void;
  onLeave?: () => void;
}) {
  return (
    <div
      role="banner"
      className="fixed top-0 inset-x-0 z-40 h-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 flex items-center justify-end gap-3 px-3 text-xs"
    >
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => onLocale(e.target.value as LocaleCode)}
        className="bg-transparent opacity-80 hover:opacity-100 cursor-pointer focus:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="bg-slate-900 text-white">
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <button
        onClick={onOpenHelp}
        className="opacity-70 hover:opacity-100"
        aria-label={t.onboardingHelp}
        title={t.onboardingHelp}
      >
        ❓
      </button>
      <button
        onClick={onToggleSound}
        className="opacity-70 hover:opacity-100"
        aria-label={t.toggleSound}
        title={soundEnabled ? t.soundOn : t.soundOff}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      {onLeave && (
        <button onClick={onLeave} className="opacity-60 hover:opacity-100 underline">
          {t.leave}
        </button>
      )}
    </div>
  );
}
