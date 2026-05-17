import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../types';
import type { ToastEntry } from '../components/Toast';
import { t } from '../i18n';

let nextId = 0;

/**
 * Watches the log and the player's own stats; emits transient toasts for
 * notable events (level up, defeated a monster, died, etc.).
 *
 * We avoid emitting one toast per log entry — only the "high signal" ones.
 */
export function useToasts(state: GameState | null, myId: string) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const lastLogId = useRef<string | null>(null);
  const lastLevel = useRef<number | null>(null);
  const lastAlive = useRef<boolean>(true);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((c) => c.id !== id));
  }, []);

  const push = useCallback((entry: Omit<ToastEntry, 'id'>) => {
    setToasts((cur) => [...cur, { id: `toast-${++nextId}`, ...entry }]);
  }, []);

  useEffect(() => {
    if (!state) return;
    const me = state.players.find((p) => p.id === myId);

    // Surface level changes (gain or loss)
    if (me) {
      if (lastLevel.current != null && me.level > lastLevel.current) {
        push({ text: t.youLeveledUp(me.level), kind: 'level' });
      }
      // Death banner
      const aliveNow = me.isAlive && me.level > 0;
      void aliveNow; // alive is currently always true; death detected via log
      lastLevel.current = me.level;
      void lastAlive.current;
      lastAlive.current = me.isAlive;
    }

    // Surface notable log entries since last seen
    const log = state.log;
    let start = 0;
    if (lastLogId.current) {
      const idx = log.findIndex((e) => e.id === lastLogId.current);
      if (idx >= 0) start = idx + 1;
    }
    for (let i = start; i < log.length; i++) {
      const entry = log[i]!;
      // Personal events relevant to the viewer
      if (me) {
        const isMine = entry.text.startsWith(me.name);
        if (entry.kind === 'system' && /died/.test(entry.text) && isMine) {
          push({ text: t.youDied, kind: 'death' });
          continue;
        }
        if (entry.kind === 'combat' && /defeated/i.test(entry.text) && isMine && /defeated\s+(\S+)/i.test(entry.text)) {
          const m = entry.text.match(/defeated\s+([^—.]+)/i);
          if (m) push({ text: t.combatWon(m[1]!.trim()), kind: 'combat' });
          continue;
        }
        if (entry.kind === 'system' && /won the game|hit level/i.test(entry.text)) {
          const m = entry.text.match(/^(\S+)/);
          if (m) push({ text: t.gameWon(m[1]!), kind: 'level' });
          continue;
        }
      }
    }
    if (log.length > 0) lastLogId.current = log[log.length - 1]!.id;
  }, [state, myId, push]);

  return { toasts, dismiss };
}
