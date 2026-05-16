import type { RoomConfig } from './types';

export interface Preset {
  id: string;
  label: string;
  description: string;
  config: Partial<RoomConfig>;
}

// Sensible quick-start configurations. The server always pipes the patch
// through applyVariant() so variant-driven defaults (win level, market,
// timers, etc.) are filled in automatically — only the overrides need to
// live here.
export const PRESETS: Preset[] = [
  {
    id: 'duel-long-2p',
    label: 'Duelo Longo · 2P',
    description: 'Dois jogadores até o nível 10, mecânica completa, sem timer.',
    config: {
      playerCount: 2,
      variant: 'long',
    },
  },
  {
    id: 'quick-4p',
    label: 'Rápida · 4P',
    description: '4 jogadores, nível 6, mãos maiores e timer de 40s por turno.',
    config: {
      playerCount: 4,
      variant: 'quick',
    },
  },
  {
    id: 'standard-4p',
    label: 'Padrão · 4P',
    description: '4 jogadores, nível 10, mercado aberto, 60min de partida.',
    config: {
      playerCount: 4,
      variant: 'medium',
    },
  },
  {
    id: 'party-6p',
    label: 'Festa · 6P',
    description: '6 jogadores em modo rápido — bom pra grupo grande.',
    config: {
      playerCount: 6,
      variant: 'quick',
    },
  },
  {
    id: 'coop-boss-4p',
    label: 'Coop: Chefão · 4P',
    description: '4 aventureiros enfrentam um chefão de nível 20.',
    config: {
      playerCount: 4,
      variant: 'cooperative',
      coopObjective: 'bossFight',
      coopBossLevel: 20,
    },
  },
  {
    id: 'coop-trail-3p',
    label: 'Coop: Trilha · 3P',
    description: '3 aventureiros, derrotem 6 monstros pra completar a dungeon.',
    config: {
      playerCount: 3,
      variant: 'cooperative',
      coopObjective: 'dungeonTrail',
      coopTrailSize: 6,
    },
  },
];
