# ADR-0003: Vitest + Cypress + threshold de cobertura no CI

- **Status**: Accepted
- **Data**: 2026-05-16

## Contexto

Projeto precisa de:
- Tests unitários rápidos pra lógica de jogo (server) e componentes (client)
- Testes de integração socket.io (sem subir subprocess)
- E2E que prove o flow real
- Threshold de cobertura enforçado, não só relatório

## Decisão

- **Vitest** server + client com `v8` coverage provider
- Server roda `createServer()` em-processo no test pra integração socket.io com coverage real
- **Cypress 13** pro E2E com viewport 414×896 (phone) e 1280×800 (tablet)
- Thresholds no `vitest.config.ts`: **90%** lines/statements/functions, **80%** branches
- CI falha se cair abaixo

## Consequências

- ✅ Lint + tests + coverage rodam em <2s no server, ~6s no client
- ✅ Integração socket.io tem coverage real (não subprocess)
- ✅ Threshold no config: ninguém precisa lembrar de configurar no CI
- ❌ 90% functions é estrito — inline arrow functions em onChange contam. Mitigado com testes que disparam cada onChange.
- ⚠️ Cypress 13.17 + Node 22 strip-types tem incompatibilidades; `cypress.config` precisa ser `.js` (não `.ts`)

## Alternativas avaliadas

- **Jest**: descartado por ser mais lento e ter setup mais pesado pra ESM
- **Playwright**: ótimo, mas Cypress tem melhor catálogo visual e integração mais simples
- **Coverage só local**: rejeitado — sem CI enforcement vira "fica pra próxima"
