import type { Card, Player } from '../types.js';

export function computeEquippedBonus(player: Player): number {
  let total = 0;
  for (const c of player.equipped) {
    if (c.bonus) total += c.bonus;
  }
  return total;
}

export function computePlayerCombatStrength(player: Player): number {
  return player.level + computeEquippedBonus(player);
}

export function computeMonsterPower(monsters: Card[], targetLevel: number): number {
  let total = 0;
  for (const m of monsters) {
    total += m.level ?? 0;
  }
  // "Wandering" monsters or boss escalations could be added here.
  return total;
}

export interface CombatTotals {
  playerSide: number;
  monsterSide: number;
  diff: number;            // playerSide - monsterSide
}

export function totals(opts: {
  attacker: Player;
  ally: Player | null;
  monsters: Card[];
  played: { side: 'player' | 'monster'; card: Card }[];
}): CombatTotals {
  const playerBase = computePlayerCombatStrength(opts.attacker)
    + (opts.ally ? computePlayerCombatStrength(opts.ally) : 0);
  let playerMods = 0;
  let monsterMods = 0;
  for (const p of opts.played) {
    const bonus = p.card.combatBonus ?? p.card.bonus ?? p.card.level ?? 0;
    if (p.side === 'player') playerMods += bonus;
    else monsterMods += bonus;
  }
  const monsterBase = opts.monsters.reduce((s, m) => s + (m.level ?? 0), 0);
  const playerSide = playerBase + playerMods;
  const monsterSide = monsterBase + monsterMods;
  return { playerSide, monsterSide, diff: playerSide - monsterSide };
}

export function rollFlee(modifier = 0): { roll: number; success: boolean } {
  const roll = 1 + Math.floor(Math.random() * 6);
  return { roll, success: roll + modifier >= 5 };
}
