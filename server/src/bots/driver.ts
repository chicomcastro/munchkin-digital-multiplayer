import type { GameRoom } from '../GameRoom.js';
import { applyBotAction, IllegalBotAction } from './dispatcher.js';
import { getPolicy } from './factory.js';
import type { BotDifficulty } from './policy.js';

export interface BotDriverOptions {
  /** Delay (ms) before the bot's next action. Use 0 in tests for immediate dispatch. */
  delayMs?: number | ((difficulty: BotDifficulty) => number);
  rng?: () => number;
  /** Used by tests to swap setTimeout for a manual scheduler. */
  scheduler?: (cb: () => void, ms: number) => () => void;
}

const defaultDelay = (d: BotDifficulty): number => {
  switch (d) {
    case 'easy': return 700;
    case 'normal': return 900;
    case 'hard': return 1200;
  }
};

const defaultScheduler = (cb: () => void, ms: number): (() => void) => {
  const t = setTimeout(cb, ms);
  t.unref?.();
  return () => clearTimeout(t);
};

/**
 * Drives bot turns inside a live GameRoom. The room is the authority — the
 * driver simply listens to state changes and, whenever the active player is
 * a bot, picks an action via the configured policy and dispatches it after a
 * short "thinking" delay.
 */
export class BotDriver {
  private cancel: (() => void) | null = null;
  private acting = false;
  private disposed = false;
  private readonly delay: (d: BotDifficulty) => number;
  private readonly rng: () => number;
  private readonly scheduler: (cb: () => void, ms: number) => () => void;
  private readonly unsubscribe: () => void;

  constructor(private readonly room: GameRoom, opts: BotDriverOptions = {}) {
    const d = opts.delayMs ?? defaultDelay;
    this.delay = typeof d === 'function' ? d : () => d;
    this.rng = opts.rng ?? Math.random;
    this.scheduler = opts.scheduler ?? defaultScheduler;
    this.unsubscribe = room.subscribe(() => this.schedule());
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe();
    if (this.cancel) {
      this.cancel();
      this.cancel = null;
    }
  }

  private schedule(): void {
    if (this.disposed || this.acting || this.cancel) return;
    if (this.room.phase !== 'playing') return;
    const activeId = this.room.activePlayerId;
    if (!activeId) return;
    const player = this.room.players.find((p) => p.id === activeId);
    if (!player?.isBot) return;
    const difficulty = player.botDifficulty ?? 'easy';
    this.cancel = this.scheduler(() => {
      this.cancel = null;
      this.tick();
    }, this.delay(difficulty));
  }

  private tick(): void {
    if (this.disposed) return;
    if (this.room.phase !== 'playing') return;
    const activeId = this.room.activePlayerId;
    if (!activeId) return;
    const player = this.room.players.find((p) => p.id === activeId);
    if (!player?.isBot) return;
    const difficulty = player.botDifficulty ?? 'easy';
    const policy = getPolicy(difficulty);
    this.acting = true;
    try {
      const action = policy.decide({ room: this.room, playerId: activeId, rng: this.rng });
      applyBotAction(this.room, activeId, action);
    } catch (err) {
      if (err instanceof IllegalBotAction) {
        try { this.room.endTurn(); } catch { /* ignored */ }
      } else {
        throw err;
      }
    } finally {
      this.acting = false;
    }
    this.schedule();
  }
}
