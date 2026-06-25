import { GameRoom } from '../GameRoom.js';
import type { GameState, Variant } from '../types.js';
import { applyBotAction, IllegalBotAction } from './dispatcher.js';
import { getPolicy } from './factory.js';
import type { BotAction, BotDifficulty } from './policy.js';

export interface MatchConfig {
  variant: Variant;
  playerCount: number;
  difficulties: BotDifficulty[];     // one per seat
  seed?: number;
  maxTurns?: number;
  winLevel?: number;
}

export interface MatchResult {
  variant: Variant;
  playerCount: number;
  finished: boolean;
  outcome: 'win' | 'timeout' | 'deadlock';
  winnerId: string | null;
  winnerName: string | null;
  winnerDifficulty: BotDifficulty | null;
  turns: number;
  illegalAttempts: number;
  durationMs: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run a single bot-only match in-process and return summary statistics.
 * No sockets, no timers — uses the same GameRoom that backs production rooms.
 */
export function runMatch(cfg: MatchConfig): MatchResult {
  const started = Date.now();
  const rng = mulberry32(cfg.seed ?? Math.floor(Math.random() * 0xffffffff));
  const room = new GameRoom({
    variant: cfg.variant,
    playerCount: cfg.playerCount,
    turnTimerSeconds: 0,
    globalTimerMinutes: 0,
    ...(cfg.winLevel != null ? { winLevel: cfg.winLevel } : {}),
  });
  const seats: { id: string; difficulty: BotDifficulty }[] = [];
  for (let i = 0; i < cfg.playerCount; i++) {
    const difficulty = cfg.difficulties[i] ?? cfg.difficulties[0] ?? 'easy';
    const p = room.addPlayer(`Bot${i + 1}`, `sim-seat-${i}`);
    seats.push({ id: p.id, difficulty });
  }
  room.start();

  const maxTurns = cfg.maxTurns ?? 2000;
  let illegalAttempts = 0;
  let outcome: MatchResult['outcome'] = 'deadlock';

  while (room.phase === 'playing' && room.turn <= maxTurns) {
    const activeId = room.activePlayerId;
    if (!activeId) break;
    const seat = seats.find((s) => s.id === activeId);
    if (!seat) {
      room.endTurn();
      continue;
    }
    const policy = getPolicy(seat.difficulty);
    const action = policy.decide({ room, playerId: activeId, rng });
    try {
      applyBotAction(room, activeId, action);
    } catch (err) {
      if (err instanceof IllegalBotAction) {
        illegalAttempts += 1;
        // The action was rejected mid-turn — advance the turn to avoid stalling.
        try { room.endTurn(); } catch { /* ignore */ }
        continue;
      }
      throw err;
    }
  }

  if (room.phase === 'ended') {
    outcome = room.winnerId ? 'win' : 'timeout';
  }
  const winnerId = room.winnerId ?? null;
  const winnerSeat = winnerId ? seats.find((s) => s.id === winnerId) : null;
  const winnerPlayer = winnerId ? room.players.find((p) => p.id === winnerId) : null;

  return {
    variant: cfg.variant,
    playerCount: cfg.playerCount,
    finished: room.phase === 'ended',
    outcome,
    winnerId,
    winnerName: winnerPlayer?.name ?? null,
    winnerDifficulty: winnerSeat?.difficulty ?? null,
    turns: room.turn,
    illegalAttempts,
    durationMs: Date.now() - started,
  };
}

export interface BatchOptions extends Omit<MatchConfig, 'seed'> {
  runs: number;
  baseSeed?: number;
}

export interface BatchReport {
  runs: number;
  finished: number;
  deadlocked: number;
  avgTurns: number;
  avgDurationMs: number;
  winsByDifficulty: Record<BotDifficulty, number>;
  totalIllegalAttempts: number;
  results: MatchResult[];
}

export interface ReplayFrame {
  /** Public snapshot of the room at this frame. */
  state: GameState;
  /** Action that was about to be applied; null on the initial frame. */
  action: BotAction | null;
  /** Difficulty of the bot whose turn it was (null on the initial frame). */
  difficulty: BotDifficulty | null;
  /** Sequence index (0 = initial state, then 1 per action). */
  index: number;
}

export interface ReplayRecording extends MatchResult {
  frames: ReplayFrame[];
}

/**
 * Like runMatch, but captures a snapshot before each action so the result
 * can be played back in the UI. Capped by maxFrames to bound memory.
 */
export function recordMatch(cfg: MatchConfig & { maxFrames?: number }): ReplayRecording {
  const started = Date.now();
  const rng = mulberry32(cfg.seed ?? Math.floor(Math.random() * 0xffffffff));
  const room = new GameRoom({
    variant: cfg.variant,
    playerCount: cfg.playerCount,
    turnTimerSeconds: 0,
    globalTimerMinutes: 0,
    ...(cfg.winLevel != null ? { winLevel: cfg.winLevel } : {}),
  });
  const seats: { id: string; difficulty: BotDifficulty }[] = [];
  for (let i = 0; i < cfg.playerCount; i++) {
    const difficulty = cfg.difficulties[i] ?? cfg.difficulties[0] ?? 'easy';
    const p = room.addPlayer(`Bot${i + 1}`, `sim-seat-${i}`);
    seats.push({ id: p.id, difficulty });
  }
  room.start();

  const maxTurns = cfg.maxTurns ?? 2000;
  const maxFrames = cfg.maxFrames ?? 800;
  let illegalAttempts = 0;
  let outcome: MatchResult['outcome'] = 'deadlock';
  const frames: ReplayFrame[] = [
    { state: room.snapshot(), action: null, difficulty: null, index: 0 },
  ];

  while (room.phase === 'playing' && room.turn <= maxTurns && frames.length < maxFrames) {
    const activeId = room.activePlayerId;
    if (!activeId) break;
    const seat = seats.find((s) => s.id === activeId);
    if (!seat) {
      room.endTurn();
      continue;
    }
    const policy = getPolicy(seat.difficulty);
    const action = policy.decide({ room, playerId: activeId, rng });
    try {
      applyBotAction(room, activeId, action);
      frames.push({
        state: room.snapshot(),
        action,
        difficulty: seat.difficulty,
        index: frames.length,
      });
    } catch (err) {
      if (err instanceof IllegalBotAction) {
        illegalAttempts += 1;
        try { room.endTurn(); } catch { /* ignore */ }
        continue;
      }
      throw err;
    }
  }

  if (room.phase === 'ended') outcome = room.winnerId ? 'win' : 'timeout';
  const winnerId = room.winnerId ?? null;
  const winnerSeat = winnerId ? seats.find((s) => s.id === winnerId) : null;
  const winnerPlayer = winnerId ? room.players.find((p) => p.id === winnerId) : null;
  return {
    variant: cfg.variant,
    playerCount: cfg.playerCount,
    finished: room.phase === 'ended',
    outcome,
    winnerId,
    winnerName: winnerPlayer?.name ?? null,
    winnerDifficulty: winnerSeat?.difficulty ?? null,
    turns: room.turn,
    illegalAttempts,
    durationMs: Date.now() - started,
    frames,
  };
}

export function runBatch(opts: BatchOptions): BatchReport {
  const results: MatchResult[] = [];
  const baseSeed = opts.baseSeed ?? Math.floor(Math.random() * 0xffffffff);
  for (let i = 0; i < opts.runs; i++) {
    results.push(runMatch({ ...opts, seed: baseSeed + i }));
  }
  const finished = results.filter((r) => r.finished).length;
  const deadlocked = results.filter((r) => r.outcome === 'deadlock').length;
  const avgTurns = results.reduce((s, r) => s + r.turns, 0) / Math.max(1, results.length);
  const avgDurationMs = results.reduce((s, r) => s + r.durationMs, 0) / Math.max(1, results.length);
  const winsByDifficulty: Record<BotDifficulty, number> = { easy: 0, normal: 0, hard: 0 };
  for (const r of results) {
    if (r.winnerDifficulty) winsByDifficulty[r.winnerDifficulty] += 1;
  }
  const totalIllegalAttempts = results.reduce((s, r) => s + r.illegalAttempts, 0);
  return { runs: results.length, finished, deadlocked, avgTurns, avgDurationMs, winsByDifficulty, totalIllegalAttempts, results };
}
