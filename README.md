# Munchkin Digital Multiplayer

A multiplayer digital implementation of Munchkin with a client-server architecture.

- **Server:** Node.js + TypeScript + Socket.IO (`/server`)
- **Client:** React + TypeScript + Vite + Tailwind CSS v4 (`/client`)
- **State:** authoritative on the server, broadcast over WebSocket
- **Decks:** shuffled (Fisher-Yates) in memory; no DB

## Run locally

```bash
# Terminal 1 — server
cd server
npm install
npm run dev          # http://localhost:3001

# Terminal 2 — client
cd client
npm install
npm run dev          # http://localhost:5173
```

Open the client URL on a phone (player) and optionally on a tablet/notebook for **Board Mode**. The first player to enter creates a room and receives a 6-character code (e.g. `MNK-7X2`).

## Variants

- **Rápida** — target 6 levels, larger starting hands, 40s turn timer
- **Média** — target 10 levels, open market, 60min global timer
- **Longa** — target 10 levels, dual-character for 2 players, hardened scaling past lv 7
- **Cooperativa** — no offensive curses, win by boss/trail/survival

## Project layout

```
/server   → Express + socket.io, GameRoom, Deck, cards, rules
/client   → React app: Home, Lobby, PlayerView, BoardView
/e2e      → Cypress specs and visual catalog
/scripts  → CI helpers (coverage comment, visual catalog HTML)
```

## Testing

```bash
# Unit + integration (with coverage)
npm --prefix server run test:coverage
npm --prefix client run test:coverage

# End-to-end (requires both servers running)
npm --prefix server run dev &
npm --prefix client run dev &
npm --prefix e2e run cy:run
```

Both `server` and `client` enforce **90% line / statement / function coverage** and **80% branches** via Vitest thresholds. CI fails the build if any drops below.

## CI

The GitHub Actions workflow on every push to a PR:

1. Runs server tests (unit + socket.io integration) with V8 coverage.
2. Runs client tests (component, hook, screen) with V8 coverage.
3. Boots the built server + client preview and runs Cypress end-to-end.
4. Builds a **visual evidence catalog** (`e2e/visual-catalog.html`) from the Cypress screenshots and uploads it as an artifact.
5. Posts a **sticky coverage comment** on the PR that updates on every push.
