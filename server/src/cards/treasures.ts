import type { Card } from '../types.js';

// --- Items (30 distinct entries) ---
const items: Omit<Card, 'id'>[] = [
  { type: 'item', deck: 'treasure', name: 'Sneaky Bastard Sword', description: 'A backstabbing blade.', value: 400, bonus: 2, slot: 'hand' },
  { type: 'item', deck: 'treasure', name: 'Boots of Butt-Kicking', description: '+2 in combat.', value: 400, bonus: 2, slot: 'feet' },
  { type: 'item', deck: 'treasure', name: 'Horny Helmet', description: 'Headgear with attitude.', value: 600, bonus: 1, slot: 'head' },
  { type: 'item', deck: 'treasure', name: 'Slimy Armor', description: 'It oozes — but it works.', value: 200, bonus: 1, slot: 'body' },
  { type: 'item', deck: 'treasure', name: 'Eleven-Foot Pole', description: '+1 in combat, big.', value: 200, bonus: 1, slot: 'hand', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Mithril Armor', description: 'Light and shiny.', value: 600, bonus: 3, slot: 'body', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Broad Sword', description: 'It is broad.', value: 400, bonus: 3, slot: 'twoHands', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Buckler of Swashing', description: 'Pirate-flavored shield.', value: 400, bonus: 2, slot: 'hand' },
  { type: 'item', deck: 'treasure', name: 'Cheese Grater of Peace', description: 'Sharp and reflective.', value: 400, bonus: 3, slot: 'hand' },
  { type: 'item', deck: 'treasure', name: 'Chainsaw of Bloody Dismemberment', description: 'Loud, lethal, big.', value: 600, bonus: 3, slot: 'twoHands', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Flaming Armor', description: 'Burning bright.', value: 400, bonus: 2, slot: 'body' },
  { type: 'item', deck: 'treasure', name: 'Helm of Courage', description: 'Slightly dented.', value: 200, bonus: 1, slot: 'head' },
  { type: 'item', deck: 'treasure', name: 'Pointy Hat of Power', description: 'Wizards love it.', value: 400, bonus: 3, slot: 'head', classRestriction: 'Wizard' },
  { type: 'item', deck: 'treasure', name: 'Singing & Dancing Sword', description: 'Bardic blade.', value: 400, bonus: 2, slot: 'twoHands', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Spiky Knees', description: 'Painful to be kicked by.', value: 200, bonus: 1, slot: 'none' },
  { type: 'item', deck: 'treasure', name: 'Stepladder', description: 'Useful for tall monsters.', value: 400, bonus: 2, slot: 'none', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Swiss Army Polearm', description: 'Pointy, slicy, screwdrivery.', value: 600, bonus: 4, slot: 'twoHands', bigItem: true },
  { type: 'item', deck: 'treasure', name: 'Tuba of Charm', description: 'Soothes the savage beast.', value: 300, bonus: 1, slot: 'none' },
  { type: 'item', deck: 'treasure', name: 'Wand of Dowsing', description: 'Finds anything wet.', value: 300, bonus: 2, slot: 'hand' },
  { type: 'item', deck: 'treasure', name: 'Pantyhose of Giant Strength', description: '+3 to combat. Don\'t ask.', value: 600, bonus: 3, slot: 'body' },
  { type: 'item', deck: 'treasure', name: 'Rapier of Unfairness', description: 'Cheap shots only.', value: 400, bonus: 2, slot: 'hand' },
  { type: 'item', deck: 'treasure', name: 'Hammer of Kneecapping', description: 'They never see it coming.', value: 600, bonus: 4, slot: 'twoHands', bigItem: true },
  // Potions / one-shots (count as items in MVP)
  { type: 'oneShot', deck: 'treasure', name: 'Potion of Halitosis', description: '+2 to any combat.', value: 100, combatBonus: 2 },
  { type: 'oneShot', deck: 'treasure', name: 'Potion of General Studliness', description: '+3 to any combat.', value: 100, combatBonus: 3 },
  { type: 'oneShot', deck: 'treasure', name: 'Potion of Idiotic Bravery', description: '+2 to any combat.', value: 100, combatBonus: 2 },
  { type: 'oneShot', deck: 'treasure', name: 'Magic Missile', description: '+5 to any combat.', value: 300, combatBonus: 5 },
  { type: 'oneShot', deck: 'treasure', name: 'Friendship Potion', description: '+1 to any combat.', value: 100, combatBonus: 1 },
  // Level-up cards
  { type: 'levelUp', deck: 'treasure', name: 'Boil an Anthill', description: 'Go up 1 level.', value: 0, special: 'levelUp' },
  { type: 'levelUp', deck: 'treasure', name: 'Convenient Addition Error', description: 'Go up 1 level.', value: 0, special: 'levelUp' },
  { type: 'levelUp', deck: 'treasure', name: 'Whine at the GM', description: 'Go up 1 level.', value: 0, special: 'levelUp' },
];

// --- Helpers (5) ---
const helpers: Omit<Card, 'id'>[] = [
  { type: 'helper', deck: 'treasure', name: 'Hireling', description: '+1 helper in combat. Sacrifice to escape.', combatBonus: 1, special: 'helper' },
  { type: 'helper', deck: 'treasure', name: 'Doppelganger', description: 'Doubles your combat strength once.', combatBonus: 0, special: 'doppelganger' },
  { type: 'helper', deck: 'treasure', name: 'Reinforce +2', description: '+2 to any side of a combat.', combatBonus: 2, special: 'reinforce' },
  { type: 'helper', deck: 'treasure', name: 'Reinforce +3', description: '+3 to any side of a combat.', combatBonus: 3, special: 'reinforce' },
  { type: 'helper', deck: 'treasure', name: 'Reinforce +5', description: '+5 to any side of a combat.', combatBonus: 5, special: 'reinforce' },
];

let cardId = 0;
function mk(card: Omit<Card, 'id'>): Card {
  return { ...card, id: `treasure-${++cardId}` };
}

export function buildTreasureDeck(): Card[] {
  const out: Card[] = [];
  for (const i of items) out.push(mk(i));        // 30 items
  for (const h of helpers) out.push(mk(h), mk(h)); // 10 helpers
  // Some duplicates of level-ups and potions for replayability
  for (const i of items.filter((x) => x.type === 'oneShot' || x.type === 'levelUp')) {
    out.push(mk(i));
  }
  return out;
}
