import { useEffect, useRef, useState } from 'react';
import type { CombatState, Player } from '../types';
import { CardView } from './Card';
import { t } from '../i18n';

export function CombatArena({ combat, players }: { combat: CombatState; players: Player[] }) {
  const attacker = players.find((p) => p.id === combat.attackerId);
  const ally = combat.alliedPlayerId ? players.find((p) => p.id === combat.alliedPlayerId) : null;
  const winning = combat.playerPower > combat.monsterPower;
  const total = combat.playerPower + combat.monsterPower || 1;
  const playerPct = Math.round((combat.playerPower / total) * 100);
  const monsterPct = 100 - playerPct;

  // Brief number flash whenever a side's power shifts (boost played, etc.).
  const playerPulse = usePulseOnChange(combat.playerPower);
  const monsterPulse = usePulseOnChange(combat.monsterPower);
  const resolvedPulse = useResolvedPulse(combat.resolved, combat.result);

  return (
    <div className={['surface-glass p-4 transition-shadow duration-500', resolvedPulse].join(' ')}>
      <div className="text-center text-xs uppercase tracking-widest opacity-60 font-display">{t.combat}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 mt-3 items-stretch">
        <div className={[
          'rounded-xl bg-amber-950/40 p-3 border transition-colors duration-500',
          winning ? 'border-emerald-400/60 shadow-[0_0_18px_rgba(52,211,153,0.18)]' : 'border-amber-900/30',
        ].join(' ')}>
          <div className="text-xs opacity-60">{t.playerSide}</div>
          <div className={['text-3xl font-bold text-emerald-300 font-display', playerPulse].join(' ')}>{combat.playerPower}</div>
          <div className="h-1.5 rounded-full bg-slate-700 mt-2 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${playerPct}%` }} />
          </div>
          <div className="text-sm mt-1">
            {attacker?.name}
            {ally ? ` + ${ally.name}` : ''}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {combat.cardsPlayedThisRound
              .filter((p) => p.side === 'player')
              .map((p, i) => (
                <CardView key={`${p.card.id}-${i}`} card={p.card} compact />
              ))}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-2xl font-black text-amber-600 select-none font-display">VS</span>
        </div>
        <div className={[
          'rounded-xl bg-amber-950/40 p-3 border transition-colors duration-500',
          !winning ? 'border-red-500/60 shadow-[0_0_18px_rgba(239,68,68,0.18)]' : 'border-amber-900/30',
        ].join(' ')}>
          <div className="text-xs opacity-60">{t.monsterSide}</div>
          <div className={['text-3xl font-bold text-red-300 font-display', monsterPulse].join(' ')}>{combat.monsterPower}</div>
          <div className="h-1.5 rounded-full bg-slate-700 mt-2 overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${monsterPct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {combat.monsters.map((m) => (
              <div key={m.id} className="anim-card-fly">
                <CardView card={m} compact />
              </div>
            ))}
            {combat.cardsPlayedThisRound
              .filter((p) => p.side === 'monster')
              .map((p, i) => (
                <CardView key={`${p.card.id}-${i}`} card={p.card} compact />
              ))}
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-sm">
        {combat.resolved ? (
          <span className={[
            'font-bold inline-block',
            combat.result === 'victory' ? 'text-emerald-300 anim-pop' :
            combat.result === 'flee' ? 'text-amber-300' :
            combat.result === 'badStuff' ? 'text-red-300 anim-pop' : '',
          ].join(' ')}>
            {t.result}: {t.resultLabel(combat.result)}
          </span>
        ) : winning ? (
          <span className="text-emerald-300">{t.playersWinning(combat.playerPower - combat.monsterPower)}</span>
        ) : (
          <span className="text-red-300">{t.monstersWinning(combat.monsterPower - combat.playerPower)}</span>
        )}
      </div>
    </div>
  );
}

function usePulseOnChange(value: number): string {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (value !== prev.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return pulse ? 'anim-pop' : '';
}

function useResolvedPulse(resolved: boolean, result: CombatState['result']): string {
  const prev = useRef(resolved);
  const [glow, setGlow] = useState('');
  useEffect(() => {
    if (resolved && !prev.current) {
      const tone = result === 'victory'
        ? 'shadow-[0_0_40px_rgba(52,211,153,0.45)]'
        : result === 'badStuff'
          ? 'shadow-[0_0_40px_rgba(239,68,68,0.45)]'
          : 'shadow-[0_0_40px_rgba(251,191,36,0.35)]';
      setGlow(tone);
      const id = setTimeout(() => setGlow(''), 900);
      prev.current = resolved;
      return () => clearTimeout(id);
    }
    prev.current = resolved;
  }, [resolved, result]);
  return glow;
}
