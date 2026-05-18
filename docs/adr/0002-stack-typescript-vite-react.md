# ADR-0002: Stack TypeScript + React + Vite + Tailwind v4

- **Status**: Accepted
- **Data**: 2026-05-16

## Contexto

Cliente precisa ser leve (mobile-first), type-safe (compartilhar tipos com server), fácil de iterar visualmente. Server precisa ser TypeScript pra reuso de tipos.

## Decisão

- **TypeScript** em todo lugar (server, client, e2e config)
- **React 18** + **Vite** pro client (HMR rápido, build pequeno)
- **Tailwind CSS v4** com tema customizado em `index.css` (cores Munchkin)
- Tipos duplicados manualmente entre `server/src/types.ts` e `client/src/types.ts` pra evitar monorepo overhead

## Consequências

- ✅ Iteração visual rápida via Vite HMR
- ✅ Tailwind reduz CSS scattering — componentes self-contained
- ✅ Tipos seguem padrão TS estrito (`strict: true`)
- ❌ Tipos duplicados: se mudar `RoomConfig` no server, lembrar de atualizar no client. Mitigado por testes que asserta o shape.
- ❌ Tailwind v4 ainda é recente — alguns plugins do v3 não funcionam direto

## Por que não monorepo (pnpm/Turbo)?

Avaliado mas rejeitado: overhead de configuração maior que o ganho de eliminar a duplicação de tipos. Projeto tem só 2 pacotes ativos (server, client) + e2e isolado.
