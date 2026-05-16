import type { GameState, RoomConfig, Variant, CoopObjective } from '../types';
import { emit } from '../hooks/useSocket';

export function Lobby({
  state,
  myId,
  onBoardMode,
}: {
  state: GameState;
  myId: string;
  onBoardMode: () => void;
}) {
  const me = state.players.find((p) => p.id === myId);
  // Best-effort creator detection: first player in the room.
  const isCreator = state.players[0]?.id === myId;
  const cfg = state.config;

  function update<K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) {
    emit('room:updateConfig', { [key]: value }).catch(() => {});
  }

  function start() {
    emit('room:start').catch((e) => alert(e.message));
  }

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-2xl mx-auto">
      <div className="card-shell p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase opacity-60">Room</div>
          <div className="text-3xl font-bold text-amber-400 tracking-widest">{state.roomCode}</div>
        </div>
        <button className="btn" onClick={onBoardMode}>Board mode</button>
      </div>

      <div className="card-shell p-4">
        <div className="text-xs uppercase opacity-60 mb-2">Players ({state.players.length})</div>
        <div className="space-y-2">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-slate-900/60 rounded-lg px-3 py-2">
              <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              <div className="flex-1">{p.name}{p.id === myId && ' (you)'}</div>
              <div className="text-xs opacity-60">{p.socketId ? 'online' : 'offline'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-shell p-4 space-y-3">
        <div className="text-xs uppercase opacity-60">Configuration {isCreator ? '' : '(read-only)'}</div>
        <Field label="Variant">
          <select
            disabled={!isCreator}
            value={cfg.variant}
            onChange={(e) => update('variant', e.target.value as Variant)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
          >
            <option value="quick">Rápida</option>
            <option value="medium">Média</option>
            <option value="long">Longa</option>
            <option value="cooperative">Cooperativa</option>
          </select>
        </Field>
        <Field label="Win level">
          <select
            disabled={!isCreator}
            value={cfg.winLevel}
            onChange={(e) => update('winLevel', parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
          >
            {[6, 7, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Players (max)">
          <select
            disabled={!isCreator}
            value={cfg.playerCount}
            onChange={(e) => update('playerCount', parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
          >
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Starting hand (doors)">
          <input
            type="number" min={3} max={6}
            disabled={!isCreator}
            value={cfg.startingHandDoors}
            onChange={(e) => update('startingHandDoors', parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
          />
        </Field>
        <Field label="Starting hand (treasures)">
          <input
            type="number" min={3} max={6}
            disabled={!isCreator}
            value={cfg.startingHandTreasures}
            onChange={(e) => update('startingHandTreasures', parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
          />
        </Field>
        <Toggle label="Listen at the door" checked={cfg.listeningAtTheDoor} disabled={!isCreator} onChange={(v) => update('listeningAtTheDoor', v)} />
        <Toggle label="Market" checked={cfg.marketEnabled} disabled={!isCreator} onChange={(v) => update('marketEnabled', v)} />
        {cfg.marketEnabled && (
          <Field label="Market size">
            <select
              disabled={!isCreator}
              value={cfg.marketSize}
              onChange={(e) => update('marketSize', parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </Field>
        )}
        <Toggle label="Fist mechanic" checked={cfg.fistMechanicEnabled} disabled={!isCreator} onChange={(v) => update('fistMechanicEnabled', v)} />
        <Toggle label="No offensive curses" checked={cfg.noOffensiveCurses} disabled={!isCreator} onChange={(v) => update('noOffensiveCurses', v)} />
        <Toggle label="No stealing" checked={cfg.noStealing} disabled={!isCreator} onChange={(v) => update('noStealing', v)} />
        <Toggle label="No death (lose half items)" checked={cfg.noDeath} disabled={!isCreator} onChange={(v) => update('noDeath', v)} />
        <Field label="Turn timer (s)">
          <input
            type="number" min={0}
            disabled={!isCreator}
            value={cfg.turnTimerSeconds ?? 0}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              update('turnTimerSeconds', v > 0 ? v : null);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
          />
        </Field>
        <Field label="Global timer (min)">
          <input
            type="number" min={0}
            disabled={!isCreator}
            value={cfg.globalTimerMinutes ?? 0}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              update('globalTimerMinutes', v > 0 ? v : null);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
          />
        </Field>
        {cfg.variant === 'cooperative' && (
          <>
            <Field label="Coop objective">
              <select
                disabled={!isCreator}
                value={cfg.coopObjective}
                onChange={(e) => update('coopObjective', e.target.value as CoopObjective)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
              >
                <option value="bossFight">Boss fight</option>
                <option value="dungeonTrail">Dungeon trail</option>
                <option value="surviveRounds">Survive rounds</option>
              </select>
            </Field>
            <Field label="Boss level">
              <input
                type="number" min={5} max={50}
                disabled={!isCreator}
                value={cfg.coopBossLevel}
                onChange={(e) => update('coopBossLevel', parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
              />
            </Field>
            <Field label="Trail size">
              <input
                type="number" min={3} max={20}
                disabled={!isCreator}
                value={cfg.coopTrailSize}
                onChange={(e) => update('coopTrailSize', parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
              />
            </Field>
            <Field label="Rounds">
              <input
                type="number" min={3} max={20}
                disabled={!isCreator}
                value={cfg.coopRounds}
                onChange={(e) => update('coopRounds', parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 w-20"
              />
            </Field>
            <Toggle label="Threat track" checked={cfg.threatTrackEnabled} disabled={!isCreator} onChange={(v) => update('threatTrackEnabled', v)} />
          </>
        )}
      </div>

      {isCreator ? (
        <button
          className="btn-primary w-full text-lg"
          disabled={state.players.length < 2}
          onClick={start}
        >
          Start game ({state.players.length}/{cfg.playerCount})
        </button>
      ) : (
        <div className="text-center opacity-70 text-sm">Waiting for {state.players[0]?.name ?? 'host'} to start…</div>
      )}
      {me && !me.socketId && <div className="text-red-400 text-center">Disconnected</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm opacity-80">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm opacity-80">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-amber-500"
      />
    </label>
  );
}
