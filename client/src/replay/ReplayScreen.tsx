import { useEffect, useMemo, useRef, useState } from 'react';
import { recordMatch, type ReplayRecording } from '@core/bots/runner.js';
import type { BotDifficulty } from '@core/bots/policy.js';
import type { Variant } from '../types';
import { BoardView } from '../screens/BoardView';
import { t } from '../i18n';

const PLAY_SPEEDS = [0.5, 1, 2, 4] as const;
type PlaySpeed = typeof PLAY_SPEEDS[number];

const PRESETS: { id: string; variant: Variant; players: number; difficulties: BotDifficulty[] }[] = [
  { id: 'h2', variant: 'long', players: 2, difficulties: ['hard', 'hard'] },
  { id: 'mix4', variant: 'long', players: 4, difficulties: ['easy', 'normal', 'hard', 'hard'] },
  { id: 'e4', variant: 'medium', players: 4, difficulties: ['easy', 'easy', 'easy', 'easy'] },
];

/**
 * Plays back a recorded bot-only match through BoardView, frame by frame.
 * Useful for studying bot behavior and as a no-input "lobby ambient" view.
 */
export function ReplayScreen({ onLeave }: { onLeave: () => void }) {
  const [presetId, setPresetId] = useState<string>(PRESETS[0]!.id);
  const [recording, setRecording] = useState<ReplayRecording | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId)!, [presetId]);

  function startRecording() {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const rec = recordMatch({
      variant: preset.variant,
      playerCount: preset.players,
      difficulties: preset.difficulties,
      maxFrames: 600,
      maxTurns: 1500,
      seed,
    });
    setRecording(rec);
    setIdx(0);
    setPlaying(true);
  }

  useEffect(() => {
    if (!playing || !recording) return;
    if (idx >= recording.frames.length - 1) {
      setPlaying(false);
      return;
    }
    const stepMs = 700 / speed;
    timerRef.current = setTimeout(() => setIdx((i) => Math.min(i + 1, recording.frames.length - 1)), stepMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, idx, recording, speed]);

  const frame = recording?.frames[idx] ?? null;
  const total = recording?.frames.length ?? 0;

  return (
    <div className="min-h-screen pt-app pb-8 px-3 max-w-6xl mx-auto" data-testid="replay-screen">
      <header className="card-shell p-4 anim-fade flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase opacity-60">{t.replay}</div>
          <div className="text-xl font-bold text-amber-400 font-display">{t.replayTitle}</div>
        </div>
        <button className="btn text-sm py-2" onClick={onLeave}>{t.leave}</button>
      </header>

      <div className="card-shell p-4 mb-3 flex flex-wrap items-center gap-3">
        <label className="text-xs uppercase opacity-60">{t.replayPreset}</label>
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="bg-[rgba(26,18,8,0.8)] border border-[rgba(139,90,43,0.35)] rounded-lg px-2 py-1.5 text-sm"
          aria-label={t.replayPreset}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.players}× {p.difficulties.join('/')} · {p.variant}
            </option>
          ))}
        </select>
        <button className="btn-primary text-sm py-2 px-4" onClick={startRecording} data-testid="replay-record">
          ▸ {t.replayGenerate}
        </button>
        {recording && (
          <div className="text-xs opacity-70">
            {t.replayOutcome}: {recording.outcome} · {recording.turns} {t.turn.toLowerCase()}s · {recording.winnerName ?? '—'}
          </div>
        )}
      </div>

      {recording && frame && (
        <>
          <div className="card-shell p-3 mb-3 flex items-center gap-3 flex-wrap">
            <button
              className="btn text-sm py-1.5 px-3"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx <= 0}
              aria-label={t.replayPrev}
            >◀</button>
            <button
              className="btn-primary text-sm py-1.5 px-4"
              onClick={() => setPlaying((p) => !p)}
              data-testid="replay-playpause"
            >
              {playing ? `❚❚ ${t.replayPause}` : `▸ ${t.replayPlay}`}
            </button>
            <button
              className="btn text-sm py-1.5 px-3"
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              disabled={idx >= total - 1}
              aria-label={t.replayNext}
            >▶</button>
            <div className="flex items-center gap-1 ml-2 text-xs opacity-70">
              <span>{t.replaySpeed}</span>
              {PLAY_SPEEDS.map((s) => (
                <button
                  key={s}
                  className={[
                    'px-2 py-0.5 rounded border text-xs',
                    s === speed ? 'bg-amber-500 text-amber-950 border-amber-400 font-bold' : 'bg-amber-950/40 border-amber-800/50',
                  ].join(' ')}
                  onClick={() => setSpeed(s)}
                >{s}×</button>
              ))}
            </div>
            <div className="ml-auto text-xs opacity-80 font-mono" data-testid="replay-progress">
              {idx + 1}/{total}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={total - 1}
            value={idx}
            onChange={(e) => { setPlaying(false); setIdx(parseInt(e.target.value, 10)); }}
            className="w-full accent-amber-500 mb-3"
            aria-label={t.replayScrub}
          />

          <BoardView state={frame.state} />
        </>
      )}

      {!recording && (
        <div className="card-shell p-6 text-center opacity-70 italic">{t.replayEmpty}</div>
      )}
    </div>
  );
}
