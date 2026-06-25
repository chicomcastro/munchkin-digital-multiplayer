import { GameRoom } from '@core/GameRoom.js';
import { BotDriver } from '@core/bots/driver.js';
import type { BotDifficulty } from '@core/bots/policy.js';
import type { Card, GameState, RoomConfig } from '../types';

type Handler = (...args: any[]) => void;

/**
 * In-browser orchestrator that runs a GameRoom + BotDriver in-process and
 * exposes the same event/emit surface used by useSocket / useGameState. No
 * network, no server — works offline once the page loads.
 */
export class LocalGame {
  readonly room: GameRoom;
  readonly humanId: string;
  readonly connected = true;
  private readonly driver: BotDriver;
  private readonly listeners = new Map<string, Set<Handler>>();
  private readonly unsubscribe: () => void;
  private disposed = false;

  constructor(humanName: string, config?: Partial<RoomConfig>) {
    this.room = new GameRoom(config);
    const human = this.room.addPlayer(humanName, 'local-human');
    this.humanId = human.id;
    this.driver = new BotDriver(this.room);
    this.unsubscribe = this.room.subscribe(() => this.broadcast());
    this.broadcast();
  }

  addBot(difficulty: BotDifficulty, name?: string) {
    return this.room.addBot(difficulty, name);
  }

  removeBot(botId: string) {
    this.room.removeBot(botId);
  }

  on(event: string, handler: Handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: Handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, payload: any, ack?: (res: any) => void) {
    try {
      this.dispatch(event, payload);
      ack?.({ ok: true });
    } catch (err) {
      const message = (err as Error)?.message ?? String(err);
      ack?.({ ok: false, error: message });
      this.fire('error', message);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.driver.dispose();
    this.unsubscribe();
    this.listeners.clear();
  }

  get state(): GameState {
    return this.room.snapshot();
  }

  get hand(): Card[] {
    return this.room.privateHandFor(this.humanId);
  }

  get fist(): Card[] {
    return this.room.fistFor(this.humanId);
  }

  // ---- internal ----

  private dispatch(event: string, payload: any): void {
    const pid = this.humanId;
    switch (event) {
      case 'room:start': this.room.start(); return;
      case 'room:updateConfig': this.room.updateConfig(payload as Partial<RoomConfig>); return;
      case 'room:addBot': this.addBot(payload?.difficulty ?? 'easy', payload?.name); return;
      case 'room:removeBot': this.removeBot(payload.botId); return;
      case 'room:toggleReady': this.room.setReady(pid, payload.ready); return;
      case 'game:kickDoor': this.room.kickDoor(pid); return;
      case 'game:listenDoor': this.room.listenAtDoor(pid); return;
      case 'game:playCard': this.room.playCard(pid, payload.cardId, payload.targetId); return;
      case 'game:helpInCombat': this.room.helpInCombat(pid); return;
      case 'game:flee': this.room.flee(pid); return;
      case 'game:resolveCombat': this.room.resolveCombat(pid); return;
      case 'game:lootRoom': this.room.lootRoom(pid); return;
      case 'game:sellItems': this.room.sellItems(pid, payload.cardIds); return;
      case 'game:endTurn': this.room.endTurn(); return;
      case 'market:trade': this.room.marketTrade(pid, payload.handCardId, payload.marketCardId); return;
      case 'fist:playCard': this.room.playFist(pid, payload.cardId, payload.targetCombat); return;
      case 'fist:deposit': this.room.depositFist(pid, payload.cardId); return;
      case 'game:stealItem': this.room.stealItem(pid, payload.targetId); return;
      case 'game:clericVsUndead': this.room.clericVsUndead(pid, payload.cardIds); return;
      case 'game:wizardCharm': this.room.wizardCharm(pid, payload.cardIds); return;
      case 'game:swapCharacter': this.room.swapCharacter(pid, payload.alternateIdx); return;
      default:
        throw new Error(`Unsupported event in offline mode: ${event}`);
    }
  }

  private broadcast() {
    this.fire('game:stateUpdate', this.state);
    this.fire('game:yourHand', { hand: this.hand, fist: this.fist });
  }

  private fire(event: string, payload: any) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const h of [...handlers]) h(payload);
  }
}
