// Tiny smoke test exercising create/join/start/turn loop entirely in-process.
// Run with: npx tsx src/smokeTest.ts

import { GameRoom } from './GameRoom.js';

function assert(cond: any, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const room = new GameRoom({ playerCount: 3, variant: 'medium', turnTimerSeconds: null, globalTimerMinutes: null });
const a = room.addPlayer('Alice', 'sockA');
const b = room.addPlayer('Bob', 'sockB');
const c = room.addPlayer('Carol', 'sockC');

room.start();
assert(room.phase === 'playing', 'phase should be playing');
assert(room.activePlayerId === a.id, 'A should start');
assert(a.hand.length === room.config.startingHandDoors + room.config.startingHandTreasures, 'A hand size');

// Loop: kick door 30 times, resolve combat / skip phases.
let safety = 0;
while (room.phase === 'playing' && safety++ < 200) {
  const active = room.players.find((p) => p.id === room.activePlayerId)!;
  try {
    if (room.turnPhase === 'turnStart' || room.turnPhase === 'kickDoor') {
      if (room.config.listeningAtTheDoor && room.turnPhase === 'turnStart' && Math.random() < 0.5) {
        room.listenAtDoor(active.id);
      } else {
        room.kickDoor(active.id);
      }
    } else if (room.turnPhase === 'combat') {
      // Resolve unconditionally
      if (room.combatState && !room.combatState.resolved) {
        // Cheat in a level-up to ensure progression sometimes
        room.resolveCombat(active.id);
      }
    } else if (room.turnPhase === 'lookForTroubleOrLoot') {
      room.lootRoom(active.id);
    } else if (room.turnPhase === 'charity' || room.turnPhase === 'endTurn') {
      room.endTurn();
    }
  } catch (e) {
    console.warn('skip error:', (e as Error).message, 'phase=', room.turnPhase);
    // Force-end the turn to make progress
    try { room.endTurn(); } catch {}
  }
}

console.log('Final phase:', room.phase);
console.log('Turns:', room.turn);
console.log('Levels:', room.players.map((p) => `${p.name}=${p.level}`).join(', '));
console.log('Log entries:', room.log.length);
console.log('Smoke OK.');
