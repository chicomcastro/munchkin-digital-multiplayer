import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoom } from '../GameRoom.js';
import { InMemoryRoomRepository } from './in-memory.js';
import { makeRepository } from './firestore.js';

describe('serialize + hydrate roundtrip', () => {
  it('preserves room state through a snapshot/restore cycle', () => {
    const a = new GameRoom({ playerCount: 2, variant: 'long' });
    a.addPlayer('Alice', 'sock-a');
    a.addPlayer('Bob', 'sock-b');
    a.start();
    a.turn = 5;
    a.threatTrack = 3;

    const snap = a.serialize();

    const b = new GameRoom();
    Object.assign(b, { code: snap.code });
    b.hydrate(snap as any);

    expect(b.turn).toBe(5);
    expect(b.threatTrack).toBe(3);
    expect(b.players.length).toBe(2);
    expect(b.config.variant).toBe('long');
  });
});

describe('InMemoryRoomRepository', () => {
  let repo: InMemoryRoomRepository;
  beforeEach(() => {
    repo = new InMemoryRoomRepository();
  });

  it('save + load returns the persisted snapshot', async () => {
    const r = new GameRoom();
    r.addPlayer('A', 'sa');
    r.addPlayer('B', 'sb');
    await repo.save(r);
    const loaded = await repo.load(r.code);
    expect(loaded?.code).toBe(r.code);
    expect(loaded?.players.length).toBe(2);
  });

  it('load missing returns null', async () => {
    expect(await repo.load('MNK-NOPE')).toBeNull();
  });

  it('delete removes the entry', async () => {
    const r = new GameRoom();
    r.addPlayer('A', 'sa');
    r.addPlayer('B', 'sb');
    await repo.save(r);
    await repo.delete(r.code);
    expect(await repo.load(r.code)).toBeNull();
  });

  it('available is always true', async () => {
    expect(await repo.available()).toBe(true);
  });
});

describe('makeRepository', () => {
  it('returns null when PERSISTENCE is not set', () => {
    const prev = process.env.PERSISTENCE;
    delete process.env.PERSISTENCE;
    expect(makeRepository()).toBeNull();
    if (prev) process.env.PERSISTENCE = prev;
  });

  it('returns a FirestoreRoomRepository when PERSISTENCE=firestore', () => {
    const prev = process.env.PERSISTENCE;
    process.env.PERSISTENCE = 'firestore';
    const r = makeRepository();
    expect(r).not.toBeNull();
    // Don't actually connect — but the .available() should return false
    // because we have no credentials in the test environment.
    if (prev) process.env.PERSISTENCE = prev;
    else delete process.env.PERSISTENCE;
  });
});
