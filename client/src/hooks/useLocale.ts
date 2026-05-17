import { useEffect, useState, useCallback } from 'react';
import { getLocale, setLocale as set, subscribe, type LocaleCode } from '../i18n';

/**
 * Reactive hook for the current locale. Components calling this re-render
 * whenever setLocale is invoked anywhere in the app.
 */
export function useLocale(): [LocaleCode, (loc: LocaleCode) => void] {
  const [loc, setLoc] = useState<LocaleCode>(() => getLocale());

  useEffect(() => {
    return subscribe(() => setLoc(getLocale()));
  }, []);

  const change = useCallback((next: LocaleCode) => {
    set(next);
  }, []);

  return [loc, change];
}
