import type { GameRoom } from '../GameRoom.js';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export type BotAction =
  | { kind: 'kickDoor' }
  | { kind: 'listenAtDoor' }
  | { kind: 'fight' }
  | { kind: 'flee' }
  | { kind: 'lootRoom' }
  | { kind: 'endTurn' }
  | { kind: 'playCard'; cardId: string; targetId?: string }
  | { kind: 'sellItems'; cardIds: string[] }
  | { kind: 'helpInCombat' }
  | { kind: 'pass' };

export interface BotContext {
  room: GameRoom;
  playerId: string;
  rng: () => number;
}

export interface BotPolicy {
  readonly difficulty: BotDifficulty;
  decide(ctx: BotContext): BotAction;
  /**
   * Called when another player asks this bot for help in their active combat.
   * Defaults to refusing if not implemented.
   */
  shouldHelp?(ctx: BotContext): boolean;
}
