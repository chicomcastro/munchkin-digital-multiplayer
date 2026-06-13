import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../types';
import { PlayerStatus } from '../components/PlayerStatus';
import { CombatArena } from '../components/CombatArena';
import { CardView } from '../components/Card';
import { Confetti } from '../components/Confetti';
import { t } from '../i18n';

export function BoardView({ state }: { state: GameState }) {
  const combat = state.combatState;
  const activePlayer = state.players.find((p) => p.id === state.activePlayerId);
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [state.log.length]);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!state.turnTimerEndsAt) return setSecondsLeft(null);
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((state.turnTimerEndsAt! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.turnTimerEndsAt]);

  const [globalLeft, setGlobalLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!state.globalTimerEndsAt) return setGlobalLeft(null);
    const tick = () => {
      const s = Math.max(0, Math.floor((state.globalTimerEndsAt! - Date.now()) / 1000));
      const m = Math.floor(s / 60);
      setGlobalLeft(`${m}:${(s % 60).toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.globalTimerEndsAt]);

  return (
    <div id="main-content" className="min-h-screen p-4 pt-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[280px_1fr_320px] gap-4">
      {/* Wider screens get a dedicated left column for the player roster, mimicking a
          game table where each "seat" sits at the edge. */}
      <aside className="hidden xl:flex xl:flex-col xl:gap-3 xl:sticky xl:top-4 xl:self-start">
        <div className="text-xs uppercase opacity-60">{t.players}</div>
        {state.players.map((p) => (
          <PlayerStatus key={p.id} player={p} active={state.activePlayerId === p.id} />
        ))}
      </aside>
      <div className="space-y-4">
        <div className="card-shell p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase opacity-60">{t.room} {state.roomCode} · {t.turn} {state.turn} · {state.turnPhase}</div>
              <div className="text-3xl font-bold font-display">
                {t.active2} <span style={{ color: activePlayer?.color }}>{activePlayer?.name ?? '—'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {secondsLeft != null && (
                <div className={['text-xl font-bold', secondsLeft < 10 ? 'text-red-400' : ''].join(' ')}>
                  ⏱ {secondsLeft}s
                </div>
              )}
              {globalLeft != null && <div className="text-sm opacity-70">{t.globalTimer} {globalLeft}</div>}
            </div>
          </div>
          {state.config.turnTimerSeconds && secondsLeft != null && (
            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={[
                  'h-full transition-all duration-500',
                  secondsLeft < 10 ? 'bg-red-500' : 'bg-amber-400',
                ].join(' ')}
                style={{ width: `${Math.max(0, Math.min(100, (secondsLeft / state.config.turnTimerSeconds) * 100))}%` }}
              />
            </div>
          )}
        </div>

        {state.config.variant === 'cooperative' && (
          <div className="card-shell p-4">
            <div className="text-xs uppercase opacity-60 mb-2">{t.coopStatus}</div>
            {state.config.coopObjective === 'bossFight' && (
              <div>
                <div className="text-sm mb-1">{t.bossHp}: {state.coopBossHpRemaining} / {state.config.coopBossLevel}</div>
                <div className="h-3 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${100 * state.coopBossHpRemaining / state.config.coopBossLevel}%` }} />
                </div>
              </div>
            )}
            {state.config.coopObjective === 'dungeonTrail' && (
              <div className="text-sm">{t.trail}: {state.coopMonstersDefeated} / {state.config.coopTrailSize}</div>
            )}
            {state.config.coopObjective === 'surviveRounds' && (
              <div className="text-sm">{t.round} {state.turn} / {state.config.coopRounds}</div>
            )}
            {state.config.threatTrackEnabled && (
              <div className="mt-3">
                <div className="text-xs mb-1">{t.threat}: {state.threatTrack} / 10</div>
                <div className="h-2 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${state.threatTrack * 10}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {combat ? (
          <div className="anim-slide-in"><CombatArena combat={combat} players={state.players} /></div>
        ) : (
          <div className="card-shell p-3 text-center text-sm opacity-60 italic">{t.emptyNoCombat}</div>
        )}

        {state.config.marketEnabled && state.market.length > 0 && (
          <div className="card-shell p-4">
            <div className="text-xs uppercase opacity-60 mb-2">{t.market}</div>
            <div className="flex gap-2 overflow-x-auto scroll-thin">
              {state.market.map((c) => (
                <CardView key={c.id} card={c} compact />
              ))}
            </div>
          </div>
        )}

        {/* On xl: the roster moved to the left column; keep grid for sm/lg. */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:hidden gap-3">
          {state.players.map((p) => (
            <PlayerStatus key={p.id} player={p} active={state.activePlayerId === p.id} detailed />
          ))}
        </div>

        {state.phase === 'ended' && (
          <>
            <div className="card-shell p-6 text-center anim-fade">
              <div className="text-6xl mb-2" aria-hidden="true">🏆</div>
              <div className="text-3xl font-bold text-amber-400 mb-2">{t.gameOver}</div>
              {state.winnerId ? (
                <div className="text-xl">{t.winner}: <span className="font-bold">{state.players.find((p) => p.id === state.winnerId)?.name}</span></div>
              ) : (
                <div className="opacity-70">{state.log[state.log.length - 1]?.text}</div>
              )}
            </div>
            <Confetti trigger={1} count={40} />
          </>
        )}
      </div>

      <aside className="card-shell p-3 max-h-[80vh] flex flex-col lg:sticky lg:top-4 lg:self-start">
        <div className="text-xs uppercase opacity-60 mb-2">{t.log}</div>
        <div className="flex-1 overflow-y-auto scroll-thin text-sm space-y-1 pr-1">
          {state.log.map((e) => (
            <div
              key={e.id}
              className={[
                'leading-snug anim-fade',
                e.kind === 'combat' ? 'text-red-300' :
                e.kind === 'curse' ? 'text-purple-300' :
                e.kind === 'level' ? 'text-amber-300' :
                e.kind === 'system' ? 'text-emerald-300 font-bold' : 'opacity-80'
              ].join(' ')}
            >
              {e.text}
            </div>
          ))}
          <div ref={logEnd} />
        </div>
        <div className="text-xs opacity-60 mt-2 border-t border-slate-700 pt-2">
          {t.doors.toLowerCase()} {state.doorDeckSize} · {t.treasures.toLowerCase()} {state.treasureDeckSize}
        </div>
      </aside>
    </div>
  );
}
