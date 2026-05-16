import type { Card, CombatState, GameState, Player, RoomConfig } from '../types';

export function makeConfig(over: Partial<RoomConfig> = {}): RoomConfig {
  return {
    playerCount: 4,
    winLevel: 10,
    startingHandDoors: 4,
    startingHandTreasures: 4,
    variant: 'medium',
    turnTimerSeconds: null,
    globalTimerMinutes: null,
    listeningAtTheDoor: true,
    marketEnabled: false,
    marketSize: 3,
    fistMechanicEnabled: false,
    twoPlayerDualCharacter: false,
    aggressionMinLevel: 1,
    coopObjective: 'bossFight',
    coopBossLevel: 20,
    coopTrailSize: 6,
    coopRounds: 8,
    threatTrackEnabled: false,
    noOffensiveCurses: false,
    noStealing: false,
    noDeath: false,
    ...over,
  };
}

export function makePlayer(over: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Alice',
    socketId: 's1',
    level: 1,
    hand: [],
    equipped: [],
    carried: [],
    race: null,
    class: null,
    isAlive: true,
    combatPower: 1,
    fistCards: [],
    color: '#ef4444',
    ready: false,
    ...over,
  };
}

export function makeCard(over: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    type: 'item',
    deck: 'treasure',
    name: 'Sword',
    description: 'Sharp.',
    value: 400,
    bonus: 2,
    slot: 'hand',
    ...over,
  };
}

export function makeCombat(over: Partial<CombatState> = {}): CombatState {
  return {
    attackerId: 'p1',
    monsters: [makeCard({ id: 'm1', type: 'monster', deck: 'door', name: 'Goblin', level: 4 })],
    monsterPower: 4,
    playerPower: 3,
    alliedPlayerId: null,
    cardsPlayedThisRound: [],
    resolved: false,
    result: 'pending',
    fleeBonus: 0,
    ...over,
  };
}

export function makeState(over: Partial<GameState> = {}): GameState {
  return {
    roomCode: 'MNK-AAA',
    config: makeConfig(),
    phase: 'playing',
    turnPhase: 'turnStart',
    turn: 1,
    activePlayerId: 'p1',
    players: [makePlayer(), makePlayer({ id: 'p2', name: 'Bob', color: '#3b82f6' })],
    doorDeckSize: 50,
    treasureDeckSize: 30,
    doorDiscardTop: null,
    treasureDiscardTop: null,
    market: [],
    threatTrack: 0,
    coopMonstersDefeated: 0,
    coopBossHpRemaining: 0,
    log: [{ id: 'l1', ts: Date.now(), text: 'Game started!', kind: 'system' }],
    combatState: null,
    winnerId: null,
    turnTimerEndsAt: null,
    globalTimerEndsAt: null,
    ...over,
  };
}
