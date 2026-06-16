// Game-wide types. Mirrored on the client in /client/src/types.ts.

export type CardType =
  | 'monster'
  | 'curse'
  | 'race'
  | 'class'
  | 'item'
  | 'oneShot'
  | 'levelUp'
  | 'helper';

export type Slot =
  | 'head'
  | 'body'
  | 'feet'
  | 'hand'
  | 'twoHands'
  | 'none';

export interface Card {
  id: string;
  type: CardType;
  deck: 'door' | 'treasure';
  name: string;
  description: string;
  // Monster
  level?: number;
  treasures?: number;
  levelsAwarded?: number;
  badStuff?: string;
  // Item / equipment
  value?: number;
  bonus?: number;
  slot?: Slot;
  bigItem?: boolean;
  classRestriction?: string;
  raceRestriction?: string;
  // Helpers / one-shots
  combatBonus?: number;
  // Effect identifier resolved server-side
  special?: string;
  // Free-form tags ('undead', etc) — see cards/tags.ts
  tags?: string[];
}

export type Variant = 'quick' | 'medium' | 'long' | 'cooperative';
export type CoopObjective = 'bossFight' | 'dungeonTrail' | 'surviveRounds';

export interface RoomConfig {
  playerCount: number;
  winLevel: number;
  startingHandDoors: number;
  startingHandTreasures: number;

  variant: Variant;

  turnTimerSeconds: number | null;
  globalTimerMinutes: number | null;

  listeningAtTheDoor: boolean;
  marketEnabled: boolean;
  marketSize: number;
  fistMechanicEnabled: boolean;

  twoPlayerDualCharacter: boolean;
  aggressionMinLevel: number;

  coopObjective: CoopObjective;
  coopBossLevel: number;
  coopTrailSize: number;
  coopRounds: number;
  threatTrackEnabled: boolean;

  noOffensiveCurses: boolean;
  noStealing: boolean;
  noDeath: boolean;
}

export interface Munchkin {
  // Per-character state. A normal player IS their munchkin; the dual-character
  // mode stores the inactive alt in `Player.characters`.
  level: number;
  hand: Card[];
  equipped: Card[];
  carried: Card[];
  race: Card | null;
  class: Card | null;
  combatPower: number;
}

export interface Player extends Munchkin {
  id: string;
  name: string;
  socketId: string | null;   // null while disconnected
  isAlive: boolean;
  fistCards: Card[];
  color: string;
  ready: boolean;
  // For Halfling first-sale-of-turn double bonus.
  halflingSoldThisTurn?: boolean;
  // Dual-character mode: zero or more alternate Munchkins.
  characters?: Munchkin[];
  // Bot seats are real players (same authoritative state) with no socket
  // attached. The server-side BotDriver picks actions on their behalf.
  isBot?: boolean;
  botDifficulty?: 'easy' | 'normal' | 'hard';
}

export type TurnPhase =
  | 'turnStart'
  | 'listening'
  | 'kickDoor'
  | 'combat'
  | 'lookForTroubleOrLoot'
  | 'charity'
  | 'endTurn';

export interface CombatState {
  attackerId: string;
  monsters: Card[];
  monsterPower: number;
  playerPower: number;
  alliedPlayerId: string | null;
  cardsPlayedThisRound: { playerId: string; card: Card; side: 'player' | 'monster' }[];
  resolved: boolean;
  result: 'pending' | 'victory' | 'flee' | 'badStuff';
  fleeBonus: number;          // negative modifiers reducing flee roll
}

export interface LogEntry {
  id: string;
  ts: number;
  text: string;
  kind: 'info' | 'combat' | 'curse' | 'level' | 'system';
}

export interface GameState {
  roomCode: string;
  config: RoomConfig;
  phase: 'lobby' | 'playing' | 'ended';
  turnPhase: TurnPhase;
  turn: number;
  activePlayerId: string | null;
  players: Player[];
  doorDeckSize: number;
  treasureDeckSize: number;
  doorDiscardTop: Card | null;
  treasureDiscardTop: Card | null;
  market: Card[];
  threatTrack: number;
  coopMonstersDefeated: number;
  coopBossHpRemaining: number;
  log: LogEntry[];
  combatState: CombatState | null;
  winnerId: string | null;
  turnTimerEndsAt: number | null;
  globalTimerEndsAt: number | null;
}

export interface EndResult {
  outcome: 'win' | 'lose' | 'timeout';
  winnerId?: string | null;
  reason: string;
}

export const PLAYER_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#ec4899',
];
