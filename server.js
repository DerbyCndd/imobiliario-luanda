/* Servidor: Next.js (páginas) + WebSocket em /ws (salas de jogo). */
const { createServer } = require('http');
const next = require('next');
const { WebSocketServer } = require('ws');
const rooms = require('./lib/rooms');

const dev = process.argv.includes('--dev');
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true, maxPayload: 20000 });
  const upgradeNext = dev && app.getUpgradeHandler ? app.getUpgradeHandler() : null;

  server.on('upgrade', (req, socket, head) => {
    if (req.url && req.url.startsWith('/ws')) wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
    else if (upgradeNext) upgradeNext(req, socket, head); // hot reload em desenvolvimento
    else socket.destroy();
  });
  wss.on('connection', (ws) => { ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; }); rooms.attach(ws); });

  // mantém as ligações vivas (proxies fecham ligações inactivas) e remove as mortas
  setInterval(() => {
    wss.clients.forEach((ws) => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); });
  }, 25000).unref();
  rooms.startTimers();

  server.listen(port, () => console.log(`> Imobiliário Luanda em http://localhost:${port} (${dev ? 'dev' : 'produção'})`));
});
