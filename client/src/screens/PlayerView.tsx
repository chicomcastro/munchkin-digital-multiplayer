import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, GameState } from '../types';
import { CardView } from '../components/Card';
import { CombatArena } from '../components/CombatArena';
import { CardPreview } from '../components/CardPreview';
import { ToastStack } from '../components/Toast';
import { DeathBanner } from '../components/DeathBanner';
import { Confetti } from '../components/Confetti';
import { SlotIcon } from '../components/SlotIcon';
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
  sound,
}: {
  state: GameState;
  hand: Card[];
  fist: Card[];
  myId: string;
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

  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      try { navigator.vibrate?.([60, 40, 60]); } catch {}
    }
    wasActive.current = active;
  }, [active]);

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

  const slotMap = useMemo(() => {
    const map: Record<string, Card | null> = { head: null, body: null, feet: null, handL: null, handR: null };
    const others: Card[] = [];
    for (const c of me.equipped) {
      const s = c.slot ?? 'none';
      if (s === 'twoHands') { map.handL = c; map.handR = c; }
      else if (s === 'hand') {
        if (!map.handL) map.handL = c;
        else if (!map.handR) map.handR = c;
        else others.push(c);
      } else if (s in map && !map[s]) { map[s] = c; }
      else if (s === 'none') others.push(c);
      else others.push(c);
    }
    return { slots: map, others };
  }, [me.equipped]);

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

  const phaseBanner = active
    ? state.turnPhase === 'combat'
      ? { text: t.phaseBannerCombat, accent: 'bg-red-500/20 border-red-500/40 text-red-200' }
      : state.turnPhase === 'lookForTroubleOrLoot'
        ? { text: t.phaseBannerLoot, accent: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' }
        : state.turnPhase === 'charity'
          ? { text: t.phaseBannerCharity, accent: 'bg-violet-500/20 border-violet-500/40 text-violet-200' }
          : state.turnPhase === 'endTurn'
            ? { text: t.phaseBannerEndTurn, accent: 'bg-amber-800/20 border-amber-700/40 text-amber-200' }
            : { text: t.phaseBannerKick, accent: 'bg-amber-500/20 border-amber-500/40 text-amber-200' }
    : { text: t.phaseBannerWaiting(activePlayer?.name ?? '...'), accent: 'bg-amber-900/20 border-amber-800/40 text-amber-300/70' };

  return (
    <div className="min-h-screen flex flex-col screen-root pt-12">
      <div className="md:grid md:grid-cols-[minmax(280px,360px)_1fr] md:gap-3 md:px-3 md:items-start">
      {/* Hero header */}
      <header className="surface-glass mx-3 md:mx-0 mt-1 md:mt-2 p-3 anim-fade md:sticky md:top-12 md:max-h-[calc(100vh-3.5rem)] md:overflow-y-auto md:self-start" style={{ borderTop: `3px solid ${me.color}` }}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-xs opacity-60 truncate">{t.room} {state.roomCode} · {t.turn} {state.turn}</div>
            <div className="flex items-center gap-0.5 mt-1">
              <span className="text-xs opacity-60 mr-1.5 font-display">{t.level}</span>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className={[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all',
                    n <= me.level
                      ? 'bg-amber-500 border-amber-400 text-amber-950'
                      : 'bg-amber-950/40 border-amber-700/40 text-amber-600/60',
                    n === me.level && pulseLevel ? 'anim-pop' : '',
                  ].join(' ')}
                >
                  {n}
                </div>
              ))}
              <span className="text-amber-800/60 mx-1.5">|</span>
              <span className="text-lg font-bold font-display">{me.combatPower}</span>
              <span className="text-xs opacity-60 ml-0.5">{t.power}</span>
            </div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 text-xs px-2 py-0.5 rounded-full">
                {me.race?.name ?? t.noRace}
              </span>
              <span className="bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-xs px-2 py-0.5 rounded-full">
                {me.class?.name ?? t.noClass}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase opacity-60">{active ? t.yourTurn : t.active}</div>
            {!active && <div className="font-bold text-sm" style={{ color: activePlayer?.color }}>{activePlayer?.name}</div>}
            {active && <div className="font-bold text-amber-300 anim-pulse-active rounded px-1 inline-block text-sm">●</div>}
            {secondsLeft != null && (
              <div className={['text-sm font-bold', secondsLeft < 10 ? 'text-red-400' : ''].join(' ')}>{secondsLeft}s</div>
            )}
          </div>
        </div>
        <div className="mt-2">
          <div className="grid grid-cols-3 gap-1.5 text-[10px] max-w-[280px] md:max-w-none">
            <div />
            <SlotBox label="head" card={slotMap.slots.head} />
            <div />
            <SlotBox label="hand" card={slotMap.slots.handL} />
            <SlotBox label="body" card={slotMap.slots.body} />
            <SlotBox label="hand" card={slotMap.slots.handR} twoHands={slotMap.slots.handL === slotMap.slots.handR && !!slotMap.slots.handL} />
            <div />
            <SlotBox label="feet" card={slotMap.slots.feet} />
            <div />
          </div>
          {slotMap.others.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {slotMap.others.map((c) => (
                <span key={c.id} className="bg-amber-900/40 border border-amber-800/40 px-1.5 py-0.5 rounded text-[10px]">
                  {c.name} +{c.bonus ?? 0}
                </span>
              ))}
            </div>
          )}
        </div>
        {state.config.twoPlayerDualCharacter && (me.characters?.length ?? 0) > 0 && (me.characters!.some((alt) => alt.race || alt.class || alt.level > 1 || alt.equipped.length > 0) || me.race || me.class) && (
          <div className="mt-2.5 border-t border-amber-800/30 pt-2" data-testid="characters-panel">
            <div className="text-[10px] uppercase tracking-widest opacity-60 font-display mb-1.5">
              {t.charactersLabel}
            </div>
            <div className="flex flex-col gap-1.5">
              <CharacterRow
                tag={t.activeCharacterTag}
                tagAccent="bg-amber-500/30 border-amber-400/60 text-amber-100"
                race={me.race?.name ?? t.noRace}
                klass={me.class?.name ?? t.noClass}
                level={me.level}
                power={me.combatPower}
                isActive
              />
              {me.characters!.map((alt, i) => (
                <CharacterRow
                  key={i}
                  tag={t.alternateCharacterTag}
                  tagAccent="bg-amber-900/60 border-amber-700/60 text-amber-300"
                  race={alt.race?.name ?? t.noRace}
                  klass={alt.class?.name ?? t.noClass}
                  level={alt.level}
                  power={alt.combatPower}
                  onSwap={() => emit('game:swapCharacter', { alternateIdx: i }).catch((e) => alert(e.message))}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="md:min-w-0 flex flex-col gap-2">
      {/* Phase banner — louder & bigger when it is your turn */}
      <div className={[
        'mx-3 md:mx-0 mt-1.5 md:mt-2 px-3 rounded-lg border text-center font-medium anim-fade font-display',
        active ? 'py-3 text-base md:text-lg font-bold tracking-wide shadow-[0_0_24px_rgba(251,191,36,0.18)]' : 'py-1.5 text-sm',
        phaseBanner.accent,
      ].join(' ')}>
        {phaseBanner.text}
      </div>

      {/* Table perspective: opponents (far) → board (middle) → hand (near) */}
      <main id="main-content" className="flex flex-col px-3 mt-2 space-y-2 pb-4">
        {/* ── FAR: opponents as Zoom-call style cards ── */}
        {opponents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-amber-800/30" />
              <span className="text-xs uppercase tracking-widest opacity-50 font-display">{t.opponents}</span>
              <div className="h-px flex-1 bg-amber-800/30" />
            </div>
            <div className="flex gap-2 overflow-x-auto scroll-thin pb-1 justify-center md:flex-wrap">
              {opponents.map((p) => {
                const isActiveBot = p.isBot && state.activePlayerId === p.id && state.phase === 'playing';
                const difficultyLabel = p.botDifficulty === 'easy' ? t.botDifficultyEasy
                  : p.botDifficulty === 'normal' ? t.botDifficultyNormal
                  : p.botDifficulty === 'hard' ? t.botDifficultyHard
                  : null;
                return (
                <div
                  key={p.id}
                  data-testid={`opponent-${p.id}`}
                  className={[
                    'shrink-0 surface-glass px-3 py-2 min-w-[120px] max-w-[160px] md:max-w-[180px] text-center relative',
                    !p.isAlive ? 'opacity-40' : '',
                    state.activePlayerId === p.id ? 'ring-2 ring-amber-400' : '',
                  ].join(' ')}
                >
                  <div className="relative w-10 h-10 mx-auto">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    {p.isBot && (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-indigo-800 border border-indigo-400 text-indigo-100 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold" aria-hidden="true">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="font-bold truncate text-sm mt-1 font-display">{p.name}</div>
                  {p.isBot ? (
                    <div className="text-[10px] uppercase tracking-wide text-indigo-200">
                      {t.bot}{difficultyLabel ? ` · ${difficultyLabel}` : ''}
                    </div>
                  ) : !p.socketId && (
                    <div className="text-[10px] opacity-50">{t.offline}</div>
                  )}
                  <div className="text-xs mt-0.5 opacity-80">
                    <span className="text-amber-300 font-bold">{p.level}</span>
                    <span className="opacity-50 mx-1">·</span>
                    <span className="font-bold">{p.combatPower}</span>
                  </div>
                  {(p.race || p.class) && (
                    <div className="text-[10px] opacity-50 truncate">
                      {p.race?.name ?? '—'} / {p.class?.name ?? '—'}
                    </div>
                  )}
                  {isActiveBot && (
                    <div className="mt-1 text-[10px] text-amber-200 anim-pulse-active flex items-center justify-center gap-1" data-testid={`opponent-thinking-${p.id}`}>
                      <span className="inline-block w-1 h-1 rounded-full bg-amber-300" />
                      <span className="inline-block w-1 h-1 rounded-full bg-amber-300" style={{ animationDelay: '0.15s' }} />
                      <span className="inline-block w-1 h-1 rounded-full bg-amber-300" style={{ animationDelay: '0.3s' }} />
                      <span>{t.botThinking}</span>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MIDDLE: board center (combat, abilities) + deck sidebar ── */}
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-4 space-y-2 lg:space-y-0">
          <div className="space-y-2">
            {inCombat && combat && (
              <div className="anim-slide-in">
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

          </div>

          {/* Deck sidebar — stacks vertically on desktop, inline grid on mobile */}
          <aside className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-amber-800/30" />
              <span className="text-xs uppercase tracking-widest opacity-50 font-display">{t.decksLabel}</span>
              <div className="h-px flex-1 bg-amber-800/30" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <DeckBox label={t.doors} size={state.doorDeckSize} discard={state.doorDiscardTop} accent="text-red-300" emptyMsg={t.emptyDiscardDoor} />
              <DeckBox label={t.treasures} size={state.treasureDeckSize} discard={state.treasureDiscardTop} accent="text-amber-300" emptyMsg={t.emptyDiscardTreasure} />
            </div>
          </aside>
        </div>

        {/* ── NEAR: your hand (cards you're holding) ── */}
        {selectedCardObj && (
          <div className="surface-glass p-3 anim-slide-in max-w-lg mx-auto w-full">
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

        {sellPicker.size > 0 && (
          <div className="surface-glass p-3 anim-slide-in max-w-lg mx-auto w-full">
            <div className="text-sm">{t.selling(sellPicker.size)} · total {sellTotal}gp ({Math.floor(sellTotal / 1000)} níveis)</div>
            <button className="btn-primary w-full mt-2" disabled={sellTotal < 1000} onClick={confirmSell}>{t.sellForLevels}</button>
          </div>
        )}

        {fist.length > 0 && (
          <div>
            <div className="text-xs uppercase opacity-60 mb-1">{t.fistReserve}</div>
            <div className="flex gap-2 overflow-x-auto scroll-thin justify-center">
              {fist.map((c) => (
                <CardView key={c.id} card={c} compact onClick={() => emit('fist:playCard', { cardId: c.id, targetCombat: inCombat }).catch((e) => alert(e.message))} />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-amber-800/30" />
            <span className="text-xs uppercase tracking-widest opacity-50 font-display">{t.hand} ({hand.length})</span>
            <div className="h-px flex-1 bg-amber-800/30" />
          </div>
          <div className="flex gap-2 overflow-x-auto scroll-thin pb-2 justify-center flex-wrap">
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
      </main>
      </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
      <DeathBanner trigger={deathTrigger} />
      <Confetti trigger={confettiTrigger} />

      <footer className="sticky-footer">
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
          {(state.turnPhase === 'turnStart' || state.turnPhase === 'kickDoor') && (
            <>
              {state.turnPhase === 'turnStart' && state.config.listeningAtTheDoor && (
                <button className="btn" disabled={!active} onClick={() => emit('game:listenDoor').catch((e) => alert(e.message))}>
                  {t.iconListen} {t.listen}
                </button>
              )}
              <button
                className="btn-primary"
                disabled={!active}
                onClick={() => { sound?.play('kick'); emit('game:kickDoor').catch((e) => alert(e.message)); }}
              >
                {t.iconKick} {t.kickDoor}
              </button>
            </>
          )}
          {state.turnPhase === 'lookForTroubleOrLoot' && (
            <button
              className="btn"
              disabled={!active}
              onClick={() => emit('game:lootRoom').catch((e) => alert(e.message))}
            >
              {t.iconLoot} {t.lootRoom}
            </button>
          )}
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
      <div className="surface-glass p-3 anim-slide-in">
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
      <div className="surface-glass p-3 anim-slide-in">
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
                chargePicker.has(c.id) ? 'bg-amber-500 text-amber-950 font-bold' : 'bg-amber-900/60 text-amber-100',
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
      <div className="surface-glass p-3 anim-slide-in">
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
                chargePicker.has(c.id) ? 'bg-amber-500 text-amber-950 font-bold' : 'bg-amber-900/60 text-amber-100',
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

function CharacterRow({
  tag,
  tagAccent,
  race,
  klass,
  level,
  power,
  isActive,
  onSwap,
}: {
  tag: string;
  tagAccent: string;
  race: string;
  klass: string;
  level: number;
  power: number;
  isActive?: boolean;
  onSwap?: () => void;
}) {
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-md border px-2 py-1.5',
        isActive ? 'bg-amber-900/30 border-amber-700/50' : 'bg-amber-950/40 border-amber-800/30',
      ].join(' ')}
      data-testid={isActive ? 'character-row-active' : 'character-row-alt'}
    >
      <span className={['text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold shrink-0', tagAccent].join(' ')}>
        {tag}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        <span className="bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[40%]">
          {race}
        </span>
        <span className="bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[40%]">
          {klass}
        </span>
      </div>
      <div className="text-[10px] opacity-80 shrink-0 flex items-center gap-1.5">
        <span><span className="opacity-60">{t.level[0]}</span><span className="font-bold text-amber-300 ml-0.5">{level}</span></span>
        <span><span className="opacity-60">{t.power[0]}</span><span className="font-bold ml-0.5">{power}</span></span>
      </div>
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          className="text-[10px] border border-amber-700/60 bg-amber-900/40 hover:bg-amber-800/60 transition-colors rounded px-2 py-1 font-bold shrink-0"
          aria-label={t.swapCharacter}
        >
          🔄 {t.swap}
        </button>
      )}
    </div>
  );
}

function SlotBox({ label, card, twoHands }: { label: string; card: Card | null; twoHands?: boolean }) {
  const kind = (twoHands ? 'twoHands' : label) as 'head' | 'body' | 'hand' | 'feet' | 'twoHands';
  return (
    <div className={[
      'rounded border px-1 py-1.5 text-center min-h-[3.25rem] md:min-h-[4rem] flex flex-col items-center justify-center gap-0.5 relative overflow-hidden',
      card
        ? 'bg-amber-900/40 border-amber-700/60 text-amber-200'
        : 'bg-amber-950/50 border-dashed border-amber-700/30 text-amber-700/50',
    ].join(' ')}>
      <SlotIcon slot={kind} size={20} className={card ? 'opacity-30' : 'opacity-50'} />
      <div className="uppercase text-[7px] tracking-wider opacity-60">{twoHands ? '2H' : label}</div>
      {card && (
        <div className="text-[9px] truncate font-bold leading-tight max-w-full px-0.5">{card.name}</div>
      )}
    </div>
  );
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
    <div className="rounded-xl bg-amber-950/40 border border-amber-800/30 p-2">
      <div className="text-[10px] uppercase opacity-50 font-display">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-10 h-14 rounded-md bg-amber-950/60 border-2 border-amber-700/40 flex items-center justify-center text-xs font-bold text-amber-300">
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
