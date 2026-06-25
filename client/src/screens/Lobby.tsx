import { useState } from 'react';
import type { GameState, RoomConfig, Variant, CoopObjective } from '../types';
import { emit } from '../hooks/useSocket';
import { PRESETS, type Preset } from '../presets';
import { t, variantLabels } from '../i18n';

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
  const isCreator = state.players[0]?.id === myId;
  const cfg = state.config;
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  function update<K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) {
    emit('room:updateConfig', { [key]: value }).catch(() => {});
  }

  function applyPreset(p: Preset) {
    emit('room:updateConfig', p.config).catch((e) => alert(e.message));
    setShowConfig(false);
  }

  function start() {
    emit('room:start').catch((e) => alert(e.message));
  }

  async function shareCode() {
    const url = window.location.origin + `/?code=${state.roomCode}`;
    const shareData = { title: 'Munchkin', text: `Entra na sala ${state.roomCode}`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(state.roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user-cancel — silent */
    }
  }

  return (
    <div className="min-h-screen pb-28 p-4 pt-12 space-y-4 max-w-2xl xl:max-w-6xl mx-auto xl:grid xl:grid-cols-[1fr_1fr] xl:gap-4 xl:space-y-0 xl:items-start">
      <div className="card-shell p-4 flex items-center justify-between gap-3 anim-fade xl:col-start-1 xl:row-start-1">
        <div className="min-w-0">
          <div className="text-xs uppercase opacity-60">{t.room}</div>
          <div className="text-3xl font-bold text-amber-400 tracking-widest font-mono font-display">{state.roomCode}</div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button className="btn text-sm py-2" onClick={shareCode} aria-label={t.share}>
            {copied ? t.copied : t.share}
          </button>
          <button className="btn text-sm py-2" onClick={onBoardMode}>{t.boardMode}</button>
        </div>
      </div>

      {isCreator && (
        <div className="card-shell p-4 anim-fade xl:col-start-2 xl:row-start-1">
          <div className="text-xs uppercase opacity-60 mb-2">{t.presets}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left rounded-xl bg-amber-900/50 hover:bg-amber-800/50 active:bg-amber-950/60 px-3 py-2 transition-colors"
              >
                <div className="font-bold text-sm text-amber-300">{p.label}</div>
                <div className="text-xs opacity-70 mt-0.5 leading-snug">{p.description}</div>
              </button>
            ))}
          </div>
          <div className="text-xs opacity-50 mt-2">{t.presetsHint}</div>
        </div>
      )}

      <div className="card-shell p-4 xl:col-start-1 xl:row-start-2">
        <div className="text-xs uppercase opacity-60 mb-2">
          {t.players} ({state.players.length}/{cfg.playerCount})
        </div>
        <div className="space-y-2">
          {state.players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-amber-950/40 rounded-lg px-3 py-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
              <div className="flex-1 truncate">
                {p.name}{p.id === myId && ' (você)'}
                {p.isBot && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide bg-indigo-700/70 text-indigo-100 rounded px-1.5 py-0.5 font-bold align-middle">
                    {t.bot}
                    {p.botDifficulty && ` · ${
                      p.botDifficulty === 'easy' ? t.botDifficultyEasy
                      : p.botDifficulty === 'normal' ? t.botDifficultyNormal
                      : t.botDifficultyHard
                    }`}
                  </span>
                )}
              </div>
              {!p.isBot && (p.ready ? (
                <span className="text-xs bg-emerald-600/80 text-white rounded-full px-2 py-0.5 font-bold">✓ {t.ready}</span>
              ) : (
                <span className="text-xs opacity-50">{t.notReady}</span>
              ))}
              {!p.isBot && (
                <div className="text-xs opacity-60">{p.socketId ? t.online : t.offline}</div>
              )}
              {p.isBot && isCreator && (
                <button
                  type="button"
                  onClick={() => emit('room:removeBot', { botId: p.id }).catch((e) => alert(e.message))}
                  className="text-xs bg-red-900/60 hover:bg-red-800/60 text-red-100 rounded px-2 py-0.5 font-bold"
                  aria-label={`${t.removeBot} ${p.name}`}
                >
                  {t.removeBot}
                </button>
              )}
            </div>
          ))}
        </div>
        {isCreator && state.players.length < cfg.playerCount && (
          <AddBotControl />
        )}
        {me && (
          <button
            type="button"
            onClick={() => emit('room:toggleReady', { ready: !me.ready }).catch(() => {})}
            className={[
              'mt-3 w-full text-sm py-2 rounded-xl font-bold transition-colors',
              me.ready
                ? 'bg-amber-900/60 hover:bg-amber-800/60 text-amber-100'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white',
            ].join(' ')}
          >
            {me.ready ? t.toggleNotReady : t.toggleReady}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowConfig((v) => !v)}
        className="w-full text-left text-sm bg-amber-950/40 hover:bg-amber-950/60 border border-amber-800/30 rounded-xl px-4 py-3 flex items-center justify-between xl:col-start-2 xl:row-start-2"
      >
        <span className="opacity-80">{showConfig ? t.hideConfig : t.showConfig}</span>
        <span className="opacity-60 text-xs">{showConfig ? '▲' : '▼'}</span>
      </button>

      {showConfig && (
        <div className="card-shell p-4 space-y-3 anim-fade xl:col-start-2 xl:row-start-3">
          <div className="text-xs uppercase opacity-60">
            {t.configuration} {isCreator ? '' : t.configReadOnly}
          </div>
          <Field label={t.variant}>
            <select
              disabled={!isCreator}
              value={cfg.variant}
              onChange={(e) => update('variant', e.target.value as Variant)}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1"
            >
              <option value="quick">{variantLabels.quick}</option>
              <option value="medium">{variantLabels.medium}</option>
              <option value="long">{variantLabels.long}</option>
              <option value="cooperative">{variantLabels.cooperative}</option>
            </select>
          </Field>
          <Field label={t.winLevel}>
            <select
              disabled={!isCreator}
              value={cfg.winLevel}
              onChange={(e) => update('winLevel', parseInt(e.target.value))}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1"
            >
              {[6, 7, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label={t.playerCount}>
            <select
              disabled={!isCreator}
              value={cfg.playerCount}
              onChange={(e) => update('playerCount', parseInt(e.target.value))}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1"
            >
              {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label={t.startingHandDoors}>
            <input
              type="number" min={3} max={6}
              disabled={!isCreator}
              value={cfg.startingHandDoors}
              onChange={(e) => update('startingHandDoors', parseInt(e.target.value))}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
            />
          </Field>
          <Field label={t.startingHandTreasures}>
            <input
              type="number" min={3} max={6}
              disabled={!isCreator}
              value={cfg.startingHandTreasures}
              onChange={(e) => update('startingHandTreasures', parseInt(e.target.value))}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
            />
          </Field>
          <Toggle label={t.listeningAtTheDoor} tip={t.tipListening} checked={cfg.listeningAtTheDoor} disabled={!isCreator} onChange={(v) => update('listeningAtTheDoor', v)} />
          <Toggle label={t.marketEnabled} tip={t.tipMarket} checked={cfg.marketEnabled} disabled={!isCreator} onChange={(v) => update('marketEnabled', v)} />
          {cfg.marketEnabled && (
            <Field label={t.marketSize}>
              <select
                disabled={!isCreator}
                value={cfg.marketSize}
                onChange={(e) => update('marketSize', parseInt(e.target.value))}
                className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
            </Field>
          )}
          <Toggle label={t.fistMechanic} tip={t.tipFist} checked={cfg.fistMechanicEnabled} disabled={!isCreator} onChange={(v) => update('fistMechanicEnabled', v)} />
          <Toggle label={t.noOffensiveCurses} tip={t.tipNoOffensiveCurses} checked={cfg.noOffensiveCurses} disabled={!isCreator} onChange={(v) => update('noOffensiveCurses', v)} />
          <Toggle label={t.noStealing} tip={t.tipNoStealing} checked={cfg.noStealing} disabled={!isCreator} onChange={(v) => update('noStealing', v)} />
          <Toggle label={t.noDeath} tip={t.tipNoDeath} checked={cfg.noDeath} disabled={!isCreator} onChange={(v) => update('noDeath', v)} />
          <Field label={t.turnTimerSeconds}>
            <input
              type="number" min={0}
              disabled={!isCreator}
              value={cfg.turnTimerSeconds ?? 0}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                update('turnTimerSeconds', v > 0 ? v : null);
              }}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
            />
          </Field>
          <Field label={t.globalTimerMinutes}>
            <input
              type="number" min={0}
              disabled={!isCreator}
              value={cfg.globalTimerMinutes ?? 0}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                update('globalTimerMinutes', v > 0 ? v : null);
              }}
              className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
            />
          </Field>
          {cfg.variant === 'cooperative' && (
            <>
              <Field label={t.coopObjective}>
                <select
                  disabled={!isCreator}
                  value={cfg.coopObjective}
                  onChange={(e) => update('coopObjective', e.target.value as CoopObjective)}
                  className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1"
                >
                  <option value="bossFight">{t.coopObjectiveBoss}</option>
                  <option value="dungeonTrail">{t.coopObjectiveTrail}</option>
                  <option value="surviveRounds">{t.coopObjectiveSurvive}</option>
                </select>
              </Field>
              <Field label={t.coopBossLevel}>
                <input
                  type="number" min={5} max={50}
                  disabled={!isCreator}
                  value={cfg.coopBossLevel}
                  onChange={(e) => update('coopBossLevel', parseInt(e.target.value))}
                  className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
                />
              </Field>
              <Field label={t.coopTrailSize}>
                <input
                  type="number" min={3} max={20}
                  disabled={!isCreator}
                  value={cfg.coopTrailSize}
                  onChange={(e) => update('coopTrailSize', parseInt(e.target.value))}
                  className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
                />
              </Field>
              <Field label={t.coopRounds}>
                <input
                  type="number" min={3} max={20}
                  disabled={!isCreator}
                  value={cfg.coopRounds}
                  onChange={(e) => update('coopRounds', parseInt(e.target.value))}
                  className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1 w-20"
                />
              </Field>
              <Toggle label={t.threatTrackEnabled} tip={t.tipThreatTrack} checked={cfg.threatTrackEnabled} disabled={!isCreator} onChange={(v) => update('threatTrackEnabled', v)} />
            </>
          )}
        </div>
      )}

      {me && !me.socketId && <div className="text-red-400 text-center xl:col-span-2">{t.disconnectedLabel}</div>}

      {/* Sticky footer — primary action stays in reach without scrolling */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-[#0f0c06] via-[rgba(15,12,6,0.95)] to-transparent p-4 pt-8 backdrop-blur-sm border-t border-amber-800/30 shadow-[0_-16px_32px_-16px_rgba(0,0,0,0.7)]">
        <div className="max-w-2xl xl:max-w-3xl mx-auto">
          {isCreator ? (
            <button
              className="btn-primary w-full text-lg"
              disabled={state.players.length < 2}
              onClick={start}
            >
              {t.startGame} ({state.players.length}/{cfg.playerCount})
            </button>
          ) : (
            <div className="text-center opacity-70 text-sm bg-amber-950/60 rounded-xl py-3">
              {t.waitingForHost(state.players[0]?.name ?? 'host')}
            </div>
          )}
        </div>
      </div>
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

type BotDifficulty = 'easy' | 'normal' | 'hard';

function AddBotControl() {
  const [difficulty, setDifficulty] = useState<BotDifficulty>('easy');
  return (
    <div className="mt-3 flex items-center gap-2">
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value as BotDifficulty)}
        aria-label={t.botDifficulty}
        className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1.5 text-sm"
      >
        <option value="easy">{t.botDifficultyEasy}</option>
        <option value="normal">{t.botDifficultyNormal}</option>
        <option value="hard">{t.botDifficultyHard}</option>
      </select>
      <button
        type="button"
        onClick={() => emit('room:addBot', { difficulty }).catch((e) => alert(e.message))}
        className="flex-1 text-sm py-2 rounded-xl font-bold bg-indigo-700 hover:bg-indigo-600 text-white"
      >
        + {t.addBot}
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  tip,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  tip?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm opacity-80 flex items-center gap-1.5">
        {label}
        {tip && (
          <span
            title={tip}
            aria-label={tip}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-900/50 text-[10px] opacity-70 cursor-help"
          >
            ?
          </span>
        )}
      </span>
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
