import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, GameState } from '../types';
import { CardView } from '../components/Card';
import { CombatArena } from '../components/CombatArena';
import { emit } from '../hooks/useSocket';

export function PlayerView({
  state,
  hand,
  fist,
  myId,
  onBoardMode,
}: {
  state: GameState;
  hand: Card[];
  fist: Card[];
  myId: string;
  onBoardMode: () => void;
}) {
  const me = state.players.find((p) => p.id === myId)!;
  const active = state.activePlayerId === myId;
  const activePlayer = state.players.find((p) => p.id === state.activePlayerId);
  const combat = state.combatState;
  const inCombat = !!combat && !combat.resolved;
  const amInCombat =
    inCombat && (combat!.attackerId === myId || combat!.alliedPlayerId === myId);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [sellPicker, setSellPicker] = useState<Set<string>>(new Set());
  const [targetMode, setTargetMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

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

  // Vibrate at start of your turn
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      try { navigator.vibrate?.([60, 40, 60]); } catch {}
    }
    wasActive.current = active;
  }, [active]);

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
    <div className="min-h-screen flex flex-col">
      <header className="card-shell m-3 p-3" style={{ borderTop: `4px solid ${me.color}` }}>
        <div className="flex justify-between items-baseline">
          <div>
            <div className="text-xs opacity-60">Room {state.roomCode} · Turn {state.turn}</div>
            <div className="text-2xl font-bold">
              Level <span className="text-amber-400">{me.level}</span> · Power {me.combatPower}
            </div>
            <div className="text-xs opacity-70 mt-1">
              {me.race?.name ?? 'No race'} / {me.class?.name ?? 'No class'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase opacity-60">Active</div>
            <div className="font-bold" style={{ color: activePlayer?.color }}>{activePlayer?.name}</div>
            {secondsLeft != null && (
              <div className={['text-sm font-bold', secondsLeft < 10 ? 'text-red-400' : ''].join(' ')}>{secondsLeft}s</div>
            )}
            <button onClick={onBoardMode} className="text-xs underline opacity-70 mt-1">board mode</button>
          </div>
        </div>
        {me.equipped.length > 0 && (
          <div className="flex gap-1 overflow-x-auto mt-2 pb-1">
            {me.equipped.map((c) => (
              <div key={c.id} className="bg-amber-900/60 border border-amber-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                {c.name} <span className="opacity-70">+{c.bonus ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {inCombat && combat && (
        <div className="px-3 mb-2">
          <CombatArena combat={combat} players={state.players} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {amInCombat ? (
              <>
                {combat.attackerId === myId && (
                  <button className="btn-primary" onClick={() => emit('game:resolveCombat').catch((e) => alert(e.message))}>
                    Resolve combat
                  </button>
                )}
                <button className="btn-danger" onClick={() => emit('game:flee').catch((e) => alert(e.message))}>
                  Flee
                </button>
              </>
            ) : (
              !combat.alliedPlayerId && (
                <button className="btn col-span-2" onClick={() => emit('game:helpInCombat').catch((e) => alert(e.message))}>
                  Help in combat
                </button>
              )
            )}
          </div>
        </div>
      )}

      <main className="flex-1 px-3">
        <div className="text-xs uppercase opacity-60 mb-1">Your hand ({hand.length})</div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {hand.length === 0 && <div className="opacity-50 text-sm">empty</div>}
          {hand.map((c) => (
            <CardView
              key={c.id}
              card={c}
              selected={selectedCard === c.id}
              onClick={() => setSelectedCard(selectedCard === c.id ? null : c.id)}
            />
          ))}
        </div>

        {selectedCardObj && (
          <div className="card-shell p-3 mt-2">
            <div className="font-bold">{selectedCardObj.name}</div>
            <div className="text-sm opacity-80">{selectedCardObj.description}</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(selectedCardObj.type === 'item' || selectedCardObj.type === 'race' || selectedCardObj.type === 'class' || selectedCardObj.type === 'levelUp') && (
                <button className="btn-primary col-span-2" onClick={() => playCard(selectedCardObj)}>
                  {selectedCardObj.type === 'item' ? 'Equip' : selectedCardObj.type === 'levelUp' ? 'Use' : 'Become'}
                </button>
              )}
              {(selectedCardObj.type === 'oneShot' || selectedCardObj.type === 'helper') && (
                <button className="btn-primary col-span-2" disabled={!inCombat} onClick={() => playCard(selectedCardObj)}>
                  Play into combat
                </button>
              )}
              {selectedCardObj.type === 'curse' && (
                <>
                  {!targetMode ? (
                    <button className="btn-danger col-span-2" onClick={() => setTargetMode(true)}>
                      Cast on…
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
                  Look for trouble
                </button>
              )}
              {selectedCardObj.value != null && selectedCardObj.value > 0 && (
                <button className="btn col-span-2" onClick={() => toggleSell(selectedCardObj.id)}>
                  {sellPicker.has(selectedCardObj.id) ? 'Unmark for sale' : 'Mark for sale'} ({selectedCardObj.value}gp)
                </button>
              )}
            </div>
          </div>
        )}

        {sellPicker.size > 0 && (
          <div className="card-shell p-3 mt-2">
            <div className="text-sm">Selling {sellPicker.size} items · total {sellTotal}gp ({Math.floor(sellTotal / 1000)} levels)</div>
            <button className="btn-primary w-full mt-2" disabled={sellTotal < 1000} onClick={confirmSell}>Sell for levels</button>
          </div>
        )}

        {fist.length > 0 && (
          <div className="mt-3">
            <div className="text-xs uppercase opacity-60 mb-1">Fist (reserve)</div>
            <div className="flex gap-2 overflow-x-auto">
              {fist.map((c) => (
                <CardView key={c.id} card={c} compact onClick={() => emit('fist:playCard', { cardId: c.id, targetCombat: inCombat }).catch((e) => alert(e.message))} />
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="card-shell m-3 p-3 sticky bottom-0">
        <div className="grid grid-cols-2 gap-2">
          {state.turnPhase === 'turnStart' && state.config.listeningAtTheDoor && (
            <button className="btn" disabled={!active} onClick={() => emit('game:listenDoor').catch((e) => alert(e.message))}>
              Listen
            </button>
          )}
          <button
            className="btn-primary"
            disabled={!active || !(state.turnPhase === 'turnStart' || state.turnPhase === 'kickDoor')}
            onClick={() => emit('game:kickDoor').catch((e) => alert(e.message))}
          >
            Kick door
          </button>
          <button
            className="btn"
            disabled={!active || state.turnPhase !== 'lookForTroubleOrLoot'}
            onClick={() => emit('game:lootRoom').catch((e) => alert(e.message))}
          >
            Loot room
          </button>
          <button
            className="btn"
            disabled={!active}
            onClick={() => emit('game:endTurn').catch((e) => alert(e.message))}
          >
            End turn
          </button>
        </div>
      </footer>
    </div>
  );
}
