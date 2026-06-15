import { EasyPolicy } from './easy.js';
import type { BotDifficulty, BotPolicy } from './policy.js';

export function getPolicy(difficulty: BotDifficulty): BotPolicy {
  switch (difficulty) {
    case 'easy':
      return new EasyPolicy();
    case 'normal':
    case 'hard':
      // Higher tiers introduced in follow-up PRs — fall back to easy until then.
      return new EasyPolicy();
  }
}
