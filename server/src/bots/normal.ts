import type { Card, Player } from '../types.js';
import type { BotAction, BotContext, BotPolicy } from './policy.js';

const SELL_TARGET = 1000;

function pickSellableForLevel(player: Player, minTotal = SELL_TARGET): string[] | null {
  const pool = [...player.equipped, ...player.carried].filter((c) => (c.value ?? 0) > 0);
  if (pool.length === 0) return null;
  pool.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const chosen: Card[] = [];
  let total = 0;
  for (const c of pool) {
    chosen.push(c);
    total += c.value ?? 0;
    if (total >= minTotal) return chosen.map((x) => x.id);
  }
  return null;
}

function bestUnequippedItem(hand: Card[], me: Player): Card | null {
  const items = hand.filter((c) => c.type === 'item');
  if (!items.length) return null;
  // Prefer a slot that's free; tie-break by bonus.
  const usedSlots = new Set(me.equipped.map((c) => c.slot));
  items.sort((a, b) => {
    const aFree = !usedSlots.has(a.slot) ? 1 : 0;
    const bFree = !usedSlots.has(b.slot) ? 1 : 0;
    if (aFree !== bFree) return bFree - aFree;
    return (b.bonus ?? 0) - (a.bonus ?? 0);
  });
  return items[0] ?? null;
}

function combatBoosts(hand: Card[]): Card[] {
  return hand
    .filter((c) => (c.type === 'oneShot' || c.type === 'helper') && ((c.combatBonus ?? c.bonus ?? 0) > 0))
    .sort((a, b) => (b.combatBonus ?? b.bonus ?? 0) - (a.combatBonus ?? a.bonus ?? 0));
}

function sumBoost(cards: Card[]): number {
  return cards.reduce((s, c) => s + (c.combatBonus ?? c.bonus ?? 0), 0);
}

export class NormalPolicy implements BotPolicy {
  readonly difficulty = 'normal' as const;

  shouldHelp({ room, playerId }: BotContext): boolean {
    // Help if joining flips a losing combat to winning, or if the combat is
    // close enough that the helper's power could swing it.
    const c = room.snapshot().combatState;
    if (!c) return false;
    const me = room.players.find((p) => p.id === playerId);
    if (!me) return false;
    const gap = c.monsterPower - c.playerPower;
    return me.combatPower + 1 >= gap;
  }

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
      const boosts = combatBoosts(hand);
      const gap = c.monsterPower - c.playerPower; // positive = losing
      // Decide if any single boost flips the result; if so, play it.
      if (gap >= 0 && boosts.length > 0) {
        const top = boosts[0]!;
        const value = top.combatBonus ?? top.bonus ?? 0;
        if (value > gap) {
          return { kind: 'playCard', cardId: top.id };
        }
      }
      // If the combined hand boosts can win it, play the highest first.
      const totalAvailable = sumBoost(boosts);
      if (gap >= 0 && totalAvailable > gap && boosts.length > 0) {
        return { kind: 'playCard', cardId: boosts[0]!.id };
      }
      // Otherwise: fight if winning, flee if losing badly.
      if (c.playerPower > c.monsterPower) {
        return { kind: 'fight' };
      }
      if (gap <= 1) {
        return { kind: 'fight' };
      }
      return { kind: 'flee' };
    }

    const item = bestUnequippedItem(hand, me);
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
        if (state.config.listeningAtTheDoor && rng() < 0.5) {
          return { kind: 'listenAtDoor' };
        }
        return { kind: 'kickDoor' };
      }
      case 'listening':
      case 'kickDoor':
        return { kind: 'kickDoor' };
      case 'lookForTroubleOrLoot': {
        // Late-game: aggressively sell to push to win level.
        const closeToWin = me.level >= state.config.winLevel - 2;
        const target = closeToWin ? SELL_TARGET : SELL_TARGET * 1.5;
        const sellable = pickSellableForLevel(me, target);
        if (sellable && (closeToWin || rng() < 0.6)) {
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
