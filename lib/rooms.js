/* Salas de jogo no servidor: cada sala guarda o estado do motor e as ligações WebSocket. */
const E = require('../public/engine.js');

const rooms = new Map();
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ROOMS = 500;

function genCode() {
  for (let n = 0; n < 50; n++) {
    let c = '';
    for (let i = 0; i < 5; i++) c += CH[Math.floor(Math.random() * CH.length)];
    if (!rooms.has(c)) return c;
  }
  return null;
}
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const cleanPid = (p) => String(p || '').replace(/[^\w-]/g, '').slice(0, 32);
const cleanName = (n) => String(n || '').trim().slice(0, 16) || 'Jogador';

function broadcast(r) {
  const msg = JSON.stringify({ t: 's', s: r.S });
  for (const ws of r.conns.values()) if (ws.readyState === 1) ws.send(msg);
  r.touch = Date.now();
}
function voiceUpdate(r) {
  const msg = JSON.stringify({ t: 'voice', list: [...r.voice] });
  for (const ws of r.conns.values()) if (ws.readyState === 1) ws.send(msg);
}
function bind(ws, r, pid) {
  const old = r.conns.get(pid);
  if (old && old !== ws) { old.room = null; try { old.close(); } catch (e) {} }
  r.conns.set(pid, ws); ws.room = r; ws.pid = pid;
}
function handle(ws, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'create') {
    const pid = cleanPid(m.pid);
    if (!pid) return;
    if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'err', m: 'Servidor cheio. Tenta mais tarde.', fatal: true });
    const code = genCode();
    const S = E.newGame(code, pid);
    E.join(S, pid, cleanName(m.name), 0);
    const r = { S, conns: new Map(), voice: new Set(), touch: Date.now() };
    rooms.set(code, r);
    bind(ws, r, pid); broadcast(r);
  } else if (m.t === 'join') {
    const pid = cleanPid(m.pid), r = rooms.get(String(m.code || '').toUpperCase());
    if (!pid) return;
    if (!r) return send(ws, { t: 'err', m: 'Sala não encontrada. Confirma o código.', fatal: true });
    const err = E.join(r.S, pid, cleanName(m.name), m.token);
    if (err) return send(ws, { t: 'err', m: err, fatal: true });
    bind(ws, r, pid); broadcast(r); voiceUpdate(r);
  } else if (m.t === 'vjoin' || m.t === 'vleave') {
    const r = ws.room; if (!r) return;
    if (m.t === 'vjoin') r.voice.add(ws.pid); else r.voice.delete(ws.pid);
    voiceUpdate(r);
  } else if (m.t === 'vsig') {
    /* sinalização WebRTC entre dois participantes que estão na chamada */
    const r = ws.room; if (!r || !r.voice.has(ws.pid)) return;
    const to = r.conns.get(String(m.to || ''));
    if (to && r.voice.has(to.pid) && m.d && typeof m.d === 'object') send(to, { t: 'vsig', from: ws.pid, d: m.d });
  } else if (m.t === 'act') {
    const r = ws.room; if (!r) return;
    const err = E.act(r.S, ws.pid, m.a && typeof m.a === 'object' ? m.a : {});
    if (err) send(ws, { t: 'err', m: err });
    broadcast(r);
  }
}
function left(ws) {
  const r = ws.room;
  if (!r || r.conns.get(ws.pid) !== ws) return;
  r.conns.delete(ws.pid);
  if (r.voice.delete(ws.pid)) voiceUpdate(r);
  const sp = (r.S.specs || []).find((x) => x.id === ws.pid);
  if (sp) r.S.specs = r.S.specs.filter((x) => x !== sp);
  const p = E.byId(r.S, ws.pid);
  if (p) {
    p.connected = false;
    if (r.S.phase === 'lobby' && p.id !== r.S.hostPid) r.S.players = r.S.players.filter((x) => x.id !== p.id);
  }
  broadcast(r);
}
function attach(ws) {
  ws.on('message', (data) => {
    if (data.length > 20000) return;
    let m; try { m = JSON.parse(data.toString()); } catch (e) { return; }
    try { handle(ws, m); } catch (e) { console.error('erro ao tratar mensagem', e); send(ws, { t: 'err', m: 'Erro interno do servidor.' }); }
  });
  ws.on('close', () => left(ws));
  ws.on('error', () => {});
}

/* relógio dos leilões (1 s) e limpeza de salas abandonadas */
function tickAll() {
  for (const r of rooms.values()) {
    if (r.S.phase !== 'play') continue;
    const k = E.tick(r.S);
    if (k === 2) broadcast(r);
    else if (k === 1) {
      // só o relógio mudou: mensagem leve em vez do estado completo
      const msg = JSON.stringify({ t: 'clk', tl: r.S.tl, left: r.S.auction ? r.S.auction.left : 0, cl: r.S.case ? r.S.case.left : 0 });
      for (const ws of r.conns.values()) if (ws.readyState === 1) ws.send(msg);
    }
  }
}
function cleanup() {
  const now = Date.now();
  for (const [code, r] of rooms) {
    const idle = now - r.touch, empty = r.conns.size === 0;
    if (empty && (idle > 3 * 3600e3 || (r.S.phase === 'over' && idle > 30 * 60e3))) rooms.delete(code);
  }
}
function startTimers() { setInterval(tickAll, 1000).unref(); setInterval(cleanup, 60e3).unref(); }

module.exports = { attach, startTimers, rooms, handle, tickAll };
