import type { LocaleCode } from '../i18n';
import { LOCALES } from '../i18n';
import { t } from '../i18n';

export function AppBar({
  locale,
  onLocale,
  soundEnabled,
  onToggleSound,
  onOpenHelp,
  onLeave,
  onToggleView,
  viewLabel,
}: {
  locale: LocaleCode;
  onLocale: (l: LocaleCode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHelp: () => void;
  onLeave?: () => void;
  onToggleView?: () => void;
  viewLabel?: string;
}) {
  return (
    <div
      role="banner"
      className="fixed top-0 inset-x-0 z-40 h-10 bg-[rgba(15,12,6,0.95)] backdrop-blur-sm border-b border-[rgba(139,90,43,0.3)] flex items-center justify-end gap-2 px-3 text-xs shadow-[0_1px_6px_rgba(251,191,36,0.08)]"
    >
      {onToggleView && viewLabel && (
        <button
          onClick={onToggleView}
          className="mr-auto bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 rounded px-2.5 py-1 text-amber-200 font-bold tracking-wide uppercase text-[10px] transition-colors"
        >
          ⇄ {viewLabel}
        </button>
      )}
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => onLocale(e.target.value as LocaleCode)}
        className="bg-transparent opacity-80 hover:opacity-100 cursor-pointer focus:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="bg-[#1a1208] text-white">
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
        <button onClick={onLeave} className="opacity-60 hover:opacity-100 hover:text-red-300 transition-colors">
          {t.leave}
        </button>
      )}
    </div>
  );
}
