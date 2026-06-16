import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameRoom } from './GameRoom.js';
import type { RoomConfig } from './types.js';
import { makeRepository } from './persistence/firestore.js';
import type { RoomRepository } from './persistence/repository.js';
import { BotDriver, type BotDriverOptions } from './bots/driver.js';
import type { BotDifficulty } from './bots/policy.js';

export interface ServerHandle {
  app: express.Express;
  http: http.Server;
  io: Server;
  rooms: Map<string, GameRoom>;
  repository: RoomRepository | null;
  botDrivers: Map<string, BotDriver>;
  close: () => Promise<void>;
}

export interface CreateServerOptions {
  clientUrl?: string;
  repository?: RoomRepository | null;
  botDriverOptions?: BotDriverOptions;
}

export function createServer(opts: CreateServerOptions = {}): ServerHandle {
  const clientUrl = opts.clientUrl ?? '*';
  const app = express();
  app.use(cors({ origin: clientUrl === '*' ? true : clientUrl }));
  app.use(express.json());

  const rooms = new Map<string, GameRoom>();
  const repository: RoomRepository | null = opts.repository ?? makeRepository();
  const botDrivers = new Map<string, BotDriver>();

  app.get('/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: clientUrl === '*' ? true : clientUrl },
  });

  // Debounce repository saves: each broadcast may be triggered by quick
  // sequences of mutations; we only want to persist once per ~500ms.
  const saveTimers = new Map<string, NodeJS.Timeout>();
  function schedulePersist(room: GameRoom) {
    if (!repository) return;
    const existing = saveTimers.get(room.code);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      saveTimers.delete(room.code);
      // Fire-and-forget; errors are logged inside the repository impls.
      void repository.save(room);
    }, 500);
    t.unref?.();
    saveTimers.set(room.code, t);
  }

  function broadcastRoom(code: string) {
    const room = rooms.get(code);
    if (!room) return;
    const snapshot = room.snapshot();
    io.to(code).emit('game:stateUpdate', snapshot);
    for (const p of room.players) {
      if (p.socketId) {
        io.to(p.socketId).emit('game:yourHand', {
          hand: room.privateHandFor(p.id),
          fist: room.fistFor(p.id),
        });
      }
    }
    schedulePersist(room);
  }

  /** Look up a room — if not in memory, try restoring from the repository. */
  async function findOrLoadRoom(code: string): Promise<GameRoom | null> {
    const existing = rooms.get(code);
    if (existing) return existing;
    if (!repository) return null;
    const snap = await repository.load(code);
    if (!snap) return null;
    const revived = new GameRoom(snap.config as any);
    Object.assign(revived, { code: snap.code });
    revived.hydrate(snap as any);
    rooms.set(code, revived);
    attachRoomBroadcast(revived);
    return revived;
  }

  function attachRoomBroadcast(room: GameRoom) {
    room.subscribe(() => broadcastRoom(room.code));
    if (!botDrivers.has(room.code)) {
      botDrivers.set(room.code, new BotDriver(room, opts.botDriverOptions));
    }
  }

  io.on('connection', (socket) => {
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

    socket.on('room:join', async (payload: { roomCode: string; name: string; playerId?: string }, cb?: (r: any) => void) => {
      try {
        const code = payload.roomCode.toUpperCase().trim();
        const room = await findOrLoadRoom(code);
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

    socket.on('room:addBot', (payload: { difficulty?: BotDifficulty; name?: string }, cb?: (r: any) => void) => {
      if (!bound) return cb?.({ ok: false, error: 'Not in a room.' });
      const room = rooms.get(bound.roomCode);
      if (!room) return cb?.({ ok: false, error: 'Room missing.' });
      if (!room.isCreator(bound.playerId)) return cb?.({ ok: false, error: 'Only the creator can add bots.' });
      try {
        const difficulty: BotDifficulty = payload?.difficulty ?? 'easy';
        const bot = room.addBot(difficulty, payload?.name);
        cb?.({ ok: true, botId: bot.id });
      } catch (e) {
        cb?.({ ok: false, error: (e as Error).message });
      }
    });

    socket.on('room:removeBot', (payload: { botId: string }, cb?: (r: any) => void) => {
      if (!bound) return cb?.({ ok: false, error: 'Not in a room.' });
      const room = rooms.get(bound.roomCode);
      if (!room) return cb?.({ ok: false, error: 'Room missing.' });
      if (!room.isCreator(bound.playerId)) return cb?.({ ok: false, error: 'Only the creator can remove bots.' });
      try {
        room.removeBot(payload.botId);
        cb?.({ ok: true });
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
    socket.on('room:toggleReady', (p: { ready: boolean }, cb) =>
      withRoom(cb, (r, pid) => r.setReady(pid, p.ready))
    );
    socket.on('game:stealItem', (p: { targetId: string }, cb) =>
      withRoom(cb, (r, pid) => r.stealItem(pid, p.targetId))
    );
    socket.on('game:clericVsUndead', (p: { cardIds: string[] }, cb) =>
      withRoom(cb, (r, pid) => r.clericVsUndead(pid, p.cardIds))
    );
    socket.on('game:wizardCharm', (p: { cardIds: string[] }, cb) =>
      withRoom(cb, (r, pid) => r.wizardCharm(pid, p.cardIds))
    );
    socket.on('fist:deposit', (p: { cardId: string }, cb) =>
      withRoom(cb, (r, pid) => r.depositFist(pid, p.cardId))
    );
    socket.on('game:swapCharacter', (p: { alternateIdx: number }, cb) =>
      withRoom(cb, (r, pid) => r.swapCharacter(pid, p.alternateIdx))
    );

    socket.on('disconnect', () => {
      if (!bound) return;
      const room = rooms.get(bound.roomCode);
      room?.disconnect(socket.id);
    });
  });

  return {
    app,
    http: httpServer,
    io,
    rooms,
    repository,
    botDrivers,
    close: async () => {
      for (const d of botDrivers.values()) d.dispose();
      botDrivers.clear();
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
