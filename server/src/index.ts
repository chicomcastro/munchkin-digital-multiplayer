import { createServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? '*';

const handle = createServer({ clientUrl: CLIENT_URL });

handle.http.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Munchkin server listening on :${PORT}`);
});
