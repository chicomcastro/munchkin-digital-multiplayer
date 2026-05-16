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
```
