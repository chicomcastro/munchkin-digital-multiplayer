const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

// e2e/ is the project root (working-directory in CI).
const ROOT = __dirname;

// Ghost players: server-side socket.io clients used to simulate other phones.
const ghosts = new Map();

function rpc(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res) => {
      if (res && res.ok) resolve(res);
      else reject(new Error((res && res.error) || 'no callback'));
    });
  });
}

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    video: false,
    viewportWidth: 414,
    viewportHeight: 896,
    setupNodeEvents(on, _config) {
      on('task', {
        async 'ghost:join'(payload) {
          const s = io(payload.serverUrl, { transports: ['websocket'], forceNew: true });
          await new Promise((res, rej) => {
            s.once('connect', () => res());
            s.once('connect_error', rej);
          });
          const join = await rpc(s, 'room:join', { roomCode: payload.roomCode, name: payload.name });
          ghosts.set(payload.name, s);
          return join;
        },
        'ghost:disconnect'(name) {
          const s = ghosts.get(name);
          if (s) { s.disconnect(); ghosts.delete(name); }
          return null;
        },
        'ghost:disconnectAll'() {
          for (const s of ghosts.values()) s.disconnect();
          ghosts.clear();
          return null;
        },
      });

      on('after:run', () => {
        const dir = path.join(ROOT, 'cypress', 'screenshots');
        const out = [];
        function walk(p) {
          if (!fs.existsSync(p)) return;
          for (const entry of fs.readdirSync(p)) {
            const full = path.join(p, entry);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) walk(full);
            else if (full.endsWith('.png')) {
              out.push({ path: path.relative(ROOT, full), size: stat.size });
            }
          }
        }
        walk(dir);
        out.sort((a, b) => a.path.localeCompare(b.path));
        fs.writeFileSync(
          path.join(ROOT, 'cypress', 'screenshots-manifest.json'),
          JSON.stringify(out, null, 2),
        );
      });
    },
  },
});
