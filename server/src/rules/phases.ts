import type { TurnPhase } from '../types.js';

export const PHASE_ORDER: TurnPhase[] = [
  'turnStart',
  'listening',
  'kickDoor',
  'combat',
  'lookForTroubleOrLoot',
  'charity',
  'endTurn',
];

export function nextPhase(current: TurnPhase, opts: { listening: boolean; afterCombat?: boolean }): TurnPhase {
  switch (current) {
    case 'turnStart':
      return opts.listening ? 'listening' : 'kickDoor';
    case 'listening':
      return 'kickDoor';
    case 'kickDoor':
      // resolved externally — caller chooses 'combat' or 'lookForTroubleOrLoot'
      return 'lookForTroubleOrLoot';
    case 'combat':
      return opts.afterCombat ? 'lookForTroubleOrLoot' : 'combat';
    case 'lookForTroubleOrLoot':
      return 'charity';
    case 'charity':
      return 'endTurn';
    case 'endTurn':
      return 'turnStart';
  }
}
