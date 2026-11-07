/* Simulação de partidas só com bots: valida que os bots jogam até ao fim e mede o equilíbrio do jogo.
   uso: node sim-bots.js [jogos=40] [jogadores=4] [rondaMax=300] */
const E = require('./public/engine.js');
const games = +process.argv[2] || 40, nPl = +process.argv[3] || 4, maxRounds = +process.argv[4] || 300;
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

function play(g) {
  E.rand = rnd;
  const S = E.newGame('SIM' + g, 'host');
  S.settings.turnTime = 0;
  E.join(S, 'host', 'Anfitrião', 0);
  for (let i = 1; i < nPl; i++) { const err = E.act(S, 'host', { type: 'addBot', style: E.BOT_STYLES[i % 4] }); if (err) throw new Error(err); }
  S.players[0].bot = true; S.players[0].style = 'equilibrado';
  E.act(S, 'host', { type: 'start' });
  const mem = {}, st = { trades: 0, loans: 0, reports: 0, vetos: 0, build: 0, errs: {}, steps: 0 };
  let guard = 0;
  while (S.phase === 'play' && S.round <= maxRounds && guard++ < 200000) {
    let acted = false;
    for (const p of S.players.slice()) {
      if (p.bk || S.phase !== 'play') continue;
      const a = E.Bots.step(E, S, p, mem[p.id] = mem[p.id] || {});
      if (!a) continue;
      const err = E.act(S, p.id, a); acted = true; st.steps++;
      if (err) { const k = a.type + ': ' + err.slice(0, 50); st.errs[k] = (st.errs[k] || 0) + 1; if (err.includes('vetou')) st.vetos++; }
      else { if (a.type === 'tradeYes') st.trades++; if (a.type === 'loanBank' || a.type === 'loanYes') st.loans++; if (a.type === 'report') st.reports++; if (a.type === 'build') st.build++; }
    }
    if (!acted || S.auction || S.case) E.tick(S);
  }
  return { S, st, guard };
}

let over = 0, rounds = [], tot = { trades: 0, loans: 0, reports: 0, vetos: 0, build: 0 }, errs = {}, stuck = 0, wins = {};
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const { S, st, guard } = play(g);
  if (S.phase === 'over') { over++; const w = S.players.find((p) => p.id === S.winner); wins[w.style] = (wins[w.style] || 0) + 1; }
  else if (guard >= 200000) stuck++;
  rounds.push(S.round);
  for (const k of Object.keys(tot)) tot[k] += st[k];
  for (const k of Object.keys(st.errs)) errs[k] = (errs[k] || 0) + st.errs[k];
}
rounds.sort((a, b) => a - b);
console.log(`${games} jogos de ${nPl} bots em ${Date.now() - t0} ms`);
console.log(`terminaram com vencedor: ${over}/${games} · presos (bug): ${stuck} · rondas (mediana ${rounds[rounds.length >> 1]}, máx ${rounds[rounds.length - 1]})`);
console.log('vitórias por estilo:', JSON.stringify(wins));
console.log('por jogo: trocas ' + (tot.trades / games).toFixed(1) + ', empréstimos ' + (tot.loans / games).toFixed(1) + ', denúncias ' + (tot.reports / games).toFixed(1) + ', construções ' + (tot.build / games).toFixed(1) + ', vetos ' + (tot.vetos / games).toFixed(1));
console.log('erros de acções dos bots:', JSON.stringify(errs, null, 1));
process.exit(stuck ? 1 : 0);
