// Race/class abilities — see docs/adr/0009-passive-active-abilities.md
import type { Card, Munchkin, Player } from '../types.js';

const WEAPON_SLOTS = new Set<string>(['hand', 'twoHands']);

/** Sum of passive combat bonuses from race + class + equipment context. */
export function passiveCombatBonus(player: Munchkin): number {
  let bonus = 0;
  const race = player.race?.name;
  const klass = player.class?.name;

  if (race === 'Elf') bonus += 1;
  if (klass === 'Warrior') bonus += 1;

  if (race === 'Orc') {
    const hasWeapon = player.equipped.some((c) => c.slot && WEAPON_SLOTS.has(c.slot));
    if (hasWeapon) bonus += 1;
  }

  return bonus;
}

/** True if the player wins combat on ties (Warrior). */
export function winsTies(player: Munchkin): boolean {
  return player.class?.name === 'Warrior';
}

/** Flat gold bonus added to a sale (Elf +100). Per sale, not per item. */
export function sellGoldBonus(player: Munchkin): number {
  return player.race?.name === 'Elf' ? 100 : 0;
}

/**
 * Multiplier applied to the FIRST sale of a turn for Halflings.
 * Caller must pass whether this is the first sale (tracked on Player).
 */
export function sellMultiplier(player: Player, isFirstSaleThisTurn: boolean): number {
  if (player.race?.name === 'Halfling' && isFirstSaleThisTurn) return 2;
  return 1;
}

/** Returns true if a monster carries any of the requested tags. */
export function monsterHasTag(card: Card, tag: string): boolean {
  return (card.tags ?? []).includes(tag);
}
