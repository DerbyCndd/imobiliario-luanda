/* Equilíbrio dos estilos dos bots: taxa de vitórias por estilo em N jogos de 4 (um de cada estilo).
   uso: node sim-balance.js [jogos=300]  — ideal: cada estilo perto de 25%. */
const E = require('./public/engine.js');
const N = +process.argv[2] || 300;
function run(seed0) {
  let seed = seed0; E.rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const wins = {}, over = { n: 0 };
  for (let g = 0; g < N; g++) {
    const S = E.newGame('B', 'h'); S.settings.turnTime = 0; E.join(S, 'h', 'A', 0);
    E.act(S, 'h', { type: 'addBot', style: 'agressivo' }); E.act(S, 'h', { type: 'addBot', style: 'cauteloso' }); E.act(S, 'h', { type: 'addBot', style: 'negociador' });
    S.players[0].bot = true; S.players[0].style = 'equilibrado'; E.act(S, 'h', { type: 'start' });
    const mem = {}; let guard = 0;
    while (S.phase === 'play' && S.round < 250 && guard++ < 100000) {
      let acted = false;
      for (const p of S.players.slice()) { if (p.bk || S.phase !== 'play') continue; const a = E.Bots.step(E, S, p, mem[p.id] = mem[p.id] || {}); if (a) { acted = true; E.act(S, p.id, a); } }
      if (!acted || S.auction || S.case) E.tick(S);
    }
    if (S.phase === 'over') { over.n++; const w = S.players.find((p) => p.id === S.winner); wins[w.style] = (wins[w.style] || 0) + 1; }
  }
  return { wins, over: over.n };
}
const fmt = (r) => ['equilibrado', 'agressivo', 'cauteloso', 'negociador'].map((s) => s.slice(0, 4) + ' ' + Math.round(((r.wins[s] || 0) / Math.max(1, r.over)) * 100) + '%').join(' · ') + `  (${r.over}/${N} acabaram)`;
if (process.argv[3] === 'sweep') {
  const base = JSON.parse(JSON.stringify(E.Bots.STY));
  const tries = [{}, { res: 220 }, { res: 180, aggr: 0.95 }, { res: 200, aggr: 1.0, accept: 1.05, build: 250 }, { res: 180, aggr: 1.05, accept: 1.0, build: 220, trade: 2 }, { res: 150, aggr: 1.1, accept: 1.0, build: 180, trade: 2 }];
  for (const t of tries) { Object.assign(E.Bots.STY.cauteloso, base.cauteloso, t); console.log(JSON.stringify(t).padEnd(70), fmt(run(+process.env.SEED || 7))); }
} else console.log(fmt(run(+process.env.SEED || 7)));
