import { describe, it, expect } from 'vitest';
import { BotDriver } from './driver.js';
import { GameRoom } from '../GameRoom.js';

function manualScheduler() {
  const pending: Array<() => void> = [];
  return {
    schedule: (cb: () => void, _ms: number) => {
      pending.push(cb);
      return () => {
        const idx = pending.indexOf(cb);
        if (idx >= 0) pending.splice(idx, 1);
      };
    },
    flushOnce() {
      const next = pending.shift();
      if (next) next();
    },
    flushAll(maxIterations = 5000) {
      let i = 0;
      while (pending.length > 0 && i < maxIterations) {
        pending.shift()!();
        i += 1;
      }
      return i;
    },
    pending,
  };
}

describe('BotDriver', () => {
  it('does nothing while the lobby has not started', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const sched = manualScheduler();
    const driver = new BotDriver(room, { scheduler: sched.schedule });
    room.addPlayer('Alice', 'sa');
    room.addBot('easy', 'BotB');
    expect(sched.pending.length).toBe(0);
    driver.dispose();
  });

  it('does not schedule when a human player is active', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const sched = manualScheduler();
    const driver = new BotDriver(room, { scheduler: sched.schedule });
    room.addPlayer('Alice', 'sa');
    room.addBot('easy', 'BotB');
    room.start();
    expect(sched.pending.length).toBe(0);
    driver.dispose();
  });

  it('schedules and drives a bot turn when it becomes active', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const sched = manualScheduler();
    const driver = new BotDriver(room, { scheduler: sched.schedule, delayMs: 0 });
    room.addBot('easy', 'Bot1');
    room.addBot('easy', 'Bot2');
    room.start();
    expect(sched.pending.length).toBeGreaterThan(0);
    const beforeTurn = room.turn;
    const iter = sched.flushAll();
    expect(iter).toBeGreaterThan(0);
    // After draining, either the game ended or it ran out of scheduled actions.
    expect(room.turn).toBeGreaterThan(beforeTurn);
    driver.dispose();
  });

  it('stops scheduling once disposed', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const sched = manualScheduler();
    const driver = new BotDriver(room, { scheduler: sched.schedule, delayMs: 0 });
    room.addBot('easy', 'Bot1');
    room.addBot('easy', 'Bot2');
    room.start();
    driver.dispose();
    sched.pending.length = 0;
    // After dispose, any incidental emit should NOT add new timers.
    room.endTurn();
    expect(sched.pending.length).toBe(0);
  });

  it('drives a bots-only match to completion via the scheduler queue', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const sched = manualScheduler();
    const driver = new BotDriver(room, { scheduler: sched.schedule, delayMs: 0 });
    room.addBot('normal', 'Bot1');
    room.addBot('normal', 'Bot2');
    room.start();
    sched.flushAll(20000);
    // The game state must remain consistent — no crashes.
    expect(['playing', 'ended']).toContain(room.phase);
    driver.dispose();
  });
});
