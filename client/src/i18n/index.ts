// Public i18n surface. Components keep doing `import { t, cardTypeLabels } from '../i18n'`.
//
// Locale switching: setLocale(loc) mutates the exported binding via ESM live-binding.
// Subscribers (`subscribe`) are notified so React can re-render via a useState + useEffect.
// See useLocale() in hooks/useLocale.ts for the reactive wrapper.

import { en } from './en';
import { es } from './es';
import { ptBR } from './pt-BR';
import { LOCALES, type LocaleCode, type Translations } from './types';

export type { Translations, LocaleCode } from './types';
export { LOCALES } from './types';

const DICTIONARIES: Record<LocaleCode, Translations> = {
  'pt-BR': ptBR,
  en,
  es,
};

const STORAGE_KEY = 'munchkin:locale';

function detectLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && DICTIONARIES[stored]) return stored;
  } catch { /* localStorage unavailable */ }
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language ?? 'en';
    if (nav.startsWith('pt')) return 'pt-BR';
    if (nav.startsWith('es')) return 'es';
  }
  return 'en';
}

let currentLocale: LocaleCode = detectLocale();

// `t` and `cardTypeLabels` / `variantLabels` are LIVE BINDINGS — re-exporting
// them with `let` lets us reassign on setLocale and importers see the change.
export let t: Translations = DICTIONARIES[currentLocale];
export let cardTypeLabels: Translations['cardTypeLabels'] = t.cardTypeLabels;
export let variantLabels: Translations['variantLabels'] = t.variantLabels;

const subscribers = new Set<() => void>();

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function setLocale(loc: LocaleCode): void {
  if (!DICTIONARIES[loc]) return;
  currentLocale = loc;
  t = DICTIONARIES[loc];
  cardTypeLabels = t.cardTypeLabels;
  variantLabels = t.variantLabels;
  try { localStorage.setItem(STORAGE_KEY, loc); } catch {}
  for (const fn of subscribers) fn();
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export const locales = LOCALES;
