import type { RoomConfig } from '../types.js';

export function defaultConfig(): RoomConfig {
  return {
    playerCount: 4,
    winLevel: 10,
    startingHandDoors: 4,
    startingHandTreasures: 4,
    variant: 'medium',
    turnTimerSeconds: null,
    globalTimerMinutes: null,
    listeningAtTheDoor: false,
    marketEnabled: false,
    marketSize: 3,
    fistMechanicEnabled: false,
    twoPlayerDualCharacter: false,
    aggressionMinLevel: 1,
    coopObjective: 'bossFight',
    coopBossLevel: 20,
    coopTrailSize: 6,
    coopRounds: 8,
    threatTrackEnabled: false,
    noOffensiveCurses: false,
    noStealing: false,
    noDeath: false,
  };
}

export function applyVariant(cfg: RoomConfig): RoomConfig {
  const c = { ...cfg };
  if (c.variant === 'quick') {
    if (!c.winLevel || c.winLevel > 6) c.winLevel = 6;
    c.startingHandDoors = 5;
    c.startingHandTreasures = 5;
    c.listeningAtTheDoor = true;
    if (c.turnTimerSeconds == null) c.turnTimerSeconds = 40;
  } else if (c.variant === 'medium') {
    c.winLevel = 10;
    c.listeningAtTheDoor = true;
    c.marketEnabled = true;
    c.marketSize = 5;
    if (c.globalTimerMinutes == null) c.globalTimerMinutes = 60;
  } else if (c.variant === 'long') {
    c.winLevel = 10;
    c.twoPlayerDualCharacter = c.playerCount === 2;
    c.globalTimerMinutes = null;
  } else if (c.variant === 'cooperative') {
    c.noOffensiveCurses = true;
    c.aggressionMinLevel = 999;
    c.threatTrackEnabled = true;
  }
  return c;
}
