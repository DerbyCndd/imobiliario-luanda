/* TURN: sem configuração só há STUN (modo 'none'); com Cloudflare o servidor pede credenciais temporárias e envia-as ao cliente. */
process.env.CF_TURN_KEY_ID = 'chave123'; process.env.CF_TURN_API_TOKEN = 'token456';
let called = null;
global.fetch = async (url, o) => { called = { url, o }; return { status: 200, json: async () => ({ iceServers: { urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' } }) }; };
const R = require('./lib/rooms.js');
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exit(1); } console.log('ok -', m); };
const h = {}, ws = { readyState: 1, out: [], send(x) { ws.out.push(JSON.parse(x)); }, on(e, f) { h[e] = f; }, close() {} };
R.attach(ws); h.message(Buffer.from(JSON.stringify({ t: 'create', pid: 'p1', name: 'Ana' })));
setTimeout(() => {
  const ice = ws.out.find((m) => m.t === 'ice');
  ok(ice && ice.mode === 'cloudflare', 'modo cloudflare enviado ao cliente');
  ok(called && called.url.includes('/turn/keys/chave123/credentials/generate') && called.o.headers.Authorization === 'Bearer token456', 'pede credenciais à API da Cloudflare');
  ok(ice.servers.some((s) => [].concat(s.urls).some((u) => u.startsWith('turn:')) && s.username === 'u' && s.credential === 'c'), 'cliente recebe TURN com utilizador e credencial');
  ok(ice.servers.some((s) => String(s.urls).includes('stun:stun.l.google.com')), 'mantém o STUN');
  process.exit(0);
}, 300);
