# Munchkin Digital Multiplayer

> Munchkin, multiplayer no celular. Estado autoritativo no servidor, clientes finos, tabuleiro compartilhado opcional em outra tela. **Português, Inglês e Espanhol.** Jogue contra amigos online ou contra bots locais.

[![CI](https://github.com/chicomcastro/munchkin-digital-multiplayer/actions/workflows/ci.yml/badge.svg)](https://github.com/chicomcastro/munchkin-digital-multiplayer/actions/workflows/ci.yml)
[![Deploy](https://github.com/chicomcastro/munchkin-digital-multiplayer/actions/workflows/deploy-client.yml/badge.svg)](https://github.com/chicomcastro/munchkin-digital-multiplayer/actions/workflows/deploy-client.yml)
[![Play](https://img.shields.io/badge/play-online-amber)](https://chicomcastro.github.io/munchkin-digital-multiplayer/)
[![Coverage](https://img.shields.io/badge/coverage-server%20%26%20client%20%E2%89%A597%25-brightgreen)](#tests--quality-gates)

**[▶ Jogar agora](https://chicomcastro.github.io/munchkin-digital-multiplayer/)** &nbsp;•&nbsp; [Especificação](./docs/SPEC.md) &nbsp;•&nbsp; [Backlog](./docs/BACKLOG.md) &nbsp;•&nbsp; [ADRs](./docs/adr/)

---

## Highlights

- **Authoritative server.** Toda a lógica do jogo roda no `GameRoom` em Node + Socket.IO. O client é só renderização — sem cheats client-side.
- **Tela do jogador + Board Mode.** O celular é a mão fechada; o tabuleiro compartilhado abre num tablet/notebook.
- **Bots locais.** Adicione adversários AI sem precisar de outras pessoas conectadas. Três níveis (Fácil / Normal / Difícil) com heurísticas crescentes — o Difícil usa 1-step lookahead de combate.
- **Variantes.** Rápida (6 níveis, timer curto), Média (mercado + timer global), Longa (10 níveis, escalada), Cooperativa (boss / trilha / sobrevivência).
- **i18n nativo.** pt-BR / en / es alternáveis em runtime via `localStorage`.
- **Persistência opcional.** Firestore plugável via interface (`RoomRepository`); fallback in-memory para dev/test.
- **Estética temática.** Pergaminho, tipografia medieval, slots de equipamento, mapa do dungeon em SVG.
- **CI exigente.** Vitest + Cypress + sticky coverage comment + visual evidence catalog em todo PR.

## Como rodar localmente

```bash
npm run install:all                                # ou cd em cada subpasta

# Em terminais separados
npm --prefix server run dev                        # http://localhost:3001
npm --prefix client run dev                        # http://localhost:5173
```

Abre o client URL no celular (jogador) e, opcionalmente, num tablet/notebook (Board Mode). O primeiro jogador cria a sala e recebe um código de 6 caracteres (ex.: `MNK-7X2`).

### Jogar contra bots (offline-friendly)

No lobby, o host vê o botão **Adicionar bot** com um dropdown de dificuldade. Bots ocupam slots reais (mesmas regras, mesmo estado), só sem socket — o `BotDriver` decide as ações pelo policy escolhido após um pequeno delay "thinking".

## Bot simulator & balance report

Headless, sem socket, in-process:

```bash
# Roda N partidas, imprime JSON com estatísticas
npm --prefix server run simulate -- --variant=long --players=4 \
  --difficulty=easy --difficulty=normal --difficulty=hard --difficulty=hard \
  --runs=200 --seed=42

# Gera relatório markdown com matriz de matchups por variante
npm --prefix server run balance-report -- --runs=30 --maxTurns=2500 \
  --out=balance.md
```

A mesma abstração (`BotPolicy`) que pilota bots em sala real alimenta o simulator — sem código duplicado.

## Variantes

| Variante | Nível alvo | Mão inicial | Mercado | Timer turno | Timer global |
| --- | --- | --- | --- | --- | --- |
| **Rápida** | 6 | 5/5 | — | 40 s | — |
| **Média** | 10 | 4/4 | 5 cartas | — | 60 min |
| **Longa** | 10 | 4/4 | — | — | — |
| **Cooperativa** | 10 | 4/4 | — | — | — |

Cooperativa: sem maldições contra outros jogadores, vitória por **boss / trilha / sobrevivência**.

## Project layout

```
/server   → Express + Socket.IO, GameRoom, decks, cards, regras, bots
/client   → React + Vite + Tailwind v4: Home, Lobby, PlayerView, BoardView
/e2e      → Cypress specs + visual catalog
/docs     → Spec, ADRs, backlog
/scripts  → Helpers de CI (coverage comment, evidence catalog)
```

Para detalhes de arquitetura e decisões: [`docs/SPEC.md`](./docs/SPEC.md) e [`docs/adr/`](./docs/adr/).

## Tests & quality gates

```bash
# Unit + integration (com cobertura)
npm --prefix server run test:coverage
npm --prefix client run test:coverage

# End-to-end (precisa dos dois dev servers rodando)
npm --prefix e2e run cy:run
```

Server **e** client travam o build em **90% linhas / statements / functions** e **80% branches** (Vitest thresholds). O CI:

1. Roda server tests (unit + Socket.IO integration) com V8 coverage.
2. Roda client tests (component, hook, screen) com V8 coverage.
3. Sobe o server build + client preview e roda Cypress E2E.
4. Constrói o **visual evidence catalog** (`e2e/visual-catalog.html`) a partir dos screenshots.
5. Posta um **sticky coverage comment** no PR que atualiza a cada push.
6. Faz deploy do client no GitHub Pages e do server no Cloud Run nos merges para `main`.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Servidor | Node 20 + TypeScript + Express + Socket.IO |
| Persistência | In-memory (default) ou Firestore (`RoomRepository`) |
| Cliente | React 18 + Vite 5 + Tailwind v4 |
| Testes | Vitest (server/client) + Cypress (e2e) + V8 coverage |
| Hospedagem | GitHub Pages (client) + Google Cloud Run (server) |
