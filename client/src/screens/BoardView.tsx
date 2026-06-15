import { useEffect, useMemo, useRef, useState } from 'react';
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
            <div className="mt-2 h-1.5 bg-amber-950/50 rounded-full overflow-hidden">
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
                <div className="h-3 bg-amber-950/50 rounded overflow-hidden">
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
                <div className="h-2 bg-amber-950/50 rounded overflow-hidden">
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

        <DungeonMap players={state.players} winLevel={state.config.winLevel} activePlayerId={state.activePlayerId ?? ''} />

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
        <div className="text-xs opacity-60 mt-2 border-t border-amber-800/30 pt-2">
          {t.doors.toLowerCase()} {state.doorDeckSize} · {t.treasures.toLowerCase()} {state.treasureDeckSize}
        </div>
      </aside>
    </div>
  );
}

function DungeonMap({
  players,
  winLevel,
  activePlayerId,
}: {
  players: GameState['players'];
  winLevel: number;
  activePlayerId: string;
}) {
  const COLS = 4;
  const CELL = 64;
  const R = 22;
  const PAD = 32;

  const rooms = useMemo(() => {
    const result: { level: number; cx: number; cy: number }[] = [];
    for (let i = 0; i < winLevel; i++) {
      const rowIdx = Math.floor(i / COLS);
      const colInRow = i % COLS;
      const col = rowIdx % 2 === 0 ? colInRow : COLS - 1 - colInRow;
      const seed = ((i + 1) * 7 + 3) % 11;
      const xOff = (seed % 3 - 1) * 5;
      const yOff = ((seed * 3) % 5 - 2) * 4;
      result.push({
        level: i + 1,
        cx: col * CELL + PAD + xOff,
        cy: rowIdx * CELL + PAD + yOff,
      });
    }
    const maxY = Math.max(...result.map((r) => r.cy));
    return result.map((r) => ({ ...r, cy: maxY - r.cy + PAD }));
  }, [winLevel]);

  const totalRows = Math.ceil(winLevel / COLS);
  const svgW = (COLS - 1) * CELL + PAD * 2;
  const svgH = (totalRows - 1) * CELL + PAD * 2;

  return (
    <div className="card-shell p-4 overflow-hidden">
      <div className="text-xs uppercase opacity-60 mb-2 font-display">{t.dungeonMap}</div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full mx-auto block"
        style={{ maxWidth: '26rem' }}
        aria-label={t.dungeonMap}
      >
        <defs>
          <pattern id="dng-floor" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="#2a1f14" />
            <rect x="0" y="0" width="6" height="6" rx="0.5" fill="#332717" opacity="0.6" />
            <rect x="7" y="7" width="6" height="6" rx="0.5" fill="#302416" opacity="0.5" />
            <rect x="7" y="0" width="6" height="6" rx="0.5" fill="#2e2215" opacity="0.4" />
            <rect x="0" y="7" width="6" height="6" rx="0.5" fill="#352918" opacity="0.5" />
          </pattern>
          <pattern id="dng-wall" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#110d05" />
            <rect x="0" y="0" width="4" height="4" rx="0.5" fill="#1a1208" opacity="0.4" />
            <rect x="5" y="5" width="4" height="4" rx="0.5" fill="#1a1208" opacity="0.3" />
          </pattern>
          <filter id="dng-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={svgW} height={svgH} fill="url(#dng-wall)" rx="8" />

        {rooms.slice(1).map((room, i) => {
          const prev = rooms[i]!;
          return (
            <line key={`cb${i}`}
              x1={prev.cx} y1={prev.cy} x2={room.cx} y2={room.cy}
              stroke="#3d2e1e" strokeWidth={R * 2 + 6} strokeLinecap="round"
            />
          );
        })}
        {rooms.slice(1).map((room, i) => {
          const prev = rooms[i]!;
          return (
            <line key={`cf${i}`}
              x1={prev.cx} y1={prev.cy} x2={room.cx} y2={room.cy}
              stroke="url(#dng-floor)" strokeWidth={R * 2} strokeLinecap="round"
            />
          );
        })}

        {rooms.map((room) => {
          const here = players.filter((p) => p.level === room.level);
          const isGoal = room.level === winLevel;
          const isActive = here.some((p) => p.id === activePlayerId);
          return (
            <g key={room.level}>
              <circle cx={room.cx} cy={room.cy} r={R + 3}
                fill="none" stroke="#3d2e1e" strokeWidth="3" />
              <circle cx={room.cx} cy={room.cy} r={R}
                fill="url(#dng-floor)"
                stroke={isGoal ? '#d97706' : isActive ? '#b45309' : '#5c4a35'}
                strokeWidth={isGoal || isActive ? 2.5 : 1.5}
              />
              {isGoal && (
                <circle cx={room.cx} cy={room.cy} r={R + 6}
                  fill="none" stroke="#d97706" strokeWidth="1" opacity="0.4"
                  strokeDasharray="3 3" />
              )}
              {isActive && !isGoal && (
                <circle cx={room.cx} cy={room.cy} r={R + 4}
                  fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.3" />
              )}
              <text
                x={room.cx}
                y={here.length > 0 ? room.cy - 1 : room.cy + 5}
                textAnchor="middle"
                fill={isGoal ? '#fbbf24' : here.length > 0 ? '#d4a054' : '#6b5330'}
                fontSize={isGoal ? '11' : '15'}
                fontWeight="bold"
                fontFamily="'MedievalSharp', cursive"
              >
                {isGoal ? '🏆' : room.level}
              </text>
              {here.map((p, pi) => {
                const angle = (pi / Math.max(here.length, 1)) * Math.PI * 2 - Math.PI / 2;
                const spread = here.length > 1 ? 11 : 0;
                const tx = room.cx + Math.cos(angle) * spread;
                const ty = room.cy + (here.length > 1 ? Math.sin(angle) * spread + 5 : 11);
                return (
                  <g key={p.id}>
                    <circle cx={tx} cy={ty} r="8"
                      fill={p.color} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                    <text x={tx} y={ty + 3.5} textAnchor="middle"
                      fill="white" fontSize="8" fontWeight="bold"
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
