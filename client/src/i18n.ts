// Central PT-BR string table. Importing components reference fields here
// instead of inlining literals so the translation is consistent and tests
// can compare against the same source of truth.

export const t = {
  // Common
  online: 'online',
  offline: 'offline',
  none: 'nada',
  leave: 'sair',
  copy: 'Copiar',
  copied: 'Copiado!',
  share: 'Compartilhar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',

  // Home
  homeSubtitle: 'Multiplayer digital',
  yourName: 'Seu nome',
  namePlaceholder: 'Aventureiro',
  createRoom: 'Criar sala',
  or: 'ou',
  roomCode: 'Código da sala',
  roomCodePlaceholder: 'MNK-XXX',
  joinRoom: 'Entrar na sala',
  errChooseName: 'Escolha um nome primeiro.',
  errEnterRoomCode: 'Digite o código da sala.',

  // App
  connecting: 'Conectando…',
  reconnecting: 'Reconectando…',
  disconnectedBanner: 'Desconectado — reconectando…',

  // Lobby
  room: 'Sala',
  boardMode: 'Modo tabuleiro',
  playerMode: 'Modo jogador',
  presets: 'Configurações rápidas',
  presetsHint: 'Toque num preset pra preencher a configuração — você ainda pode ajustar abaixo.',
  players: 'Jogadores',
  configuration: 'Configuração',
  showConfig: 'Mostrar configuração avançada',
  hideConfig: 'Esconder configuração avançada',
  variant: 'Variante',
  winLevel: 'Nível alvo',
  playerCount: 'Máximo de jogadores',
  startingHandDoors: 'Mão inicial (portas)',
  startingHandTreasures: 'Mão inicial (tesouros)',
  listeningAtTheDoor: 'Escutar atrás da porta',
  marketEnabled: 'Mercado',
  marketSize: 'Tamanho do mercado',
  fistMechanic: 'Mecânica do Punho',
  noOffensiveCurses: 'Sem maldições contra outros jogadores',
  noStealing: 'Sem roubo',
  noDeath: 'Sem morte (perde metade dos itens)',
  turnTimerSeconds: 'Tempo do turno (s)',
  globalTimerMinutes: 'Tempo total (min)',
  coopObjective: 'Objetivo cooperativo',
  coopObjectiveBoss: 'Chefão',
  coopObjectiveTrail: 'Trilha de masmorra',
  coopObjectiveSurvive: 'Sobreviver rodadas',
  coopBossLevel: 'Nível do chefão',
  coopTrailSize: 'Tamanho da trilha',
  coopRounds: 'Rodadas',
  threatTrackEnabled: 'Medidor de ameaça',
  startGame: 'Iniciar jogo',
  waitingForHost: (host: string) => `Aguardando ${host} iniciar…`,
  configReadOnly: '(somente leitura)',
  disconnectedLabel: 'Desconectado',

  // Tooltips on technical fields
  tipListening: 'Compra 1 carta de Porta antes de chutar a porta.',
  tipMarket: 'Mantém N tesouros virados pra cima; jogadores podem trocar cartas da mão por equivalente valor.',
  tipFist: '3 cartas de porta ficam reservadas; podem ser usadas pra ajudar ou atacar.',
  tipNoOffensiveCurses: 'Bloqueia jogar maldições em outros jogadores.',
  tipNoStealing: 'Bloqueia roubar itens de outros jogadores.',
  tipNoDeath: 'Em vez de morrer, perde só metade dos itens equipados.',
  tipThreatTrack: 'Cada derrota empurra a barra; cheia, todos perdem.',

  // PlayerView
  hand: 'Sua mão',
  fistReserve: 'Punho (reserva)',
  empty: 'vazia',
  level: 'Nível',
  power: 'Força',
  noRace: 'Sem raça',
  noClass: 'Sem classe',
  turn: 'Turno',
  yourTurn: 'Sua vez!',
  active: 'Vez de',
  listen: 'Escutar',
  kickDoor: 'Chutar porta',
  lootRoom: 'Saquear',
  endTurn: 'Encerrar turno',
  resolveCombat: 'Resolver combate',
  flee: 'Fugir',
  helpInCombat: 'Ajudar no combate',
  equip: 'Equipar',
  use: 'Usar',
  become: 'Tornar-se',
  playIntoCombat: 'Jogar no combate',
  castOn: 'Lançar em…',
  lookForTrouble: 'Procurar encrenca',
  markForSale: 'Marcar pra vender',
  unmarkForSale: 'Desmarcar',
  sellForLevels: 'Vender por níveis',
  selling: (n: number) => `Vendendo ${n} ${n === 1 ? 'item' : 'itens'}`,
  decksLabel: 'Pilhas',
  doors: 'Portas',
  treasures: 'Tesouros',
  discard: 'Descarte',
  opponents: 'Oponentes',

  // BoardView
  active2: 'Vez de:',
  globalTimer: 'Total',
  coopStatus: 'Status cooperativo',
  bossHp: 'Vida do chefão',
  trail: 'Trilha',
  round: 'Rodada',
  threat: 'Ameaça',
  noActiveCombat: 'Sem combate ativo',
  market: 'Mercado',
  log: 'Histórico',
  gameOver: 'Fim de jogo',
  winner: 'Vencedor',

  // Combat arena
  combat: 'Combate',
  playerSide: 'Lado dos jogadores',
  monsterSide: 'Lado dos monstros',
  result: 'Resultado',
  playersWinning: (diff: number) => `Jogadores ganhando (+${diff})`,
  monstersWinning: (diff: number) => `Monstros ganhando (+${diff})`,
  pending: 'em andamento',
  victory: 'VITÓRIA',
  badStuff: 'COISA RUIM',
  resultLabel(result: string): string {
    switch (result) {
      case 'victory': return this.victory;
      case 'flee': return 'FUGA';
      case 'badStuff': return this.badStuff;
      default: return this.pending;
    }
  },

  // PlayerStatus
  race: 'Raça',
  klass: 'Classe',
  equipped: 'Equipado',
};

export type CardTypeLabel = 'monster' | 'curse' | 'race' | 'class' | 'item' | 'oneShot' | 'levelUp' | 'helper';

export const cardTypeLabels: Record<CardTypeLabel, string> = {
  monster: 'monstro',
  curse: 'maldição',
  race: 'raça',
  class: 'classe',
  item: 'item',
  oneShot: 'poção',
  levelUp: 'nível',
  helper: 'ajudante',
};

export const variantLabels = {
  quick: 'Rápida',
  medium: 'Média',
  long: 'Longa',
  cooperative: 'Cooperativa',
};
