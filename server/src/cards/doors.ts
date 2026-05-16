import type { Card } from '../types.js';

// --- Monsters (20) ---
const monsters: Omit<Card, 'id'>[] = [
  { type: 'monster', deck: 'door', name: 'Potted Plant', description: 'Surprisingly aggressive houseplant.', level: 1, treasures: 1, levelsAwarded: 1, badStuff: 'Stub your toe — discard 1 small item.' },
  { type: 'monster', deck: 'door', name: 'Lawyers', description: 'They bill by the round.', level: 6, treasures: 2, levelsAwarded: 1, badStuff: 'They sue you — lose 2 levels.' },
  { type: 'monster', deck: 'door', name: 'Maul Rat', description: 'Vermin from the food court.', level: 1, treasures: 1, levelsAwarded: 1, badStuff: 'Lose 1 level.' },
  { type: 'monster', deck: 'door', name: 'Large Angry Chicken', description: 'Cluck of doom.', level: 2, treasures: 1, levelsAwarded: 1, badStuff: 'Lose 1 level.' },
  { type: 'monster', deck: 'door', name: 'Gazebo', description: "Don't get caught inside.", level: 8, treasures: 2, levelsAwarded: 1, badStuff: 'It eats you whole — death.' },
  { type: 'monster', deck: 'door', name: 'Crabs', description: 'A nasty little parasite.', level: 1, treasures: 1, levelsAwarded: 1, badStuff: 'Discard one piece of headgear.' },
  { type: 'monster', deck: 'door', name: 'Drooling Slime', description: 'Sticky and ill-tempered.', level: 1, treasures: 1, levelsAwarded: 1, badStuff: 'Discard your footgear.' },
  { type: 'monster', deck: 'door', name: 'Tongue Demon', description: 'It mocks you incessantly.', level: 12, treasures: 3, levelsAwarded: 2, badStuff: 'Lose 2 levels.' },
  { type: 'monster', deck: 'door', name: 'Pukachu', description: 'Pocket monster gone wrong.', level: 6, treasures: 2, levelsAwarded: 1, badStuff: 'Discard 2 cards from hand.' },
  { type: 'monster', deck: 'door', name: 'Wannabe Vampire', description: 'A poseur with fangs.', level: 8, treasures: 2, levelsAwarded: 2, badStuff: 'Lose 2 levels.' },
  { type: 'monster', deck: 'door', name: 'Floating Nose', description: 'Sniffs out the weak.', level: 10, treasures: 2, levelsAwarded: 2, badStuff: 'Lose 2 levels and one big item.' },
  { type: 'monster', deck: 'door', name: 'Stoned Golem', description: 'High and immobile.', level: 14, treasures: 3, levelsAwarded: 2, badStuff: 'It crushes you — death.' },
  { type: 'monster', deck: 'door', name: 'Bullrog', description: 'Bovine of the abyss.', level: 18, treasures: 5, levelsAwarded: 3, badStuff: 'Total annihilation — death.' },
  { type: 'monster', deck: 'door', name: 'Plutonium Dragon', description: 'Radioactive lizard king.', level: 20, treasures: 5, levelsAwarded: 4, badStuff: 'Atomic breath — death.' },
  { type: 'monster', deck: 'door', name: 'Squidzilla', description: 'Tentacles everywhere.', level: 16, treasures: 4, levelsAwarded: 3, badStuff: 'Drowned — death.' },
  { type: 'monster', deck: 'door', name: 'Net Troll', description: 'Lives under the bridge to nowhere.', level: 10, treasures: 2, levelsAwarded: 1, badStuff: 'Lose all your treasure.' },
  { type: 'monster', deck: 'door', name: 'Mr. Bones', description: 'Skeleton with attitude.', level: 2, treasures: 1, levelsAwarded: 1, badStuff: 'Lose 1 level.' },
  { type: 'monster', deck: 'door', name: 'Undead Horse', description: 'Should have been put down.', level: 4, treasures: 2, levelsAwarded: 1, badStuff: 'Discard 1 weapon.' },
  { type: 'monster', deck: 'door', name: 'Snails on a Plane', description: 'Slow but unstoppable.', level: 6, treasures: 2, levelsAwarded: 1, badStuff: 'Lose 1 level.' },
  { type: 'monster', deck: 'door', name: 'Amazon', description: 'She is not pleased.', level: 8, treasures: 2, levelsAwarded: 1, badStuff: 'Men lose 2 levels; women take no damage.' },
];

// --- Curses (10) ---
const curses: Omit<Card, 'id'>[] = [
  { type: 'curse', deck: 'door', name: 'Curse! Lose a Level', description: 'Lose one level immediately.', special: 'loseLevel' },
  { type: 'curse', deck: 'door', name: 'Curse! Lose Your Class', description: 'Discard your Class card.', special: 'loseClass' },
  { type: 'curse', deck: 'door', name: 'Curse! Lose Your Race', description: 'Discard your Race card.', special: 'loseRace' },
  { type: 'curse', deck: 'door', name: 'Curse! Discard Equipped Item', description: 'Discard one equipped item of the curser\'s choice.', special: 'discardEquipped' },
  { type: 'curse', deck: 'door', name: 'Curse! Chicken on Your Head', description: '-1 to combat until removed.', special: 'chickenHead' },
  { type: 'curse', deck: 'door', name: 'Curse! Lose Big Item', description: 'Discard one Big item.', special: 'loseBigItem' },
  { type: 'curse', deck: 'door', name: 'Curse! Lose Headgear', description: 'Discard equipped headgear.', special: 'loseHeadgear' },
  { type: 'curse', deck: 'door', name: 'Curse! Lose Footgear', description: 'Discard equipped footgear.', special: 'loseFootgear' },
  { type: 'curse', deck: 'door', name: 'Curse! Income Tax', description: 'Lose all gold-value items worth 600+.', special: 'incomeTax' },
  { type: 'curse', deck: 'door', name: 'Curse! Truly Obnoxious Curse', description: 'Lose 2 levels and one item.', special: 'doubleBad' },
];

// --- Races (5) ---
const races: Omit<Card, 'id'>[] = [
  { type: 'race', deck: 'door', name: 'Elf', description: '+1 to all combats. Sell items for +100 gold.' },
  { type: 'race', deck: 'door', name: 'Dwarf', description: 'You can carry any number of big items.' },
  { type: 'race', deck: 'door', name: 'Halfling', description: 'Sell one item per turn at double price.' },
  { type: 'race', deck: 'door', name: 'Human', description: 'No special abilities — you are flexible.' },
  { type: 'race', deck: 'door', name: 'Orc', description: '+1 to combat strength when wielding a weapon.' },
];

// --- Classes (4) ---
const classes: Omit<Card, 'id'>[] = [
  { type: 'class', deck: 'door', name: 'Warrior', description: '+1 to combat. Win ties.' },
  { type: 'class', deck: 'door', name: 'Cleric', description: 'Discard cards to add +3 vs Undead per card.' },
  { type: 'class', deck: 'door', name: 'Thief', description: 'Steal a small item from a player on a 4+ roll.' },
  { type: 'class', deck: 'door', name: 'Wizard', description: 'Discard 3 cards to charm a monster (auto-flee).' },
];

let cardId = 0;
function mk(card: Omit<Card, 'id'>): Card {
  return { ...card, id: `door-${++cardId}` };
}

export function buildDoorDeck(): Card[] {
  const out: Card[] = [];
  // Stack typical Munchkin door deck weights: many monsters and curses, fewer race/class
  for (const m of monsters) out.push(mk(m), mk(m));         // 40 monsters
  for (const c of curses) out.push(mk(c), mk(c));           // 20 curses
  for (const r of races) out.push(mk(r));                   // 5 races
  for (const c of classes) out.push(mk(c), mk(c));          // 8 classes
  return out;
}
