import { GameRoom } from './GameRoom.js';
import { Deck } from './Deck.js';
import type { Card, Player, RoomConfig } from './types.js';

let seq = 0;
export function id(prefix = 'c') {
  return `${prefix}-${++seq}`;
}

export function monster(over: Partial<Card> = {}): Card {
  return {
    id: id('m'),
    type: 'monster',
    deck: 'door',
    name: 'TestMonster',
    description: '',
    level: 1,
    treasures: 1,
    levelsAwarded: 1,
    badStuff: 'You lose 1 level.',
    ...over,
  };
}

export function curse(over: Partial<Card> = {}): Card {
  return {
    id: id('curse'),
    type: 'curse',
    deck: 'door',
    name: 'Curse',
    description: '',
    special: 'loseLevel',
    ...over,
  };
}

export function race(over: Partial<Card> = {}): Card {
  return {
    id: id('race'),
    type: 'race',
    deck: 'door',
    name: 'Elf',
    description: '',
    ...over,
  };
}

export function clazz(over: Partial<Card> = {}): Card {
  return {
    id: id('class'),
    type: 'class',
    deck: 'door',
    name: 'Warrior',
    description: '',
    ...over,
  };
}

export function item(over: Partial<Card> = {}): Card {
  return {
    id: id('item'),
    type: 'item',
    deck: 'treasure',
    name: 'Sword',
    description: '',
    value: 400,
    bonus: 2,
    slot: 'hand',
    ...over,
  };
}

export function oneShot(over: Partial<Card> = {}): Card {
  return {
    id: id('oneshot'),
    type: 'oneShot',
    deck: 'treasure',
    name: 'Potion',
    description: '',
    value: 100,
    combatBonus: 2,
    ...over,
  };
}

export function levelUp(over: Partial<Card> = {}): Card {
  return {
    id: id('lvup'),
    type: 'levelUp',
    deck: 'treasure',
    name: 'Level Up',
    description: '',
    value: 0,
    special: 'levelUp',
    ...over,
  };
}

export function helper(over: Partial<Card> = {}): Card {
  return {
    id: id('helper'),
    type: 'helper',
    deck: 'treasure',
    name: 'Hireling',
    description: '',
    combatBonus: 1,
    special: 'helper',
    ...over,
  };
}

/**
 * Build a fully-controlled room with rigged decks.
 * The next card to be drawn is the LAST element of the array (Deck uses pop()).
 *
 * Defaults are tuned for testing:
 * - variant 'long' (does not auto-enable market or timers)
 * - startingHandDoors / Treasures: 0  → no cards drawn at start
 * - turn / global timers disabled
 *
 * Tests can opt in to any of these.
 */
export function buildTestRoom(opts: {
  players?: number;
  config?: Partial<RoomConfig>;
  doors?: Card[];
  treasures?: Card[];
} = {}) {
  const { players = 2, config = {}, doors = [], treasures = [] } = opts;
  const room = new GameRoom({
    playerCount: Math.max(players, 2),
    variant: 'long',
    startingHandDoors: 0,
    startingHandTreasures: 0,
    marketEnabled: false,
    turnTimerSeconds: null,
    globalTimerMinutes: null,
    ...config,
  });
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];
  const created: Player[] = [];
  for (let i = 0; i < players; i++) {
    created.push(room.addPlayer(names[i] ?? `P${i}`, `sock${i}`));
  }
  // Replace decks BEFORE start so shuffle won't reorder our rigged cards.
  (room as any).doors = new Deck([...doors]);
  (room as any).treasures = new Deck([...treasures]);
  (room as any).doors.shuffleDeck = () => {};
  (room as any).treasures.shuffleDeck = () => {};
  // Replace start() to keep our decks instead of building fresh ones.
  room.start = function () {
    if (room.phase !== 'lobby') return;
    if (room.players.length < 2) throw new Error('Need at least 2 players.');
    for (const p of room.players) {
      p.hand.push(...room.doors.drawMany(room.config.startingHandDoors));
      p.hand.push(...room.treasures.drawMany(room.config.startingHandTreasures));
      if (room.config.twoPlayerDualCharacter) {
        p.characters = [{
          level: 1,
          hand: [],
          equipped: [],
          carried: [],
          race: null,
          class: null,
          combatPower: 1,
        }];
      }
    }
    if (room.config.marketEnabled) {
      room.market = room.treasures.drawMany(room.config.marketSize);
    }
    if (room.config.variant === 'cooperative') {
      room.coopBossHpRemaining = room.config.coopBossLevel;
    }
    room.phase = 'playing';
    room.turn = 1;
    room.activePlayerId = room.players[0]?.id ?? null;
    room.turnPhase = 'turnStart';
    if (room.config.globalTimerMinutes) {
      room.globalTimerEndsAt = Date.now() + room.config.globalTimerMinutes * 60 * 1000;
    }
    (room as any).startTurnTimer?.();
  };
  return { room, players: created };
}

/** Push a card to the top of a deck (next to be drawn). */
export function pushTop(deck: Deck, card: Card) {
  deck.cards.push(card);
}
