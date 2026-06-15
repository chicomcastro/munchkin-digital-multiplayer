// Shape of the translation table. Every locale file must implement this.

export interface Translations {
  // Common
  online: string;
  offline: string;
  none: string;
  leave: string;
  copy: string;
  copied: string;
  share: string;
  cancel: string;
  confirm: string;

  // Home
  homeSubtitle: string;
  yourName: string;
  namePlaceholder: string;
  createRoom: string;
  or: string;
  roomCode: string;
  roomCodePlaceholder: string;
  joinRoom: string;
  errChooseName: string;
  errEnterRoomCode: string;

  // App
  connecting: string;
  reconnecting: string;
  disconnectedBanner: string;

  // Lobby
  room: string;
  boardMode: string;
  playerMode: string;
  presets: string;
  presetsHint: string;
  players: string;
  configuration: string;
  showConfig: string;
  hideConfig: string;
  variant: string;
  winLevel: string;
  playerCount: string;
  startingHandDoors: string;
  startingHandTreasures: string;
  listeningAtTheDoor: string;
  marketEnabled: string;
  marketSize: string;
  fistMechanic: string;
  noOffensiveCurses: string;
  noStealing: string;
  noDeath: string;
  turnTimerSeconds: string;
  globalTimerMinutes: string;
  coopObjective: string;
  coopObjectiveBoss: string;
  coopObjectiveTrail: string;
  coopObjectiveSurvive: string;
  coopBossLevel: string;
  coopTrailSize: string;
  coopRounds: string;
  threatTrackEnabled: string;
  startGame: string;
  waitingForHost: (host: string) => string;
  configReadOnly: string;
  disconnectedLabel: string;

  // Tooltips
  tipListening: string;
  tipMarket: string;
  tipFist: string;
  tipNoOffensiveCurses: string;
  tipNoStealing: string;
  tipNoDeath: string;
  tipThreatTrack: string;

  // PlayerView
  hand: string;
  fistReserve: string;
  empty: string;
  level: string;
  power: string;
  noRace: string;
  noClass: string;
  turn: string;
  yourTurn: string;
  active: string;
  listen: string;
  kickDoor: string;
  lootRoom: string;
  endTurn: string;
  resolveCombat: string;
  flee: string;
  helpInCombat: string;
  equip: string;
  use: string;
  become: string;
  playIntoCombat: string;
  castOn: string;
  lookForTrouble: string;
  markForSale: string;
  unmarkForSale: string;
  sellForLevels: string;
  selling: (n: number) => string;
  decksLabel: string;
  doors: string;
  treasures: string;
  discard: string;
  opponents: string;
  reserveInFist: string;
  swapCharacter: string;
  charactersLabel: string;
  activeCharacterTag: string;
  alternateCharacterTag: string;
  swap: string;
  steal: string;
  stealFrom: string;
  cleric: string;
  wizard: string;

  // BoardView
  active2: string;
  globalTimer: string;
  coopStatus: string;
  bossHp: string;
  trail: string;
  round: string;
  threat: string;
  noActiveCombat: string;
  market: string;
  dungeonMap: string;
  dungeonGoal: string;
  log: string;
  gameOver: string;
  winner: string;

  // Combat
  combat: string;
  playerSide: string;
  monsterSide: string;
  result: string;
  playersWinning: (diff: number) => string;
  monstersWinning: (diff: number) => string;
  pending: string;
  victory: string;
  badStuff: string;
  fugaLabel: string;

  // PlayerStatus
  race: string;
  klass: string;
  equipped: string;

  // Foundation
  pasteCode: string;
  pasted: string;
  brandTagline: string;
  ready: string;
  notReady: string;
  toggleReady: string;
  toggleNotReady: string;

  // Toasts
  youGotCard: (name: string) => string;
  youLeveledUp: (n: number) => string;
  youDied: string;
  combatWon: (name: string) => string;
  combatLost: (name: string) => string;
  gameWon: (name: string) => string;

  // Card preview
  expandCard: string;
  closePreview: string;

  // Death
  deathBanner: string;
  deathSub: string;

  // Sound
  soundOn: string;
  soundOff: string;
  toggleSound: string;

  // Onboarding
  onboardingSkip: string;
  onboardingNext: string;
  onboardingDone: string;
  onboardingTitle1: string;
  onboardingBody1: string;
  onboardingTitle2: string;
  onboardingBody2: string;
  onboardingTitle3: string;
  onboardingBody3: string;
  onboardingHelp: string;

  // Empty flavor
  emptyEquipped: string;
  emptyDiscardDoor: string;
  emptyDiscardTreasure: string;
  emptyNoCombat: string;
  emptyHand: string;
  emptyOpponents: string;

  // Card type labels
  cardTypeLabels: Record<string, string>;
  variantLabels: Record<string, string>;

  // Card preview detail strings
  monsterStats: (level: number, treasures: number, levelsAwarded: number) => string;
  combatBonusSuffix: string;
  bigItemLabel: string;
  slotLabel: (slot: string) => string;
  badStuffLabel: string;

  // Helpers
  resultLabel: (result: string) => string;

  // Turn phase banner
  phaseBannerKick: string;
  phaseBannerCombat: string;
  phaseBannerLoot: string;
  phaseBannerCharity: string;
  phaseBannerEndTurn: string;
  phaseBannerWaiting: (name: string) => string;

  // Icons (same across locales; kept here for typing)
  iconKick: string;
  iconLoot: string;
  iconListen: string;
  iconEndTurn: string;
  iconFlee: string;
  iconResolve: string;
  iconHelp: string;
  iconShare: string;
}

export type LocaleCode = 'pt-BR' | 'en' | 'es';

export interface LocaleMeta {
  code: LocaleCode;
  label: string;
  flag: string;
}

export const LOCALES: LocaleMeta[] = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];
