# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (server + client + e2e)
npm run install:all

# Dev servers (run in separate terminals)
npm --prefix server run dev          # http://localhost:3001
npm --prefix client run dev          # http://localhost:5173

# Typecheck
npm --prefix server run typecheck
npm --prefix client run typecheck

# Tests
npm run test                                    # all tests
npm --prefix server run test                    # server only
npm --prefix client run test                    # client only
npx --prefix server vitest run src/GameRoom.test.ts          # single server test file
npx --prefix client vitest run src/screens/Home.test.tsx     # single client test file
npm --prefix server run test:coverage           # server with coverage
npm --prefix client run test:coverage           # client with coverage

# E2E (requires both dev servers running)
npm --prefix e2e run cy:run
```

Coverage thresholds: 90% lines/statements/functions, 80% branches — enforced in both server and client vitest configs.

## Architecture

Monorepo with three packages: `server/`, `client/`, `e2e/`.

### Server (Express + Socket.IO)

- **Entry:** `server/src/index.ts` → `server/src/server.ts` creates the Express+Socket.IO server
- **GameRoom** (`server/src/GameRoom.ts`): core state machine. One instance per room, keyed by a 6-char code (e.g. `MNK-7X2`). Manages game phases (`lobby` → `playing` → `ended`), turn phases, combat, decks, and player state. All game mutations happen here — the server is authoritative.
- **Decks:** `server/src/Deck.ts` (generic shuffle/draw), cards defined in `server/src/cards/` (doors and treasures)
- **Rules:** `server/src/rules/` — `variants.ts` (4 game variants: rápida/média/longa/cooperativa), `combat.ts`, `abilities.ts`, `phases.ts`
- **Persistence:** `server/src/persistence/` — abstract `RoomRepository` interface with `in-memory.ts` (dev/test) and `firestore.ts` (production). Saves are debounced (~500ms) on each state broadcast.
- **Socket events:** Server broadcasts `game:stateUpdate` (public state) and `game:yourHand` (private per-player). Clients emit `room:join` and gameplay actions.

### Client (React + Vite + Tailwind v4)

- **Screens:** `Home` (create/join room) → `Lobby` (waiting room) → `PlayerView` (individual player) / `BoardView` (shared table view)
- **State management:** No external store. `useGameState` hook listens to socket events for `state`, `hand`, and `fist`. `useSocket` manages the Socket.IO connection singleton.
- **Types** are mirrored: `server/src/types.ts` ↔ `client/src/types.ts`. Keep them in sync when modifying game types.
- **i18n:** Custom system in `client/src/i18n/` with reactive `t` export. Locales: pt-BR, en, es. Stored in `localStorage('munchkin:locale')`.

### E2E (Cypress)

- Config at `e2e/cypress.config.js`, specs in `e2e/cypress/e2e/`
- Uses custom Cypress tasks to spawn "ghost" players (server-side Socket.IO clients) for simulating multiplayer scenarios
- Mobile viewport (414×896)

## Key patterns

- **Authoritative server:** All game logic runs server-side in GameRoom. The client is a thin rendering layer that emits actions and renders the state it receives.
- **Dual broadcast:** Public state goes to all players via `game:stateUpdate`; private hand/fist data goes only to each individual player via `game:yourHand`.
- **Session recovery:** Player sessions are persisted to localStorage so reconnecting to the same room works across refreshes.
