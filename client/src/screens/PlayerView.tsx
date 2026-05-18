import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, GameState } from '../types';
import { CardView } from '../components/Card';
import { CombatArena } from '../components/CombatArena';
import { CardPreview } from '../components/CardPreview';
import { ToastStack } from '../components/Toast';
import { DeathBanner } from '../components/DeathBanner';
import { Confetti } from '../components/Confetti';
import { emit } from '../hooks/useSocket';
import { useToasts } from '../hooks/useToasts';
import { t } from '../i18n';

interface SoundHandle {
  play: (name: 'kick' | 'levelUp' | 'death' | 'victory' | 'flee' | 'select' | 'error') => void;
}

export function PlayerView({
  state,
  hand,
  fist,
  myId,
  onBoardMode,
  sound,
}: {
  state: GameState;
  hand: Card[];
  fist: Card[];
  myId: string;
  onBoardMode: () => void;
  sound?: SoundHandle;
}) {
  const me = state.players.find((p) => p.id === myId)!;
  const opponents = state.players.filter((p) => p.id !== myId);
  const active = state.activePlayerId === myId;
  const activePlayer = state.players.find((p) => p.id === state.activePlayerId);
  const combat = state.combatState;
  const inCombat = !!combat && !combat.resolved;
  const amInCombat =
    inCombat && (combat!.attackerId === myId || combat!.alliedPlayerId === myId);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [sellPicker, setSellPicker] = useState<Set<string>>(new Set());
  const [targetMode, setTargetMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [pulseLevel, setPulseLevel] = useState(false);
  const { toasts, dismiss } = useToasts(state, myId);
  const [deathTrigger, setDeathTrigger] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const lastSeenLog = useRef<string | null>(null);
  useEffect(() => {
    // Detect a fresh "<myName> died!" log entry → trigger banner.
    const log = state.log;
    let start = 0;
    if (lastSeenLog.current) {
      const idx = log.findIndex((e) => e.id === lastSeenLog.current);
      if (idx >= 0) start = idx + 1;
    }
    for (let i = start; i < log.length; i++) {
      const entry = log[i]!;
      if (entry.kind === 'system' && entry.text.startsWith(`${me.name}`) && /died/.test(entry.text)) {
        setDeathTrigger((n) => n + 1);
        sound?.play('death');
      }
      // Player-side combat victory or game-end → confetti
      if (entry.kind === 'combat' && entry.text.startsWith(`${me.name}`) && /defeated/i.test(entry.text)) {
        setConfettiTrigger((n) => n + 1);
        sound?.play('victory');
      }
      if (entry.kind === 'system' && /hit level|won the game/i.test(entry.text)) {
        setConfettiTrigger((n) => n + 1);
        sound?.play('victory');
      }
      if (entry.kind === 'level' && entry.text.startsWith(`${me.name}`)) {
        sound?.play('levelUp');
      }
    }
    if (log.length > 0) lastSeenLog.current = log[log.length - 1]!.id;
  }, [state.log, me.name]);

  useEffect(() => {
    if (!state.turnTimerEndsAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const s = Math.max(0, Math.floor((state.turnTimerEndsAt! - Date.now()) / 1000));
      setSecondsLeft(s);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.turnTimerEndsAt]);

  // Vibrate on your turn
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      try { navigator.vibrate?.([60, 40, 60]); } catch {}
    }
    wasActive.current = active;
  }, [active]);

  // Animate level changes
  const prevLevel = useRef(me.level);
  useEffect(() => {
    if (me.level > prevLevel.current) {
      setPulseLevel(true);
      const t = setTimeout(() => setPulseLevel(false), 600);
      prevLevel.current = me.level;
      return () => clearTimeout(t);
    }
    prevLevel.current = me.level;
  }, [me.level]);

  const selectedCardObj = useMemo(() => hand.find((c) => c.id === selectedCard) ?? null, [hand, selectedCard]);

  function playCard(c: Card, targetId?: string) {
    emit('game:playCard', { cardId: c.id, targetId }).catch((e) => alert(e.message));
    setSelectedCard(null);
    setTargetMode(false);
  }

  function toggleSell(id: string) {
    const next = new Set(sellPicker);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSellPicker(next);
  }

  function confirmSell() {
    emit('game:sellItems', { cardIds: [...sellPicker] })
      .then(() => setSellPicker(new Set()))
      .catch((e) => alert(e.message));
  }

  const sellTotal = useMemo(() => {
    return [...sellPicker].reduce((s, id) => {
      const c = [...hand, ...me.equipped, ...me.carried].find((x) => x.id === id);
      return s + (c?.value ?? 0);
    }, 0);
  }, [sellPicker, hand, me]);

  return (
    <div className="min-h-screen flex flex-col screen-root">
      <header className="card-shell mx-3 mt-3 p-3 anim-fade" style={{ borderTop: `4px solid ${me.color}` }}>
        <div className="flex justify-between items-baseline gap-3">
          <div className="min-w-0">
            <div className="text-xs opacity-60 truncate">{t.room} {state.roomCode} · {t.turn} {state.turn}</div>
            <div className="text-2xl font-bold">
              {t.level}{' '}
              <span className={['text-amber-400 inline-block', pulseLevel ? 'anim-pop' : ''].join(' ')}>{me.level}</span>
              {' '}· {t.power} {me.combatPower}
            </div>
            <div className="text-xs opacity-70 mt-1">
              {me.race?.name ?? t.noRace} / {me.class?.name ?? t.noClass}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase opacity-60">{active ? t.yourTurn : t.active}</div>
            {!active && <div className="font-bold" style={{ color: activePlayer?.color }}>{activePlayer?.name}</div>}
            {active && <div className="font-bold text-amber-300 anim-pulse-active rounded px-1.5 inline-block">●</div>}
            {secondsLeft != null && (
              <div className={['text-sm font-bold', secondsLeft < 10 ? 'text-red-400' : ''].join(' ')}>{secondsLeft}s</div>
            )}
            <button onClick={onBoardMode} className="text-xs underline opacity-70 mt-1 block ml-auto">{t.boardMode.toLowerCase()}</button>
          </div>
        </div>
        {me.equipped.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scroll-thin mt-2 pb-1">
            {me.equipped.map((c) => (
              <div key={c.id} className="bg-amber-900/60 border border-amber-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                {c.name} <span className="opacity-70">+{c.bonus ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {inCombat && combat && (
        <div className="px-3 mb-2 anim-slide-in">
          <CombatArena combat={combat} players={state.players} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {amInCombat ? (
              <>
                {combat.attackerId === myId && (
                  <button className="btn-primary" onClick={() => emit('game:resolveCombat').catch((e) => alert(e.message))}>
                    {t.iconResolve} {t.resolveCombat}
                  </button>
                )}
                <button className="btn-danger" onClick={() => { sound?.play('flee'); emit('game:flee').catch((e) => alert(e.message)); }}>
                  {t.iconFlee} {t.flee}
                </button>
              </>
            ) : (
              !combat.alliedPlayerId && (
                <button className="btn col-span-2" onClick={() => emit('game:helpInCombat').catch((e) => alert(e.message))}>
                  {t.iconHelp} {t.helpInCombat}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <main id="main-content" className="flex-1 px-3 pb-6 space-y-3">
        <div>
          <div className="text-xs uppercase opacity-60 mb-1">{t.hand} ({hand.length})</div>
          <div className="flex gap-2 overflow-x-auto scroll-thin pb-2 -mx-1 px-1">
            {hand.length === 0 && <div className="opacity-50 text-sm italic">{t.emptyHand}</div>}
            {hand.map((c) => (
              <div key={c.id} className="anim-slide-in">
                <CardView
                  card={c}
                  selected={selectedCard === c.id}
                  onClick={() => setSelectedCard(selectedCard === c.id ? null : c.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {selectedCardObj && (
          <div className="card-shell p-3 anim-slide-in">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{selectedCardObj.name}</div>
                <div className="text-sm opacity-80">{selectedCardObj.description}</div>
              </div>
              <button
                type="button"
                className="text-xs underline opacity-70 shrink-0"
                onClick={() => setPreviewCard(selectedCardObj)}
              >
                🔍
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(selectedCardObj.type === 'item' || selectedCardObj.type === 'race' || selectedCardObj.type === 'class' || selectedCardObj.type === 'levelUp') && (
                <button className="btn-primary col-span-2" onClick={() => playCard(selectedCardObj)}>
                  {selectedCardObj.type === 'item' ? t.equip : selectedCardObj.type === 'levelUp' ? t.use : t.become}
                </button>
              )}
              {(selectedCardObj.type === 'oneShot' || selectedCardObj.type === 'helper') && (
                <button className="btn-primary col-span-2" disabled={!inCombat} onClick={() => playCard(selectedCardObj)}>
                  {t.playIntoCombat}
                </button>
              )}
              {selectedCardObj.type === 'curse' && (
                <>
                  {!targetMode ? (
                    <button className="btn-danger col-span-2" onClick={() => setTargetMode(true)}>
                      {t.castOn}
                    </button>
                  ) : (
                    <div className="col-span-2 grid grid-cols-2 gap-1">
                      {state.players.filter((p) => p.isAlive).map((p) => (
                        <button key={p.id} className="btn text-sm" style={{ borderLeft: `4px solid ${p.color}` }} onClick={() => playCard(selectedCardObj, p.id)}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {selectedCardObj.type === 'monster' && active && state.turnPhase === 'lookForTroubleOrLoot' && (
                <button className="btn-danger col-span-2" onClick={() => playCard(selectedCardObj)}>
                  {t.lookForTrouble}
                </button>
              )}
              {selectedCardObj.value != null && selectedCardObj.value > 0 && (
                <button className="btn col-span-2" onClick={() => toggleSell(selectedCardObj.id)}>
                  {sellPicker.has(selectedCardObj.id) ? t.unmarkForSale : t.markForSale} ({selectedCardObj.value}gp)
                </button>
              )}
              {/* Fist deposit: any door card can be reserved when the mechanic is on. */}
              {state.config.fistMechanicEnabled && selectedCardObj.deck === 'door' && me.fistCards.length < 3 && (
                <button
                  className="btn col-span-2"
                  onClick={() => emit('fist:deposit', { cardId: selectedCardObj.id })
                    .then(() => setSelectedCard(null))
                    .catch((e) => alert(e.message))}
                >
                  ✊ {t.reserveInFist}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Class abilities panel — shown when the player has an active class and the context is right. */}
        {me.class && (
          <AbilitiesPanel
            klass={me.class.name}
            inCombat={inCombat}
            combatHasUndead={!!combat?.monsters.some((m) => (m.tags ?? []).includes('undead'))}
            opponents={opponents}
            hand={hand}
            onSteal={(targetId) => emit('game:stealItem', { targetId }).catch((e) => alert(e.message))}
            onClericCharge={(ids) => emit('game:clericVsUndead', { cardIds: ids }).catch((e) => alert(e.message))}
            onWizardCharm={(ids) => emit('game:wizardCharm', { cardIds: ids }).catch((e) => alert(e.message))}
            stealingEnabled={!state.config.noStealing}
          />
        )}

        {/* Dual-character swap, when configured. */}
        {state.config.twoPlayerDualCharacter && (me.characters?.length ?? 0) > 0 && (
          <button
            type="button"
            className="btn w-full text-sm"
            onClick={() => emit('game:swapCharacter', { alternateIdx: 0 }).catch((e) => alert(e.message))}
          >
            🔄 {t.swapCharacter} (nv {me.characters![0]!.level})
          </button>
        )}

        {sellPicker.size > 0 && (
          <div className="card-shell p-3 anim-slide-in">
            <div className="text-sm">{t.selling(sellPicker.size)} · total {sellTotal}gp ({Math.floor(sellTotal / 1000)} níveis)</div>
            <button className="btn-primary w-full mt-2" disabled={sellTotal < 1000} onClick={confirmSell}>{t.sellForLevels}</button>
          </div>
        )}

        {fist.length > 0 && (
          <div>
            <div className="text-xs uppercase opacity-60 mb-1">{t.fistReserve}</div>
            <div className="flex gap-2 overflow-x-auto scroll-thin">
              {fist.map((c) => (
                <CardView key={c.id} card={c} compact onClick={() => emit('fist:playCard', { cardId: c.id, targetCombat: inCombat }).catch((e) => alert(e.message))} />
              ))}
            </div>
          </div>
        )}

        {/* Mini opponents row — fills the previously empty middle area */}
        {opponents.length > 0 && (
          <div>
            <div className="text-xs uppercase opacity-60 mb-1">{t.opponents}</div>
            <div className="grid grid-cols-2 gap-2">
              {opponents.map((p) => (
                <div
                  key={p.id}
                  className={[
                    'rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2',
                    !p.isAlive ? 'opacity-40' : '',
                    state.activePlayerId === p.id ? 'ring-2 ring-amber-400' : '',
                  ].join(' ')}
                  style={{ borderLeft: `4px solid ${p.color}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold truncate text-sm">{p.name}</div>
                    {!p.socketId && <span className="text-[10px] opacity-50">{t.offline}</span>}
                  </div>
                  <div className="flex items-baseline gap-3 text-xs mt-0.5">
                    <span><span className="opacity-50">{t.level}</span> <span className="text-amber-300 font-bold">{p.level}</span></span>
                    <span><span className="opacity-50">{t.power}</span> <span className="font-bold">{p.combatPower}</span></span>
                  </div>
                  {(p.race || p.class) && (
                    <div className="text-[10px] opacity-60 truncate">
                      {p.race?.name ?? '—'} / {p.class?.name ?? '—'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deck / discard summary */}
        <div>
          <div className="text-xs uppercase opacity-60 mb-1">{t.decksLabel}</div>
          <div className="grid grid-cols-2 gap-2">
            <DeckBox
              label={t.doors}
              size={state.doorDeckSize}
              discard={state.doorDiscardTop}
              accent="text-red-300"
              emptyMsg={t.emptyDiscardDoor}
            />
            <DeckBox
              label={t.treasures}
              size={state.treasureDeckSize}
              discard={state.treasureDiscardTop}
              accent="text-amber-300"
              emptyMsg={t.emptyDiscardTreasure}
            />
          </div>
        </div>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
      <DeathBanner trigger={deathTrigger} />
      <Confetti trigger={confettiTrigger} />

      <footer className="sticky-footer">
        <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
          {state.turnPhase === 'turnStart' && state.config.listeningAtTheDoor && (
            <button className="btn" disabled={!active} onClick={() => emit('game:listenDoor').catch((e) => alert(e.message))}>
              {t.iconListen} {t.listen}
            </button>
          )}
          <button
            className="btn-primary"
            disabled={!active || !(state.turnPhase === 'turnStart' || state.turnPhase === 'kickDoor')}
            onClick={() => { sound?.play('kick'); emit('game:kickDoor').catch((e) => alert(e.message)); }}
          >
            {t.iconKick} {t.kickDoor}
          </button>
          <button
            className="btn"
            disabled={!active || state.turnPhase !== 'lookForTroubleOrLoot'}
            onClick={() => emit('game:lootRoom').catch((e) => alert(e.message))}
          >
            {t.iconLoot} {t.lootRoom}
          </button>
          <button
            className="btn"
            disabled={!active}
            onClick={() => emit('game:endTurn').catch((e) => alert(e.message))}
          >
            {t.iconEndTurn} {t.endTurn}
          </button>
        </div>
      </footer>
    </div>
  );
}

function AbilitiesPanel({
  klass,
  inCombat,
  combatHasUndead,
  opponents,
  hand,
  onSteal,
  onClericCharge,
  onWizardCharm,
  stealingEnabled,
}: {
  klass: string;
  inCombat: boolean;
  combatHasUndead: boolean;
  opponents: { id: string; name: string; color: string }[];
  hand: Card[];
  onSteal: (targetId: string) => void;
  onClericCharge: (cardIds: string[]) => void;
  onWizardCharm: (cardIds: string[]) => void;
  stealingEnabled: boolean;
}) {
  const [stealMode, setStealMode] = useState(false);
  const [chargePicker, setChargePicker] = useState<Set<string>>(new Set());

  function toggleCharge(id: string) {
    const next = new Set(chargePicker);
    next.has(id) ? next.delete(id) : next.add(id);
    setChargePicker(next);
  }

  if (klass === 'Thief' && stealingEnabled) {
    return (
      <div className="card-shell p-3 anim-slide-in">
        {!stealMode ? (
          <button className="btn w-full" onClick={() => setStealMode(true)}>🥷 {t.steal}</button>
        ) : (
          <div>
            <div className="text-sm opacity-70 mb-2">{t.stealFrom}</div>
            <div className="grid grid-cols-2 gap-1">
              {opponents.map((o) => (
                <button key={o.id} className="btn text-sm" style={{ borderLeft: `4px solid ${o.color}` }} onClick={() => { onSteal(o.id); setStealMode(false); }}>
                  {o.name}
                </button>
              ))}
              <button className="btn text-xs col-span-2" onClick={() => setStealMode(false)}>{t.cancel}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (klass === 'Cleric' && inCombat && combatHasUndead) {
    return (
      <div className="card-shell p-3 anim-slide-in">
        <div className="text-sm font-bold mb-2">⚡ {t.cleric}</div>
        <div className="text-xs opacity-70 mb-2">Selecione cartas da mão pra descartar (+3 por carta).</div>
        <div className="flex gap-1 overflow-x-auto scroll-thin">
          {hand.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCharge(c.id)}
              className={[
                'text-xs px-2 py-1 rounded whitespace-nowrap',
                chargePicker.has(c.id) ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-700 text-white',
              ].join(' ')}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button
          className="btn-primary w-full mt-2 text-sm"
          disabled={chargePicker.size === 0}
          onClick={() => { onClericCharge([...chargePicker]); setChargePicker(new Set()); }}
        >
          +{3 * chargePicker.size}
        </button>
      </div>
    );
  }

  if (klass === 'Wizard' && inCombat) {
    const enough = chargePicker.size >= 3;
    return (
      <div className="card-shell p-3 anim-slide-in">
        <div className="text-sm font-bold mb-2">🪄 {t.wizard}</div>
        <div className="text-xs opacity-70 mb-2">Selecione 3 cartas pra fugir sem coisa ruim.</div>
        <div className="flex gap-1 overflow-x-auto scroll-thin">
          {hand.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCharge(c.id)}
              className={[
                'text-xs px-2 py-1 rounded whitespace-nowrap',
                chargePicker.has(c.id) ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-700 text-white',
              ].join(' ')}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button
          className="btn-primary w-full mt-2 text-sm"
          disabled={!enough}
          onClick={() => { onWizardCharm([...chargePicker]); setChargePicker(new Set()); }}
        >
          {chargePicker.size}/3
        </button>
      </div>
    );
  }

  return null;
}

function DeckBox({
  label,
  size,
  discard,
  accent,
  emptyMsg,
}: {
  label: string;
  size: number;
  discard: Card | null;
  accent: string;
  emptyMsg: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-2">
      <div className="text-[10px] uppercase opacity-50">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-10 h-14 rounded-md bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs font-bold">
          {size}
        </div>
        <div className="text-xs flex-1 min-w-0">
          <div className="opacity-60 text-[10px] uppercase">{t.discard}</div>
          <div className={['truncate', accent].join(' ')}>
            {discard?.name ?? <span className="italic opacity-50">{emptyMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
