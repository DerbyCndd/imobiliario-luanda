/* Teste de ponta a ponta: servidor real + WebSocket. Um humano cria a sala, adiciona bots e vê-os jogar sozinhos.
   uso: node test-e2e-bots.js [porta=3111] [segundos=25]   (o servidor tem de estar a correr: npm start) */
const WebSocket = require('ws');
const port = process.argv[2] || 3111, secs = +process.argv[3] || 25;
const ws = new WebSocket('ws://localhost:' + port + '/ws');
let S = null, errs = [];
const send = (o) => ws.send(JSON.stringify(o));
const act = (a) => send({ t: 'act', a });
ws.on('open', () => send({ t: 'create', pid: 'humano1', name: 'Derby' }));
ws.on('message', (d) => {
  const m = JSON.parse(d); if (m.t === 's') S = m.s; if (m.t === 'err') errs.push(m.m);
  if (m.t === 's' && S.phase === 'lobby' && S.players.length === 1) { act({ type: 'addBot' }); act({ type: 'addBot', style: 'negociador' }); act({ type: 'addBot', style: 'agressivo' }); }
  if (m.t === 's' && S.phase === 'lobby' && S.players.length === 4) { act({ type: 'settings', cash: 1500, go: 500, turnTime: 30, judgeMode: 'guard' }); act({ type: 'start' }); }
  /* o humano joga o mínimo: lança, compra se puder, termina */
  if (m.t === 's' && S.phase === 'play') {
    const me = S.players[S.cur];
    if (me.id === 'humano1') { const ph = S.turn.phase; if (ph === 'roll') act({ type: 'roll' }); else if (ph === 'buy') act({ type: 'decline' }); else if (ph === 'end') act({ type: 'endTurn' }); else if (ph === 'debt') act({ type: 'bankrupt' }); }
    if (S.auction && !S.auction.pass.includes('humano1') && S.auction.bidder !== 'humano1') act({ type: 'pass' });
  }
});
setTimeout(() => {
  const bots = S.players.filter((p) => p.bot);
  const acted = S.log.filter((l) => typeof l === 'string').length;
  console.log('fase:', S.phase, '· ronda', S.round, '· jogadores:', S.players.map((p) => p.name + ' ' + p.cash + 'Kz').join(' | '));
  console.log('bots:', bots.length, '· entradas no registo:', acted, '· erros:', errs.slice(0, 3).join(' / ') || 'nenhum');
  console.log(S.log.filter((l) => typeof l === 'string').slice(-6).join('\n'));
  const ok = S.phase === 'play' && S.round >= 2 && bots.length === 3;
  console.log(ok ? 'OK - os bots jogaram sozinhos em tempo real' : 'FALHOU');
  process.exit(ok ? 0 : 1);
}, secs * 1000);
