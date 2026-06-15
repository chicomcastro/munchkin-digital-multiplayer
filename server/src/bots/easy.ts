import type { Card, Player } from '../types.js';
import type { BotAction, BotContext, BotPolicy } from './policy.js';

const SELL_TARGET = 1000;

function pickSellableForLevel(player: Player): string[] | null {
  const pool = [...player.equipped, ...player.carried].filter((c) => (c.value ?? 0) > 0);
  if (pool.length === 0) return null;
  pool.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const chosen: Card[] = [];
  let total = 0;
  for (const c of pool) {
    chosen.push(c);
    total += c.value ?? 0;
    if (total >= SELL_TARGET) return chosen.map((x) => x.id);
  }
  return null;
}

function bestUnequippedItem(hand: Card[]): Card | null {
  const items = hand.filter((c) => c.type === 'item');
  if (!items.length) return null;
  items.sort((a, b) => (b.bonus ?? 0) - (a.bonus ?? 0));
  return items[0] ?? null;
}

function findCombatBoostCard(hand: Card[]): Card | null {
  return hand.find((c) => (c.type === 'oneShot' || c.type === 'helper') && ((c.combatBonus ?? c.bonus ?? 0) > 0)) ?? null;
}

export class EasyPolicy implements BotPolicy {
  readonly difficulty = 'easy' as const;

  decide({ room, playerId, rng }: BotContext): BotAction {
    const state = room.snapshot();
    const hand = room.privateHandFor(playerId);
    const me = state.players.find((p) => p.id === playerId);
    if (!me) return { kind: 'pass' };

    if (state.combatState && !state.combatState.resolved) {
      if (state.combatState.attackerId !== playerId) {
        return { kind: 'pass' };
      }
      const c = state.combatState;
      const winning = c.playerPower > c.monsterPower;
      if (!winning) {
        const boost = findCombatBoostCard(hand);
        if (boost) {
          return { kind: 'playCard', cardId: boost.id };
        }
        const gap = c.monsterPower - c.playerPower;
        // Take the fight when the gap is narrow OR the monster is weak;
        // flee otherwise. Pure stochastic flee would never level up.
        if (gap <= 2 || (c.monsters[0]?.level ?? 99) <= 3) {
          return { kind: 'fight' };
        }
        return { kind: 'flee' };
      }
      return { kind: 'fight' };
    }

    // Outside combat: always-on opportunistic plays. Equipping is free and
    // strictly increases combat power, so do it eagerly rather than rolling.
    const item = bestUnequippedItem(hand);
    if (item) {
      return { kind: 'playCard', cardId: item.id };
    }
    if (!me.race) {
      const race = hand.find((c) => c.type === 'race');
      if (race) return { kind: 'playCard', cardId: race.id };
    }
    if (!me.class) {
      const cls = hand.find((c) => c.type === 'class');
      if (cls) return { kind: 'playCard', cardId: cls.id };
    }
    if (me.level < state.config.winLevel - 1) {
      const lvl = hand.find((c) => c.type === 'levelUp');
      if (lvl) return { kind: 'playCard', cardId: lvl.id };
    }

    switch (state.turnPhase) {
      case 'turnStart': {
        if (state.config.listeningAtTheDoor && rng() < 0.3) {
          return { kind: 'listenAtDoor' };
        }
        return { kind: 'kickDoor' };
      }
      case 'listening':
      case 'kickDoor':
        return { kind: 'kickDoor' };
      case 'lookForTroubleOrLoot': {
        const sellable = pickSellableForLevel(me);
        if (sellable && rng() < 0.5) {
          return { kind: 'sellItems', cardIds: sellable };
        }
        return { kind: 'lootRoom' };
      }
      case 'charity':
        return { kind: 'endTurn' };
      case 'combat':
      case 'endTurn':
        return { kind: 'pass' };
    }
  }
}
