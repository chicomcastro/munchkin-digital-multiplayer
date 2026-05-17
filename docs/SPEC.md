# Munchkin Digital Multiplayer — Especificação

Esta é a referência viva do produto: o que ele faz, como está organizado, quais decisões foram tomadas e por quê. ADRs detalhadas em [`docs/adr/`](./adr/). Backlog vivo em [`BACKLOG.md`](./BACKLOG.md).

## Visão

Aplicação web multiplayer de **Munchkin**: cada jogador entra pelo celular numa sala com código; um tablet/notebook opcional exibe o tabuleiro compartilhado. Estado autoritativo no servidor, clientes "thin" só renderizam o snapshot recebido.

## Arquitetura

```
/server   Node + TypeScript + socket.io (autoritativo)
/client   React + Vite + Tailwind v4 + Socket.IO client
/e2e      Cypress + visual evidence catalog
/docs     Spec, ADRs, backlog
/scripts  CI helpers (coverage comment, evidence catalog, etc.)
```

Veja [ADR-0001](./adr/0001-client-server-architecture.md) pra justificativa da separação client/server.

## Estado do jogo

O servidor mantém um `GameRoom` por sala. Cada sala tem:

- `RoomConfig` — variantes (rápida / média / longa / cooperativa), nível alvo, tempos, mercado, mecânica do Punho, regras coop, etc.
- `Player[]` — nome, cor, nível, força, mão, equipamentos, raça, classe, reserva do Punho, e em modo dual-character um array `characters` de personagens alternativos.
- `Deck` de portas e tesouros (Fisher-Yates, recicla discard quando esvazia)
- `CombatState | null` — combate ativo com atacante, monstros, cartas jogadas
- `log: LogEntry[]` — eventos tagueados (`combat`, `curse`, `level`, `system`, `info`)
- Trilhas cooperativas: `coopBossHpRemaining`, `coopMonstersDefeated`, `threatTrack`
- Timers: `turnTimerEndsAt`, `globalTimerEndsAt`

Cliente recebe `GameState` via `game:stateUpdate` (público) e `game:yourHand` (privado, só o jogador dono recebe sua mão e Punho).

## Fluxo de uma partida

1. **Home** — jogador entra o nome, cria sala (ganha código `MNK-XXX`) ou entra por código (`?code=MNK-XXX` deep-link funciona).
2. **Lobby** — criador escolhe preset ou configura; demais marcam "Pronto"; criador inicia.
3. **PlayerView** (celular) — header com nível/força, mão em carrossel, painel de oponentes, pilhas de descarte, footer sticky com botões de turno; modal de preview ao tocar 🔍 numa carta.
4. **BoardView** (tablet/notebook) — arena de combate central, log lateral fixo em `lg:`, status de todos os jogadores, mercado, trilha cooperativa, timers com barra de progresso.

## Variantes

Definidas em `server/src/rules/variants.ts`:

| Variante | winLevel | Override automático |
|---|---|---|
| Rápida | 6 | mãos iniciais 5+5, escutar porta, timer 40s |
| Média | 10 | escutar, mercado aberto, timer global 60min |
| Longa | 10 | dual character pra 2 jogadores, sem timer global |
| Cooperativa | configurável | sem maldições ofensivas, threat track, vitória por chefão/trilha/sobrevivência |

Veja [ADR-0008](./adr/0008-variant-config-merging.md) pra como o `applyVariant` decide.

## Cartas

Geração em `server/src/cards/`:
- 73 portas (40 monstros + 20 maldições + 5 raças + 8 classes — com duplicatas estratégicas)
- ~45 tesouros (itens, poções, helpers, level-ups)

Cartas têm `tags?: string[]` (ex: `'undead'`) que permite habilidades condicionais.

## Habilidades de Raça/Classe

Implementadas em `server/src/rules/abilities.ts`:

| Raça/Classe | Efeito |
|---|---|
| Elfo | +1 em combate (passivo); +100 gold ao vender |
| Anão | Sem limite de itens grandes (carry-all) |
| Halfling | Primeira venda do turno tem o valor dobrado |
| Humano | Sem habilidade — flexível |
| Orc | +1 em combate quando empunha uma arma |
| Guerreiro | +1 em combate; vence empates |
| Clérigo | Descartar cartas pra +3 vs Undead (por carta) |
| Ladrão | Roubar item pequeno num d6 4+ (1 = fumble) |
| Mago | Descartar 3 cartas pra encantar monstro (fuga automática) |

Veja [ADR-0009](./adr/0009-passive-active-abilities.md).

## Mecânica do Punho

`fistMechanicEnabled` reserva até 3 cartas de porta que o jogador pode jogar a qualquer momento — pra ajudar num combate aliado ou atrapalhar um oponente. UI tem botão "Reservar no Punho" no painel de carta selecionada.

## Dual Character

`twoPlayerDualCharacter` (ativado automaticamente em Longa 2P) dá a cada jogador 2 personagens. O jogador alterna qual está "ativo" via botão "Trocar personagem". Apenas o ativo ganha nível, equipa, e participa de combate; o outro fica congelado.

## Persistência

Por padrão: in-memory (`Map<code, GameRoom>`). Define `PERSISTENCE=firestore` + credenciais Google Cloud pra habilitar Firestore. Veja [ADR-0006](./adr/0006-firestore-persistence.md).

## Analytics

Wrapper em `client/src/analytics.ts` (e `server/src/analytics.ts`). No-op enquanto `VITE_AMPLITUDE_KEY` (ou `AMPLITUDE_KEY` no server) não estiverem setadas. Eventos rastreados em [ADR-0007](./adr/0007-amplitude-analytics.md).

## i18n

`client/src/i18n/` com strings por locale (`pt-BR`, `en`, `es`). Detecção automática via `navigator.language` com override em localStorage. Veja [ADR-0010](./adr/0010-i18n.md).

## PWA

Manifest + service-worker mínimos pra que a página possa ser instalada como app no celular. Sem offline-first pesado por enquanto. Veja [ADR-0011](./adr/0011-pwa.md).

## Testes & CI

- Vitest no server (`/server`) e cliente (`/client`), threshold 90% lines/statements/functions / 80% branches
- Cypress no `/e2e` com catálogo visual postado no PR
- GitHub Actions: server-tests, client-tests, e2e, coverage-comment (sticky), ci-cleanup (apaga `pr-N/` de PRs fechadas na branch `ci-evidence`)

## Onde olhar primeiro

- `server/src/GameRoom.ts` — máquina de estados da sala
- `server/src/rules/` — combate, fases, variantes, habilidades
- `client/src/screens/` — Home / Lobby / PlayerView / BoardView
- `client/src/i18n/` — strings por idioma
- `docs/adr/` — decisões arquiteturais
