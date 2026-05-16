// Live socket.io smoke test against the running server.
// Run: node src/socketSmoke.mjs   (server must be on PORT 3001)

import { io } from 'socket.io-client';

const URL = process.env.SERVER_URL ?? 'http://localhost:3001';

function rpc(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error ?? 'no callback'));
    });
  });
}

function attach(socket) {
  const state = { latest: null, hands: [] };
  socket.on('game:stateUpdate', (g) => { state.latest = g; });
  socket.on('game:yourHand', (h) => { state.hands.push(h); });
  socket.on('error', (msg) => console.warn('socket error:', msg));
  return state;
}

async function tick() { return new Promise((r) => setTimeout(r, 80)); }

async function main() {
  const a = io(URL, { transports: ['websocket'] });
  const b = io(URL, { transports: ['websocket'] });
  await new Promise((r) => a.on('connect', r));
  await new Promise((r) => b.on('connect', r));

  const stA = attach(a);
  const stB = attach(b);

  const create = await rpc(a, 'room:create', { name: 'Alice', config: { playerCount: 2, variant: 'medium', turnTimerSeconds: null, globalTimerMinutes: null } });
  console.log('Created:', create.roomCode);

  await rpc(b, 'room:join', { roomCode: create.roomCode, name: 'Bob' });
  await tick();
  console.log('Lobby players:', stA.latest?.players.map(p => p.name));

  await rpc(a, 'room:start');
  await tick();
  console.log('Phase:', stA.latest?.phase, '| active:', stA.latest?.players.find(p => p.id === stA.latest?.activePlayerId)?.name);
  console.log('A hand size:', stA.hands.at(-1)?.hand.length, '| B hand size:', stB.hands.at(-1)?.hand.length);
  console.log('Door deck size:', stA.latest?.doorDeckSize, '| Treasure deck size:', stA.latest?.treasureDeckSize);

  // Alice kicks the door
  await rpc(a, 'game:kickDoor');
  await tick();
  console.log('After kick — phase:', stA.latest?.turnPhase, '| combat:', !!stA.latest?.combatState);
  if (stA.latest?.combatState) {
    console.log('Monster:', stA.latest.combatState.monsters[0].name, 'lv', stA.latest.combatState.monsters[0].level);
  }

  a.disconnect();
  b.disconnect();
  console.log('Socket smoke OK.');
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
