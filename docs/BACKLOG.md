# Backlog

Lista viva. Cada item marcado com status, valor e custo estimado.

Legenda: ✅ feito · 🚧 em andamento · 📅 planejado · 💭 ideia

## ✅ Done — features no main

- Estado autoritativo no servidor, clientes thin
- Variantes (rápida / média / longa / cooperativa)
- Decks de portas/tesouros com shuffle + recycle
- Combate completo (allies, flee, bad stuff, death, noDeath)
- Mercado, Fist mechanic backend, Threat track coop
- Quick-start presets (6 opções)
- PT-BR completo via `i18n.ts`
- PlayerView com oponentes + pilhas + animações
- BoardView com log lateral em `lg:`
- Card preview modal (🔍)
- Toast events + DeathBanner + Confetti
- Sons procedurais opt-in (Web Audio API)
- Onboarding modal 3-step
- Deep-link `?code=`
- Paste clipboard no Home
- Ready toggle no Lobby
- Share button (Web Share API + clipboard fallback)
- Habilidades passivas: Elfo +1, Orc +1 com arma, Guerreiro +1 e ganha empates, Halfling primeira venda dobrada, Elfo +100 ao vender
- Habilidades ativas: Clérigo vs Undead, Wizard charm, Thief steal (UI + server)
- Dual Character pra Longa 2P
- Animação de carta voando do baralho pro combate
- PWA: manifest + service worker
- Acessibilidade: skip-link, focus rings, ARIA-live nos toasts
- BoardView: layout 3-col em `xl:` (combat ao centro, jogadores laterais)
- Persistência: stub Firestore plugável via env
- Analytics: stub Amplitude plugável via env (client + server)
- i18n com 3 idiomas (pt-BR, en, es) e seletor
- 383+ testes · CI: server-tests, client-tests, e2e, coverage-comment, ci-cleanup
- Visual evidence catalog (Cypress screenshots) postado no PR
- Docs/SPEC + ADRs + este backlog

## 📅 Próximos passos sugeridos

| Item | Valor | Custo | Justificativa |
|---|---|---|---|
| Suporte a fork/edit das cartas via JSON externo | 🟡 médio | 🟢 baixo | dá pra criar variantes temáticas sem editar código |
| Modo "observador" (entra na sala mas não joga) | 🟡 médio | 🟡 médio | útil pra streamings, debug |
| Replay/exportar log de partida | 🟢 baixo | 🟡 médio | nostalgia/análise |
| Estatísticas de jogador por device | 🟡 médio | 🟡 médio | precisa de account/login |
| Login social (Google/Apple) | 🟢 baixo | 🔴 alto | tração precisa primeiro |
| Animação de descarte (carta voando pro descarte) | 🟢 baixo | 🟢 baixo | combinaria com a entrada de combate |
| Tutorial interativo dentro do jogo | 🟢 baixo | 🟡 médio | onboarding atual é só leitura |
| Métricas custom no Amplitude (funnels, retention) | 🟡 médio | 🟢 baixo | depende de ter user-base primeiro |
| Modo paisagem dedicado no celular | 🟢 baixo | 🟡 médio | hoje não bloqueia mas é apertado |
| Drag-and-drop de cartas | 🟢 baixo | 🔴 alto | hoje funciona por toque, drag não traz tanto valor mobile |

## 💭 Ideias maiores (precisariam de mais discussão)

- **Bots/IA pra partidas solo**: permitiria jogar offline. Custo alto e altera a dinâmica social que é o ponto do Munchkin.
- **Custom expansões/temas**: Cthulhu, Star, etc. Precisa de um sistema de packs de cartas.
- **Torneios e ranking**: precisa de backend persistente real, login, matchmaking. Foge do MVP "jogue com amigos rapidinho".
- **Mobile native (React Native)**: o app PWA está OK, mas se for crescer pra um app nativo, é um caminho.

## 🐛 Débito técnico conhecido

- Linguagem de erro mista: alguns `Error('Stealing disabled.')` no server estão em inglês; o cliente traduz. Padronizar.
- `e2e/cypress.config.js` é CommonJS por compat com Cypress 13.17 + Node 22 strip-types — quando Cypress 14 sair, tentar voltar a .ts.
- Branch `ci-evidence` cresce a cada PR; `ci-cleanup.yml` apaga `pr-N/` quando fecha. Funciona, mas se a workflow falhar fica lixo. Poderia ter um cron mensal de limpeza.
- Testes de UI dependem de strings PT-BR; se mudar a string padrão, vários testes quebram. Trade-off aceitável vs `data-testid` em tudo.
- `applyCurse` no server tem um `chickenHead` que adiciona uma carta "curse" como item equipado — funciona, mas é fofocado entre os tipos.

## Convenções

- Cada feature nova entra com testes + entrada aqui + ADR se for decisão arquitetural
- Quando algo daqui é implementado, move pra ✅ Done com link pro PR
- Quando algo é declinado, mover pra 💭 com nota da decisão
