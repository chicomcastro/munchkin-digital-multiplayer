import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameRoom } from './GameRoom.js';
import type { RoomConfig } from './types.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? '*';

const app = express();
app.use(cors({ origin: CLIENT_URL === '*' ? true : CLIENT_URL }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL === '*' ? true : CLIENT_URL },
});

const rooms = new Map<string, GameRoom>();

function broadcastRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  const snapshot = room.snapshot();
  io.to(code).emit('game:stateUpdate', snapshot);
  // Send each player their private hand
  for (const p of room.players) {
    if (p.socketId) {
      io.to(p.socketId).emit('game:yourHand', {
        hand: room.privateHandFor(p.id),
        fist: room.fistFor(p.id),
      });
    }
  }
}

function attachRoomBroadcast(room: GameRoom) {
  room.subscribe(() => broadcastRoom(room.code));
}

io.on('connection', (socket) => {
  // Each socket binds to one roomCode + playerId once joined
  let bound: { roomCode: string; playerId: string } | null = null;

  socket.on('room:create', (payload: { name: string; config?: Partial<RoomConfig> }, cb?: (r: any) => void) => {
    try {
      const room = new GameRoom(payload.config ?? {});
      rooms.set(room.code, room);
      attachRoomBroadcast(room);
      const player = room.addPlayer(payload.name, socket.id);
      socket.join(room.code);
      bound = { roomCode: room.code, playerId: player.id };
      cb?.({ ok: true, roomCode: room.code, playerId: player.id });
      broadcastRoom(room.code);
    } catch (e) {
      cb?.({ ok: false, error: (e as Error).message });
    }
  });

  socket.on('room:join', (payload: { roomCode: string; name: string; playerId?: string }, cb?: (r: any) => void) => {
    try {
      const code = payload.roomCode.toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) throw new Error('Room not found.');
      let player;
      if (payload.playerId) {
        player = room.reconnect(payload.playerId, socket.id);
      }
      if (!player) {
        player = room.addPlayer(payload.name, socket.id);
      }
      socket.join(code);
      bound = { roomCode: code, playerId: player.id };
      cb?.({ ok: true, roomCode: code, playerId: player.id });
      broadcastRoom(code);
    } catch (e) {
      cb?.({ ok: false, error: (e as Error).message });
    }
  });

  socket.on('room:updateConfig', (patch: Partial<RoomConfig>, cb?: (r: any) => void) => {
    if (!bound) return cb?.({ ok: false, error: 'Not in a room.' });
    const room = rooms.get(bound.roomCode);
    if (!room) return cb?.({ ok: false, error: 'Room missing.' });
    if (!room.isCreator(bound.playerId)) return cb?.({ ok: false, error: 'Only the creator can change config.' });
    room.updateConfig(patch);
    cb?.({ ok: true });
  });

  socket.on('room:start', (_payload: unknown, cb?: (r: any) => void) => {
    if (!bound) return cb?.({ ok: false, error: 'Not in a room.' });
    const room = rooms.get(bound.roomCode);
    if (!room) return cb?.({ ok: false, error: 'Room missing.' });
    if (!room.isCreator(bound.playerId)) return cb?.({ ok: false, error: 'Only the creator can start.' });
    try {
      room.start();
      cb?.({ ok: true });
    } catch (e) {
      cb?.({ ok: false, error: (e as Error).message });
    }
  });

  function withRoom<T>(cb: ((r: any) => void) | undefined, fn: (room: GameRoom, playerId: string) => T): T | void {
    if (!bound) {
      cb?.({ ok: false, error: 'Not in a room.' });
      return;
    }
    const room = rooms.get(bound.roomCode);
    if (!room) {
      cb?.({ ok: false, error: 'Room missing.' });
      return;
    }
    try {
      const result = fn(room, bound.playerId);
      cb?.({ ok: true });
      return result;
    } catch (e) {
      cb?.({ ok: false, error: (e as Error).message });
      socket.emit('error', (e as Error).message);
    }
  }

  socket.on('game:kickDoor', (_p, cb) => withRoom(cb, (r, pid) => r.kickDoor(pid)));
  socket.on('game:listenDoor', (_p, cb) => withRoom(cb, (r, pid) => r.listenAtDoor(pid)));
  socket.on('game:playCard', (p: { cardId: string; targetId?: string }, cb) =>
    withRoom(cb, (r, pid) => r.playCard(pid, p.cardId, p.targetId))
  );
  socket.on('game:helpInCombat', (_p, cb) => withRoom(cb, (r, pid) => r.helpInCombat(pid)));
  socket.on('game:flee', (_p, cb) => withRoom(cb, (r, pid) => r.flee(pid)));
  socket.on('game:resolveCombat', (_p, cb) => withRoom(cb, (r, pid) => r.resolveCombat(pid)));
  socket.on('game:lootRoom', (_p, cb) => withRoom(cb, (r, pid) => r.lootRoom(pid)));
  socket.on('game:sellItems', (p: { cardIds: string[] }, cb) => withRoom(cb, (r, pid) => r.sellItems(pid, p.cardIds)));
  socket.on('game:endTurn', (_p, cb) => withRoom(cb, (r, pid) => r.endTurn()));
  socket.on('market:trade', (p: { handCardId: string; marketCardId: string }, cb) =>
    withRoom(cb, (r, pid) => r.marketTrade(pid, p.handCardId, p.marketCardId))
  );
  socket.on('fist:playCard', (p: { cardId: string; targetCombat: boolean }, cb) =>
    withRoom(cb, (r, pid) => r.playFist(pid, p.cardId, p.targetCombat))
  );

  socket.on('disconnect', () => {
    if (!bound) return;
    const room = rooms.get(bound.roomCode);
    room?.disconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Munchkin server listening on :${PORT}`);
});
