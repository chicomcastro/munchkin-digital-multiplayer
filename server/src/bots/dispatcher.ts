import type { GameRoom } from '../GameRoom.js';
import type { BotAction } from './policy.js';

export class IllegalBotAction extends Error {
  constructor(public readonly action: BotAction, cause: unknown) {
    super(`Illegal bot action ${action.kind}: ${(cause as Error)?.message ?? String(cause)}`);
  }
}

export function applyBotAction(room: GameRoom, playerId: string, action: BotAction): void {
  try {
    switch (action.kind) {
      case 'kickDoor':
        room.kickDoor(playerId);
        return;
      case 'listenAtDoor':
        room.listenAtDoor(playerId);
        return;
      case 'fight':
        room.resolveCombat(playerId);
        return;
      case 'flee':
        room.flee(playerId);
        return;
      case 'lootRoom':
        room.lootRoom(playerId);
        return;
      case 'endTurn':
        room.endTurn();
        return;
      case 'playCard':
        room.playCard(playerId, action.cardId, action.targetId);
        return;
      case 'sellItems':
        room.sellItems(playerId, action.cardIds);
        return;
      case 'helpInCombat':
        room.helpInCombat(playerId);
        return;
      case 'pass':
        return;
    }
  } catch (err) {
    throw new IllegalBotAction(action, err);
  }
}
