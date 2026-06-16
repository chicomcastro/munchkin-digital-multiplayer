import { nanoid } from 'nanoid';
import { Deck } from './Deck.js';
import { buildDoorDeck } from './cards/doors.js';
import { buildTreasureDeck } from './cards/treasures.js';
import { applyVariant, defaultConfig } from './rules/variants.js';
import { rollFlee, totals } from './rules/combat.js';
import {
  monsterHasTag,
  passiveCombatBonus,
  sellGoldBonus,
  sellMultiplier,
  winsTies,
} from './rules/abilities.js';
import type {
  Card,
  CombatState,
  EndResult,
  GameState,
  LogEntry,
  Player,
  RoomConfig,
  TurnPhase,
} from './types.js';
import { PLAYER_COLORS } from './types.js';

type Listener = (state: GameState) => void;

export interface RoomSnapshotInternal {
  code: string;
  config: RoomConfig;
  phase: 'lobby' | 'playing' | 'ended';
  turnPhase: TurnPhase;
  turn: number;
  activePlayerId: string | null;
  players: Player[];
  market: Card[];
  threatTrack: number;
  coopMonstersDefeated: number;
  coopBossHpRemaining: number;
  log: LogEntry[];
  combatState: CombatState | null;
  winnerId: string | null;
  doorsCards: Card[];
  doorsDiscard: Card[];
  treasuresCards: Card[];
  treasuresDiscard: Card[];
  creatorId: string | null;
  savedAt: number;
}

function generateRoomCode(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += alpha[Math.floor(Math.random() * alpha.length)];
  }
  return `MNK-${suffix}`;
}

const MAX_HAND_SIZE = 5;

export class GameRoom {
  readonly code: string;
  config: RoomConfig;
  phase: 'lobby' | 'playing' | 'ended' = 'lobby';
  turnPhase: TurnPhase = 'turnStart';
  turn = 0;
  activePlayerId: string | null = null;
  players: Player[] = [];
  doors = new Deck();
  treasures = new Deck();
  market: Card[] = [];
  threatTrack = 0;
  coopMonstersDefeated = 0;
  coopBossHpRemaining = 0;
  log: LogEntry[] = [];
  combatState: CombatState | null = null;
  winnerId: string | null = null;
  turnTimerEndsAt: number | null = null;
  globalTimerEndsAt: number | null = null;
  turnTimer: NodeJS.Timeout | null = null;

  private listeners = new Set<Listener>();
  private creatorId: string | null = null;

  constructor(config?: Partial<RoomConfig>) {
    this.code = generateRoomCode();
    this.config = applyVariant({ ...defaultConfig(), ...(config ?? {}) });
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snapshot = this.snapshot();
    for (const fn of this.listeners) fn(snapshot);
  }

  // ---- Snapshot ----
  snapshot(): GameState {
    return {
      roomCode: this.code,
      config: this.config,
      phase: this.phase,
      turnPhase: this.turnPhase,
      turn: this.turn,
      activePlayerId: this.activePlayerId,
      players: this.players.map((p) => ({
        ...p,
        // Hide hands in shared snapshot — they are sent privately
        hand: [],
        fistCards: [],
      })),
      doorDeckSize: this.doors.size,
      treasureDeckSize: this.treasures.size,
      doorDiscardTop: this.doors.discardTop,
      treasureDiscardTop: this.treasures.discardTop,
      market: this.market,
      threatTrack: this.threatTrack,
      coopMonstersDefeated: this.coopMonstersDefeated,
      coopBossHpRemaining: this.coopBossHpRemaining,
      log: this.log.slice(-40),
      combatState: this.combatState,
      winnerId: this.winnerId,
      turnTimerEndsAt: this.turnTimerEndsAt,
      globalTimerEndsAt: this.globalTimerEndsAt,
    };
  }

  /**
   * Full serialisable snapshot for persistence — includes private hands,
   * decks, discards, etc. Output is intentionally a plain object.
   */
  serialize(): RoomSnapshotInternal {
    return {
      code: this.code,
      config: this.config,
      phase: this.phase,
      turnPhase: this.turnPhase,
      turn: this.turn,
      activePlayerId: this.activePlayerId,
      players: this.players,
      market: this.market,
      threatTrack: this.threatTrack,
      coopMonstersDefeated: this.coopMonstersDefeated,
      coopBossHpRemaining: this.coopBossHpRemaining,
      log: this.log,
      combatState: this.combatState,
      winnerId: this.winnerId,
      doorsCards: this.doors.cards,
      doorsDiscard: this.doors.discard,
      treasuresCards: this.treasures.cards,
      treasuresDiscard: this.treasures.discard,
      creatorId: (this as any).creatorId ?? null,
      savedAt: Date.now(),
    };
  }

  /** Inverse of serialize — replace this room's state. */
  hydrate(snap: ReturnType<GameRoom['serialize']>) {
    this.config = snap.config;
    this.phase = snap.phase;
    this.turnPhase = snap.turnPhase;
    this.turn = snap.turn;
    this.activePlayerId = snap.activePlayerId;
    this.players = snap.players;
    this.market = snap.market;
    this.threatTrack = snap.threatTrack;
    this.coopMonstersDefeated = snap.coopMonstersDefeated;
    this.coopBossHpRemaining = snap.coopBossHpRemaining;
    this.log = snap.log;
    this.combatState = snap.combatState;
    this.winnerId = snap.winnerId;
    this.doors.cards = snap.doorsCards;
    this.doors.discard = snap.doorsDiscard;
    this.treasures.cards = snap.treasuresCards;
    this.treasures.discard = snap.treasuresDiscard;
    (this as any).creatorId = snap.creatorId;
  }

  privateHandFor(playerId: string): Card[] {
    return this.players.find((p) => p.id === playerId)?.hand ?? [];
  }

  fistFor(playerId: string): Card[] {
    return this.players.find((p) => p.id === playerId)?.fistCards ?? [];
  }

  // ---- Logging ----
  private write(text: string, kind: LogEntry['kind'] = 'info') {
    this.log.push({ id: nanoid(8), ts: Date.now(), text, kind });
  }

  // ---- Lobby ----
  addPlayer(name: string, socketId: string): Player {
    if (this.phase !== 'lobby') {
      throw new Error('Game already started.');
    }
    if (this.players.length >= this.config.playerCount) {
      throw new Error('Room is full.');
    }
    const color = PLAYER_COLORS[this.players.length] ?? '#888';
    const player: Player = {
      id: nanoid(8),
      name: name.slice(0, 24) || `Player ${this.players.length + 1}`,
      socketId,
      level: 1,
      hand: [],
      equipped: [],
      carried: [],
      race: null,
      class: null,
      isAlive: true,
      combatPower: 1,
      fistCards: [],
      color,
      ready: false,
    };
    this.players.push(player);
    if (!this.creatorId) this.creatorId = player.id;
    this.write(`${player.name} joined.`);
    this.emit();
    return player;
  }

  isCreator(playerId: string): boolean {
    return this.creatorId === playerId;
  }

  addBot(difficulty: 'easy' | 'normal' | 'hard', name?: string): Player {
    if (this.phase !== 'lobby') {
      throw new Error('Game already started.');
    }
    if (this.players.length >= this.config.playerCount) {
      throw new Error('Room is full.');
    }
    const botNumber = this.players.filter((p) => p.isBot).length + 1;
    const color = PLAYER_COLORS[this.players.length] ?? '#888';
    const player: Player = {
      id: nanoid(8),
      name: (name ?? `Bot ${botNumber}`).slice(0, 24),
      socketId: null,
      level: 1,
      hand: [],
      equipped: [],
      carried: [],
      race: null,
      class: null,
      isAlive: true,
      combatPower: 1,
      fistCards: [],
      color,
      ready: true,
      isBot: true,
      botDifficulty: difficulty,
    };
    this.players.push(player);
    if (!this.creatorId) this.creatorId = player.id;
    this.write(`${player.name} (bot ${difficulty}) joined.`);
    this.emit();
    return player;
  }

  removeBot(playerId: string) {
    if (this.phase !== 'lobby') {
      throw new Error('Cannot remove bots once the game has started.');
    }
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) throw new Error('Player not found.');
    const p = this.players[idx]!;
    if (!p.isBot) throw new Error('Cannot remove human players.');
    this.players.splice(idx, 1);
    this.write(`${p.name} (bot) left.`);
    this.emit();
  }

  reconnect(playerId: string, socketId: string): Player | null {
    const p = this.players.find((p) => p.id === playerId);
    if (!p) return null;
    p.socketId = socketId;
    this.emit();
    return p;
  }

  disconnect(socketId: string) {
    const p = this.players.find((p) => p.socketId === socketId);
    if (!p) return;
    p.socketId = null;
    this.write(`${p.name} disconnected.`);
    this.emit();
  }

  setReady(playerId: string, ready: boolean) {
    if (this.phase !== 'lobby') throw new Error('Game already started.');
    const p = this.playerById(playerId);
    p.ready = ready;
    this.write(`${p.name} ${ready ? 'is ready' : 'is no longer ready'}.`);
    this.emit();
  }

  stealItem(thiefId: string, targetId: string) {
    if (this.phase !== 'playing') throw new Error('Game not running.');
    if (this.config.noStealing) throw new Error('Stealing disabled.');
    if (thiefId === targetId) throw new Error('Cannot steal from yourself.');
    const thief = this.playerById(thiefId);
    const target = this.playerById(targetId);
    if (thief.class?.name !== 'Thief') throw new Error('Only Thieves can steal.');
    // d6 4+ succeeds (Thief special)
    const roll = 1 + Math.floor(Math.random() * 6);
    if (roll < 4) {
      this.write(`${thief.name} tried to steal from ${target.name} and failed (${roll}).`, 'combat');
      // On a 1, the Thief loses a level.
      if (roll === 1) {
        target.level = target.level; // unchanged
        thief.level = Math.max(1, thief.level - 1);
        this.write(`${thief.name} fumbled and lost a level.`, 'curse');
      }
      this.emit();
      return { roll, success: false };
    }
    // Steal a small (non-big) item — prefer equipped, fall back to carried.
    const small = target.equipped.find((c) => !c.bigItem) ?? target.carried.find((c) => !c.bigItem);
    if (!small) {
      this.write(`${thief.name} stole from ${target.name} but found nothing small.`, 'combat');
      this.emit();
      return { roll, success: false };
    }
    target.equipped = target.equipped.filter((c) => c.id !== small.id);
    target.carried = target.carried.filter((c) => c.id !== small.id);
    thief.carried.push(small);
    this.recomputePower(target);
    this.recomputePower(thief);
    this.write(`${thief.name} stole ${small.name} from ${target.name}!`, 'combat');
    this.emit();
    return { roll, success: true };
  }

  updateConfig(patch: Partial<RoomConfig>) {
    if (this.phase !== 'lobby') return;
    this.config = applyVariant({ ...this.config, ...patch });
    this.emit();
  }

  // ---- Start ----
  start() {
    if (this.phase !== 'lobby') return;
    if (this.players.length < 2) throw new Error('Need at least 2 players.');
    this.doors = new Deck(buildDoorDeck());
    this.treasures = new Deck(buildTreasureDeck());
    this.doors.shuffleDeck();
    this.treasures.shuffleDeck();
    for (const p of this.players) {
      p.hand.push(...this.doors.drawMany(this.config.startingHandDoors));
      p.hand.push(...this.treasures.drawMany(this.config.startingHandTreasures));
      // Dual-character mode: each player gets one stored alternate at lv 1.
      if (this.config.twoPlayerDualCharacter) {
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
    if (this.config.marketEnabled) {
      this.market = this.treasures.drawMany(this.config.marketSize);
    }
    if (this.config.variant === 'cooperative') {
      this.coopBossHpRemaining = this.config.coopBossLevel;
    }
    this.phase = 'playing';
    this.turn = 1;
    this.activePlayerId = this.players[0]?.id ?? null;
    this.turnPhase = 'turnStart';
    this.write('Game started!', 'system');
    if (this.config.globalTimerMinutes) {
      this.globalTimerEndsAt = Date.now() + this.config.globalTimerMinutes * 60 * 1000;
    }
    this.startTurnTimer();
    this.emit();
  }

  // ---- Turn timer ----
  private startTurnTimer() {
    this.stopTurnTimer();
    if (!this.config.turnTimerSeconds) {
      this.turnTimerEndsAt = null;
      return;
    }
    this.turnTimerEndsAt = Date.now() + this.config.turnTimerSeconds * 1000;
    const t = setTimeout(() => {
      this.write(`Turn timer expired — forcing end of turn.`);
      this.endTurn();
    }, this.config.turnTimerSeconds * 1000);
    // Don't block process shutdown in scripts / tests.
    t.unref?.();
    this.turnTimer = t;
  }

  private stopTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnTimerEndsAt = null;
  }

  // ---- Helpers ----
  private requireActive(playerId: string) {
    if (this.phase !== 'playing') throw new Error('Game not running.');
    if (this.activePlayerId !== playerId) throw new Error('Not your turn.');
  }

  private playerById(id: string): Player {
    const p = this.players.find((p) => p.id === id);
    if (!p) throw new Error('Player not found.');
    return p;
  }

  private recomputePower(p: Player) {
    let bonus = 0;
    for (const c of p.equipped) bonus += c.bonus ?? 0;
    p.combatPower = p.level + bonus + passiveCombatBonus(p);
  }

  private nextActivePlayerId(): string {
    const idx = this.players.findIndex((p) => p.id === this.activePlayerId);
    for (let i = 1; i <= this.players.length; i++) {
      const candidate = this.players[(idx + i) % this.players.length]!;
      if (candidate.isAlive) return candidate.id;
    }
    return this.activePlayerId!;
  }

  // ---- Actions ----
  kickDoor(playerId: string) {
    this.requireActive(playerId);
    if (!(this.turnPhase === 'turnStart' || this.turnPhase === 'kickDoor')) {
      throw new Error(`Cannot kick door in phase ${this.turnPhase}.`);
    }
    const card = this.doors.draw();
    if (!card) throw new Error('Door deck empty.');
    const player = this.playerById(playerId);
    this.write(`${player.name} kicked the door — ${card.name}.`);
    if (card.type === 'monster') {
      this.combatState = {
        attackerId: playerId,
        monsters: [card],
        monsterPower: card.level ?? 0,
        playerPower: player.combatPower,
        alliedPlayerId: null,
        cardsPlayedThisRound: [],
        resolved: false,
        result: 'pending',
        fleeBonus: 0,
      };
      this.turnPhase = 'combat';
    } else if (card.type === 'curse') {
      this.applyCurse(player, card);
      this.doors.discardCard(card);
      this.turnPhase = 'lookForTroubleOrLoot';
    } else {
      player.hand.push(card);
      this.write(`${player.name} took ${card.name} into hand.`);
      this.turnPhase = 'lookForTroubleOrLoot';
    }
    this.emit();
  }

  listenAtDoor(playerId: string) {
    this.requireActive(playerId);
    if (!this.config.listeningAtTheDoor) throw new Error('Listening disabled.');
    if (this.turnPhase !== 'turnStart') throw new Error('Wrong phase for listening.');
    const card = this.doors.draw();
    if (!card) throw new Error('Door deck empty.');
    const player = this.playerById(playerId);
    player.hand.push(card);
    this.write(`${player.name} listened at the door.`);
    this.turnPhase = 'kickDoor';
    this.emit();
  }

  // ---- Curses ----
  private applyCurse(target: Player, card: Card) {
    this.write(`Curse! ${card.name} hits ${target.name}.`, 'curse');
    switch (card.special) {
      case 'loseLevel':
        target.level = Math.max(1, target.level - 1);
        break;
      case 'loseClass':
        if (target.class) {
          this.doors.discardCard(target.class);
          target.class = null;
        }
        break;
      case 'loseRace':
        if (target.race) {
          this.doors.discardCard(target.race);
          target.race = null;
        }
        break;
      case 'discardEquipped': {
        const eq = target.equipped.shift();
        if (eq) this.treasures.discardCard(eq);
        break;
      }
      case 'loseBigItem': {
        const idx = target.equipped.findIndex((c) => c.bigItem);
        if (idx >= 0) {
          this.treasures.discardCard(target.equipped[idx]!);
          target.equipped.splice(idx, 1);
        }
        break;
      }
      case 'loseHeadgear': {
        const idx = target.equipped.findIndex((c) => c.slot === 'head');
        if (idx >= 0) {
          this.treasures.discardCard(target.equipped[idx]!);
          target.equipped.splice(idx, 1);
        }
        break;
      }
      case 'loseFootgear': {
        const idx = target.equipped.findIndex((c) => c.slot === 'feet');
        if (idx >= 0) {
          this.treasures.discardCard(target.equipped[idx]!);
          target.equipped.splice(idx, 1);
        }
        break;
      }
      case 'incomeTax': {
        const kept: Card[] = [];
        for (const c of target.equipped) {
          if ((c.value ?? 0) >= 600) this.treasures.discardCard(c);
          else kept.push(c);
        }
        target.equipped = kept;
        break;
      }
      case 'chickenHead':
        target.equipped.push({ ...card, bonus: -1, slot: 'head' });
        break;
      case 'doubleBad':
        target.level = Math.max(1, target.level - 2);
        if (target.equipped.length > 0) {
          this.treasures.discardCard(target.equipped.shift()!);
        }
        break;
    }
    this.recomputePower(target);
  }

  // ---- Equipping / playing cards ----
  playCard(playerId: string, cardId: string, targetId?: string) {
    if (this.phase !== 'playing') throw new Error('Game not running.');
    const player = this.playerById(playerId);
    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx < 0) throw new Error('Card not in hand.');
    const card = player.hand[idx]!;
    if (card.type === 'race') {
      // Replace existing race
      if (player.race) this.doors.discardCard(player.race);
      player.race = card;
      player.hand.splice(idx, 1);
      this.write(`${player.name} became a ${card.name}.`);
    } else if (card.type === 'class') {
      if (player.class) this.doors.discardCard(player.class);
      player.class = card;
      player.hand.splice(idx, 1);
      this.write(`${player.name} became a ${card.name}.`);
    } else if (card.type === 'item') {
      // Equip if possible; restrictions ignored in MVP
      const slot = card.slot ?? 'none';
      if (slot !== 'none') {
        const conflict = player.equipped.findIndex((c) => c.slot === slot);
        if (conflict >= 0) {
          // Move conflicting to carried
          player.carried.push(player.equipped[conflict]!);
          player.equipped.splice(conflict, 1);
        }
      }
      player.equipped.push(card);
      player.hand.splice(idx, 1);
      this.write(`${player.name} equipped ${card.name}.`);
    } else if (card.type === 'levelUp') {
      this.gainLevel(player, 1, 'levelUp card');
      player.hand.splice(idx, 1);
      this.treasures.discardCard(card);
    } else if (card.type === 'oneShot' || card.type === 'helper') {
      // If a combat is active, applies to combat by default on player side
      if (this.combatState && !this.combatState.resolved) {
        this.combatState.cardsPlayedThisRound.push({ playerId, card, side: 'player' });
        player.hand.splice(idx, 1);
        this.treasures.discardCard(card);
        this.write(`${player.name} played ${card.name} (+${card.combatBonus ?? card.bonus ?? 0}).`, 'combat');
        this.refreshCombatTotals();
      } else {
        throw new Error('No active combat to play this card.');
      }
    } else if (card.type === 'curse') {
      // Curse a target
      if (this.config.noOffensiveCurses && targetId && targetId !== playerId) {
        throw new Error('Offensive curses disabled.');
      }
      const target = targetId ? this.playerById(targetId) : player;
      if (target.id !== playerId && target.level < this.config.aggressionMinLevel) {
        throw new Error('Target is below aggression minimum.');
      }
      this.applyCurse(target, card);
      player.hand.splice(idx, 1);
      this.doors.discardCard(card);
    } else if (card.type === 'monster') {
      // "Look for trouble" — play monster from hand on your turn
      if (this.activePlayerId !== playerId) throw new Error('Only active player can.');
      if (this.turnPhase !== 'lookForTroubleOrLoot') throw new Error('Wrong phase for look for trouble.');
      player.hand.splice(idx, 1);
      this.combatState = {
        attackerId: playerId,
        monsters: [card],
        monsterPower: card.level ?? 0,
        playerPower: player.combatPower,
        alliedPlayerId: null,
        cardsPlayedThisRound: [],
        resolved: false,
        result: 'pending',
        fleeBonus: 0,
      };
      this.turnPhase = 'combat';
      this.write(`${player.name} looked for trouble — ${card.name}!`, 'combat');
    }
    this.recomputePower(player);
    this.checkVictory();
    this.emit();
  }

  // ---- Combat ----
  helpInCombat(helperId: string) {
    if (!this.combatState || this.combatState.resolved) throw new Error('No active combat.');
    if (this.combatState.alliedPlayerId) throw new Error('Combat already has an ally.');
    if (helperId === this.combatState.attackerId) throw new Error('Cannot ally with yourself.');
    const helper = this.playerById(helperId);
    if (!helper.isAlive) throw new Error('Helper is dead.');
    this.combatState.alliedPlayerId = helperId;
    this.write(`${helper.name} jumped in to help.`, 'combat');
    this.refreshCombatTotals();
    this.emit();
  }

  flee(playerId: string) {
    if (!this.combatState || this.combatState.resolved) throw new Error('No active combat.');
    const player = this.playerById(playerId);
    const isAttacker = player.id === this.combatState.attackerId;
    const isAlly = player.id === this.combatState.alliedPlayerId;
    if (!isAttacker && !isAlly) throw new Error('Not in combat.');
    const result = rollFlee(this.combatState.fleeBonus);
    this.write(`${player.name} rolls flee: ${result.roll} → ${result.success ? 'escaped' : 'failed'}.`, 'combat');
    if (result.success) {
      this.combatState.resolved = true;
      this.combatState.result = 'flee';
      this.discardCombat();
      this.turnPhase = 'lookForTroubleOrLoot';
    } else {
      this.applyBadStuff(player, this.combatState.monsters[0]!);
      this.combatState.resolved = true;
      this.combatState.result = 'badStuff';
      this.discardCombat();
      this.turnPhase = 'lookForTroubleOrLoot';
    }
    this.emit();
  }

  resolveCombat(playerId: string) {
    if (!this.combatState || this.combatState.resolved) throw new Error('No active combat.');
    if (playerId !== this.combatState.attackerId) throw new Error('Only attacker can resolve.');
    const attacker = this.playerById(this.combatState.attackerId);
    const ally = this.combatState.alliedPlayerId ? this.playerById(this.combatState.alliedPlayerId) : null;
    const t = totals({
      attacker,
      ally,
      monsters: this.combatState.monsters,
      played: this.combatState.cardsPlayedThisRound.map((p) => ({ side: p.side, card: p.card })),
    });
    this.combatState.playerPower = t.playerSide;
    this.combatState.monsterPower = t.monsterSide;
    const tieWins = winsTies(attacker) || (ally !== null && winsTies(ally));
    const wins = tieWins ? t.playerSide >= t.monsterSide : t.playerSide > t.monsterSide;
    if (wins) {
      const monster = this.combatState.monsters[0]!;
      const lvls = monster.levelsAwarded ?? 1;
      const treasures = monster.treasures ?? 1;
      this.gainLevel(attacker, lvls, `defeated ${monster.name}`);
      const drawn = this.treasures.drawMany(treasures);
      attacker.hand.push(...drawn);
      this.write(`${attacker.name} defeated ${monster.name} — +${lvls} levels, +${treasures} treasures.`, 'combat');
      if (ally) {
        // Ally gets half treasures (rounded down) — MVP: ally draws 1 treasure
        const allyDraws = Math.floor(treasures / 2);
        if (allyDraws > 0) {
          const allyCards = this.treasures.drawMany(allyDraws);
          ally.hand.push(...allyCards);
          this.write(`${ally.name} got ${allyDraws} treasure for helping.`, 'combat');
        }
      }
      this.combatState.result = 'victory';
      if (this.config.variant === 'cooperative') {
        this.coopMonstersDefeated += 1;
        this.coopBossHpRemaining = Math.max(0, this.coopBossHpRemaining - (monster.level ?? 0));
      }
    } else {
      this.applyBadStuff(attacker, this.combatState.monsters[0]!);
      this.combatState.result = 'badStuff';
      if (this.config.variant === 'cooperative' && this.config.threatTrackEnabled) {
        this.threatTrack = Math.min(10, this.threatTrack + 1);
      }
    }
    this.combatState.resolved = true;
    this.discardCombat();
    this.turnPhase = 'lookForTroubleOrLoot';
    this.checkVictory();
    this.emit();
  }

  private discardCombat() {
    if (!this.combatState) return;
    for (const m of this.combatState.monsters) this.doors.discardCard(m);
    for (const p of this.combatState.cardsPlayedThisRound) this.treasures.discardCard(p.card);
  }

  private refreshCombatTotals() {
    if (!this.combatState) return;
    const attacker = this.playerById(this.combatState.attackerId);
    const ally = this.combatState.alliedPlayerId ? this.playerById(this.combatState.alliedPlayerId) : null;
    const t = totals({
      attacker,
      ally,
      monsters: this.combatState.monsters,
      played: this.combatState.cardsPlayedThisRound.map((p) => ({ side: p.side, card: p.card })),
    });
    this.combatState.playerPower = t.playerSide;
    this.combatState.monsterPower = t.monsterSide;
  }

  // ---- Bad Stuff ----
  private applyBadStuff(player: Player, monster: Card) {
    const text = monster.badStuff ?? 'You lose 1 level.';
    this.write(`${player.name} suffers: ${text}`, 'combat');
    if (/death/i.test(text)) {
      if (this.config.noDeath) {
        // Lose half items
        const half = Math.floor(player.equipped.length / 2);
        for (let i = 0; i < half; i++) {
          this.treasures.discardCard(player.equipped.shift()!);
        }
      } else {
        this.killPlayer(player);
      }
    } else if (/lose 2/i.test(text)) {
      player.level = Math.max(1, player.level - 2);
    } else if (/lose all your treasure/i.test(text)) {
      for (const c of player.equipped) this.treasures.discardCard(c);
      for (const c of player.carried) this.treasures.discardCard(c);
      player.equipped = [];
      player.carried = [];
    } else if (/discard/i.test(text)) {
      if (player.equipped.length) this.treasures.discardCard(player.equipped.shift()!);
    } else {
      player.level = Math.max(1, player.level - 1);
    }
    this.recomputePower(player);
  }

  private killPlayer(player: Player) {
    this.write(`${player.name} died!`, 'system');
    // Drop everything to discard, restart at level 1
    for (const c of player.equipped) this.treasures.discardCard(c);
    for (const c of player.carried) this.treasures.discardCard(c);
    for (const c of player.hand) {
      if (c.deck === 'door') this.doors.discardCard(c);
      else this.treasures.discardCard(c);
    }
    if (player.race) this.doors.discardCard(player.race);
    if (player.class) this.doors.discardCard(player.class);
    player.equipped = [];
    player.carried = [];
    player.hand = [];
    player.race = null;
    player.class = null;
    player.level = 1;
    // Redeal a fresh starting hand to keep them in the game
    player.hand.push(...this.doors.drawMany(this.config.startingHandDoors));
    player.hand.push(...this.treasures.drawMany(this.config.startingHandTreasures));
    this.recomputePower(player);
  }

  // ---- Loot / charity / end turn ----
  lootRoom(playerId: string) {
    this.requireActive(playerId);
    if (this.turnPhase !== 'lookForTroubleOrLoot') throw new Error('Wrong phase.');
    const player = this.playerById(playerId);
    const card = this.doors.draw();
    if (card) {
      player.hand.push(card);
      this.write(`${player.name} looted the room.`);
    }
    this.turnPhase = 'charity';
    this.emit();
  }

  sellItems(playerId: string, cardIds: string[]) {
    if (this.phase !== 'playing') throw new Error('Game not running.');
    const player = this.playerById(playerId);
    let total = 0;
    const remainEquipped: Card[] = [];
    const remainCarried: Card[] = [];
    const removed: Card[] = [];
    for (const c of player.equipped) {
      if (cardIds.includes(c.id)) {
        total += c.value ?? 0;
        removed.push(c);
      } else remainEquipped.push(c);
    }
    for (const c of player.carried) {
      if (cardIds.includes(c.id)) {
        total += c.value ?? 0;
        removed.push(c);
      } else remainCarried.push(c);
    }
    for (const c of player.hand) {
      if (cardIds.includes(c.id) && c.type === 'item') {
        total += c.value ?? 0;
        removed.push(c);
      }
    }
    // Race/class bonuses applied AFTER counting the raw values.
    const firstSale = !player.halflingSoldThisTurn;
    const multiplied = total * sellMultiplier(player, firstSale);
    const bonusGold = sellGoldBonus(player);
    const finalTotal = multiplied + bonusGold;

    if (finalTotal < 1000) throw new Error('Need at least 1000 gold to sell for a level.');
    if (firstSale && player.race?.name === 'Halfling') {
      player.halflingSoldThisTurn = true;
    }
    const removedIds = new Set(removed.map((c) => c.id));
    player.equipped = remainEquipped;
    player.carried = remainCarried;
    player.hand = player.hand.filter((c) => !removedIds.has(c.id));
    for (const c of removed) this.treasures.discardCard(c);
    const lvls = Math.floor(finalTotal / 1000);
    this.gainLevel(player, lvls, `sold items for ${finalTotal} gold`);
    this.recomputePower(player);
    this.checkVictory();
    this.emit();
  }

  endTurn(): EndResult | null {
    if (this.phase !== 'playing') return null;
    const player = this.activePlayerId ? this.playerById(this.activePlayerId) : null;
    if (player) {
      // Enforce 5-card hand limit (charity = discard for MVP)
      while (player.hand.length > MAX_HAND_SIZE) {
        const discarded = player.hand.pop()!;
        if (discarded.deck === 'door') this.doors.discardCard(discarded);
        else this.treasures.discardCard(discarded);
      }
    }
    // Reset per-turn flags (Halfling sale double, etc.).
    if (player) player.halflingSoldThisTurn = false;
    this.combatState = null;
    this.turnPhase = 'turnStart';
    this.turn += 1;
    this.activePlayerId = this.nextActivePlayerId();
    if (this.globalTimerEndsAt && Date.now() > this.globalTimerEndsAt) {
      return this.finish({ outcome: 'timeout', reason: 'Global timer expired.' });
    }
    this.startTurnTimer();
    this.emit();
    return null;
  }

  marketTrade(playerId: string, handCardId: string, marketCardId: string) {
    if (!this.config.marketEnabled) throw new Error('Market disabled.');
    const player = this.playerById(playerId);
    const handIdx = player.hand.findIndex((c) => c.id === handCardId);
    const marketIdx = this.market.findIndex((c) => c.id === marketCardId);
    if (handIdx < 0 || marketIdx < 0) throw new Error('Trade card not found.');
    const handCard = player.hand[handIdx]!;
    const marketCard = this.market[marketIdx]!;
    if ((handCard.value ?? 0) < (marketCard.value ?? 0)) {
      throw new Error('Trade-in value too low.');
    }
    player.hand.splice(handIdx, 1, marketCard);
    this.market.splice(marketIdx, 1, handCard);
    this.write(`${player.name} traded at the market.`);
    this.emit();
  }

  /**
   * Cleric ability: discard up to N cards from hand to add +3 per card to the
   * current combat's player side, ONLY if any monster in the combat is undead.
   */
  clericVsUndead(playerId: string, cardIds: string[]) {
    if (!this.combatState || this.combatState.resolved) throw new Error('No active combat.');
    const player = this.playerById(playerId);
    if (player.class?.name !== 'Cleric') throw new Error('Only Clerics can do this.');
    const anyUndead = this.combatState.monsters.some((m) => monsterHasTag(m, 'undead'));
    if (!anyUndead) throw new Error('Cleric bonus requires an undead monster.');
    if (cardIds.length === 0) throw new Error('Choose at least one card to discard.');
    const removed: Card[] = [];
    for (const id of cardIds) {
      const idx = player.hand.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Card not in hand.');
      removed.push(player.hand.splice(idx, 1)[0]!);
    }
    for (const c of removed) {
      if (c.deck === 'door') this.doors.discardCard(c);
      else this.treasures.discardCard(c);
      // Synthetic card-bonus entries on player side, one per discard.
      this.combatState.cardsPlayedThisRound.push({
        playerId,
        card: { ...c, combatBonus: 3, name: `${player.name}: Cleric +3 vs Undead` },
        side: 'player',
      });
    }
    this.refreshCombatTotals();
    this.write(`${player.name} channeled holy power: +${3 * removed.length} vs Undead.`, 'combat');
    this.emit();
  }

  /**
   * Wizard ability: discard 3 cards from hand to charm the active monster —
   * the combat resolves as a flee with NO bad stuff (you simply walk away).
   */
  wizardCharm(playerId: string, cardIds: string[]) {
    if (!this.combatState || this.combatState.resolved) throw new Error('No active combat.');
    const player = this.playerById(playerId);
    if (player.class?.name !== 'Wizard') throw new Error('Only Wizards can do this.');
    if (cardIds.length < 3) throw new Error('Wizard charm costs 3 cards.');
    const removed: Card[] = [];
    for (const id of cardIds.slice(0, 3)) {
      const idx = player.hand.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Card not in hand.');
      removed.push(player.hand.splice(idx, 1)[0]!);
    }
    for (const c of removed) {
      if (c.deck === 'door') this.doors.discardCard(c);
      else this.treasures.discardCard(c);
    }
    this.combatState.resolved = true;
    this.combatState.result = 'flee';
    this.write(`${player.name} charmed the monster (Wizard).`, 'combat');
    this.discardCombat();
    this.turnPhase = 'lookForTroubleOrLoot';
    this.emit();
  }

  /** Reserve a card from hand into the Fist (max 3, gated by config). */
  depositFist(playerId: string, cardId: string) {
    if (!this.config.fistMechanicEnabled) throw new Error('Fist mechanic disabled.');
    const player = this.playerById(playerId);
    if (player.fistCards.length >= 3) throw new Error('Fist is full (3 cards max).');
    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx < 0) throw new Error('Card not in hand.');
    if (player.hand[idx]!.deck !== 'door') throw new Error('Only door cards can go to the Fist.');
    const card = player.hand.splice(idx, 1)[0]!;
    player.fistCards.push(card);
    this.write(`${player.name} reserved ${card.name} in the Fist.`);
    this.emit();
  }

  /**
   * Dual-character swap: exchange the current main character's state with one
   * of the alternates in `player.characters`. The previously-active becomes
   * stored, and the chosen alt becomes the active main.
   */
  swapCharacter(playerId: string, alternateIdx: number) {
    if (!this.config.twoPlayerDualCharacter) throw new Error('Dual character disabled.');
    const player = this.playerById(playerId);
    const list = player.characters ?? [];
    if (alternateIdx < 0 || alternateIdx >= list.length) throw new Error('Invalid alternate.');
    const alt = list[alternateIdx]!;
    // Hand stays with the player across swaps — only character-bound state
    // (level, equipped, carried, race, class, combatPower) is exchanged.
    const current: typeof alt = {
      level: player.level,
      hand: [],
      equipped: player.equipped,
      carried: player.carried,
      race: player.race,
      class: player.class,
      combatPower: player.combatPower,
    };
    player.level = alt.level;
    player.equipped = alt.equipped;
    player.carried = alt.carried;
    player.race = alt.race;
    player.class = alt.class;
    player.combatPower = alt.combatPower;
    list[alternateIdx] = current;
    this.recomputePower(player);
    this.write(`${player.name} swapped characters.`);
    this.emit();
  }

  playFist(playerId: string, cardId: string, targetCombat: boolean) {
    if (!this.config.fistMechanicEnabled) throw new Error('Fist mechanic disabled.');
    const player = this.playerById(playerId);
    const idx = player.fistCards.findIndex((c) => c.id === cardId);
    if (idx < 0) throw new Error('Card not in Fist.');
    const card = player.fistCards[idx]!;
    if (targetCombat && this.combatState && !this.combatState.resolved) {
      this.combatState.cardsPlayedThisRound.push({ playerId, card, side: 'monster' });
      this.refreshCombatTotals();
      this.write(`${player.name} unleashed Fist card ${card.name} against the player!`, 'combat');
    } else {
      player.hand.push(card);
    }
    player.fistCards.splice(idx, 1);
    this.emit();
  }

  // ---- Leveling / victory ----
  private gainLevel(player: Player, n: number, reason: string) {
    // Cannot reach winLevel by combat? Munchkin rule: levelUp cards cannot win,
    // and last level must come from combat. MVP enforces only via combat win;
    // sale of items still pushes you to winLevel for simplicity.
    const cap = this.config.winLevel;
    player.level = Math.min(cap, player.level + n);
    this.write(`${player.name} +${n} (${reason}) → level ${player.level}.`, 'level');
    this.recomputePower(player);
  }

  private checkVictory(): EndResult | null {
    if (this.config.variant === 'cooperative') {
      if (this.config.coopObjective === 'bossFight' && this.coopBossHpRemaining <= 0) {
        return this.finish({ outcome: 'win', reason: 'Boss defeated — players win!' });
      }
      if (this.config.coopObjective === 'dungeonTrail' && this.coopMonstersDefeated >= this.config.coopTrailSize) {
        return this.finish({ outcome: 'win', reason: 'Dungeon trail completed!' });
      }
      if (this.config.coopObjective === 'surviveRounds' && this.turn >= this.config.coopRounds) {
        return this.finish({ outcome: 'win', reason: 'Survived all rounds!' });
      }
      if (this.threatTrack >= 10) {
        return this.finish({ outcome: 'lose', reason: 'Threat track maxed out.' });
      }
      return null;
    }
    const winner = this.players.find((p) => p.level >= this.config.winLevel);
    if (winner) {
      this.winnerId = winner.id;
      return this.finish({ outcome: 'win', winnerId: winner.id, reason: `${winner.name} hit level ${this.config.winLevel}.` });
    }
    return null;
  }

  private finish(res: EndResult): EndResult {
    this.phase = 'ended';
    this.stopTurnTimer();
    this.write(res.reason, 'system');
    this.emit();
    return res;
  }
}
