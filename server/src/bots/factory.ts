import { EasyPolicy } from './easy.js';
import { HardPolicy } from './hard.js';
import { NormalPolicy } from './normal.js';
import type { BotDifficulty, BotPolicy } from './policy.js';

export function getPolicy(difficulty: BotDifficulty): BotPolicy {
  switch (difficulty) {
    case 'easy':
      return new EasyPolicy();
    case 'normal':
      return new NormalPolicy();
    case 'hard':
      return new HardPolicy();
  }
}
