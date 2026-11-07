/* Diagnóstico: quantas propostas os bots fazem e porque são recusadas. uso: node sim-trades.js [jogos=40] */
const E = require('./public/engine.js');
let seed = 5; E.rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const N = +process.argv[2] || 40; const st = { prop: 0, yes: 0, no: 0, cancel: 0, byType: {}, why: {} };
for (let g = 0; g < N; g++) {
  const S = E.newGame('T', 'h'); S.settings.turnTime = 0; E.join(S, 'h', 'A', 0);
  for (let i = 1; i < 4; i++) E.act(S, 'h', { type: 'addBot', style: E.BOT_STYLES[i % 4] });
  S.players[0].bot = true; E.act(S, 'h', { type: 'start' });
  const mem = {}; let guard = 0;
  while (S.phase === 'play' && S.round < 250 && guard++ < 100000) {
    let acted = false;
    for (const p of S.players.slice()) {
      if (p.bk || S.phase !== 'play') continue;
      const m = mem[p.id] = mem[p.id] || {}; const a = E.Bots.step(E, S, p, m); if (!a) continue; acted = true;
      if (a.type === 'trade') st.prop++;
      if (a.type === 'tradeNo') { const t = S.trades.find((x) => x.id === a.id); if (t) { if (t.to === p.id) { st.no++; const r = E.Bots.evalIncoming(E, S, p, (E.Bots.STY[p.style] || E.Bots.STY.equilibrado), t); const k = r.why.replace(/\d+/g, 'N'); st.why[k] = (st.why[k] || 0) + 1; } else st.cancel++; } }
      if (!E.act(S, p.id, a) && a.type === 'tradeYes') st.yes++;
    }
    if (!acted || S.auction || S.case) E.tick(S);
  }
}
console.log(`por jogo: propostas ${(st.prop / N).toFixed(1)} · aceites ${(st.yes / N).toFixed(1)} · recusadas ${(st.no / N).toFixed(1)} · expiradas ${(st.cancel / N).toFixed(1)}`);
console.log('motivos de recusa:', JSON.stringify(st.why, null, 1));
