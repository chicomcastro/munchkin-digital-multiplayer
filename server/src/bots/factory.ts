import { EasyPolicy } from './easy.js';
import { NormalPolicy } from './normal.js';
import type { BotDifficulty, BotPolicy } from './policy.js';

export function getPolicy(difficulty: BotDifficulty): BotPolicy {
  switch (difficulty) {
    case 'easy':
      return new EasyPolicy();
    case 'normal':
      return new NormalPolicy();
    case 'hard':
      // Hard tier arrives in the next PR; fall back to normal for now.
      return new NormalPolicy();
  }
}
