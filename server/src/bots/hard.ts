import type { Card, GameState, Player } from '../types.js';
import type { BotAction, BotContext, BotPolicy } from './policy.js';

const SELL_TARGET = 1000;

function combatBoosts(hand: Card[]): Card[] {
  return hand
    .filter((c) => (c.type === 'oneShot' || c.type === 'helper') && ((c.combatBonus ?? c.bonus ?? 0) > 0))
    .sort((a, b) => (b.combatBonus ?? b.bonus ?? 0) - (a.combatBonus ?? a.bonus ?? 0));
}

function boostValue(c: Card): number {
  return c.combatBonus ?? c.bonus ?? 0;
}

function pickSellable(player: Player, minTotal = SELL_TARGET): string[] | null {
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

function unequippedItems(hand: Card[], me: Player): Card[] {
  const usedSlots = new Set(me.equipped.map((c) => c.slot));
  return hand
    .filter((c) => c.type === 'item')
    .sort((a, b) => {
      const aFree = !usedSlots.has(a.slot) ? 1 : 0;
      const bFree = !usedSlots.has(b.slot) ? 1 : 0;
      if (aFree !== bFree) return bFree - aFree;
      return (b.bonus ?? 0) - (a.bonus ?? 0);
    });
}

interface CombatEval {
  action: BotAction;
  expectedValue: number;
}

/**
 * Estimate the EV of a combat action by simulating the resulting power gap.
 *
 *   fight: win if playerPower > monsterPower → +levelsAwarded + treasures
 *   fight: lose → expected loss based on bad stuff (−2 for "death", −1 otherwise)
 *   flee: 5-of-6 success → 0; failure → bad stuff penalty
 *   playCard(boost): adds bonus, then recurse one step (limited depth)
 */
function evaluateCombat(state: GameState, me: Player, hand: Card[], depth: number): CombatEval {
  const c = state.combatState!;
  const winning = c.playerPower > c.monsterPower;
  const monster = c.monsters[0]!;
  const levels = monster.levelsAwarded ?? 1;
  const treasures = monster.treasures ?? 1;
  const isDeath = /death/i.test(monster.badStuff ?? '');
  const deathPenalty = isDeath ? -8 : (/lose 2/i.test(monster.badStuff ?? '') ? -2 : -1);

  const winReward = levels + treasures * 0.25;
  const fightEv = winning ? winReward : deathPenalty;

  // Flee: roll 5+ on d6 → 1/3 success in the original Munchkin, but rollFlee here
  // uses a different formula. Use 0.5 success as a generic estimate; bad stuff
  // weighted by deathPenalty.
  const fleeSuccessRate = 0.5;
  const fleeEv = fleeSuccessRate * 0 + (1 - fleeSuccessRate) * deathPenalty;

  const candidates: CombatEval[] = [
    { action: { kind: 'fight' }, expectedValue: fightEv },
    { action: { kind: 'flee' }, expectedValue: fleeEv },
  ];

  if (depth > 0) {
    const boosts = combatBoosts(hand);
    for (const boost of boosts) {
      // Hypothetical state with this card played: playerPower goes up by its value.
      const hypState: GameState = {
        ...state,
        combatState: {
          ...c,
          playerPower: c.playerPower + boostValue(boost),
          cardsPlayedThisRound: [...c.cardsPlayedThisRound, { playerId: me.id, card: boost, side: 'player' }],
        },
      };
      const hypHand = hand.filter((h) => h.id !== boost.id);
      const inner = evaluateCombat(hypState, me, hypHand, depth - 1);
      // Subtract a small opportunity cost for spending a card.
      candidates.push({ action: { kind: 'playCard', cardId: boost.id }, expectedValue: inner.expectedValue - 0.1 });
    }
  }

  candidates.sort((a, b) => b.expectedValue - a.expectedValue);
  return candidates[0]!;
}

export class HardPolicy implements BotPolicy {
  readonly difficulty = 'hard' as const;

  decide({ room, playerId, rng }: BotContext): BotAction {
    const state = room.snapshot();
    const hand = room.privateHandFor(playerId);
    const me = state.players.find((p) => p.id === playerId);
    if (!me) return { kind: 'pass' };

    if (state.combatState && !state.combatState.resolved) {
      if (state.combatState.attackerId !== playerId) return { kind: 'pass' };
      return evaluateCombat(state, me, hand, 2).action;
    }

    // Pre-combat: equip best items in a row, claim free levels, then act.
    const items = unequippedItems(hand, me);
    if (items.length > 0) {
      return { kind: 'playCard', cardId: items[0]!.id };
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
        if (state.config.listeningAtTheDoor && rng() < 0.7) {
          return { kind: 'listenAtDoor' };
        }
        return { kind: 'kickDoor' };
      }
      case 'listening':
      case 'kickDoor':
        return { kind: 'kickDoor' };
      case 'lookForTroubleOrLoot': {
        // "Look for trouble": play a low-level monster from hand if we'd beat it easily.
        const safeMonster = hand
          .filter((c) => c.type === 'monster' && (c.level ?? 99) + 1 < me.combatPower)
          .sort((a, b) => (b.levelsAwarded ?? 1) - (a.levelsAwarded ?? 1))[0];
        if (safeMonster) {
          return { kind: 'playCard', cardId: safeMonster.id };
        }
        // Aggressive late-game selling.
        const closeToWin = me.level >= state.config.winLevel - 2;
        const target = closeToWin ? SELL_TARGET : SELL_TARGET * 1.4;
        const sellable = pickSellable(me, target);
        if (sellable && (closeToWin || rng() < 0.7)) {
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
