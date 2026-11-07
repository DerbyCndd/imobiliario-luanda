/* Treino/avaliação do Juiz Digital.
   Cada caso de judge/cases.json é um processo rotulado (veredicto aceitável + reacção esperada do Juiz à proposta).
   uso:  node judge/train.js            → avalia os parâmetros actuais e lista os erros
         node judge/train.js --tune     → procura parâmetros melhores (descida por coordenadas) e mostra a diferença
         node judge/train.js --tune --write → grava os melhores parâmetros em public/judge.js
   Nota: é afinação de limiares sobre casos rotulados à mão (não é aprendizagem automática); por isso
   acrescenta casos novos sempre que um julgamento real te parecer errado e volta a correr. */
const fs = require('fs');
const path = require('path');
const E = require('../public/engine.js');
const J = E.Judge;
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));

function build(c) {
  const S = E.newGame('T', 'p0'); for (let i = 0; i < 4; i++) E.join(S, 'p' + i, 'J' + i, i);
  S.settings.judgeMode = 'off'; E.act(S, 'p0', { type: 'start' });
  S.players.forEach((p) => { p.cash = 1500; });
  const P = (id) => E.byId(S, id), su = c.setup || {};
  Object.entries(su.cash || {}).forEach(([id, v]) => { P(id).cash = v; });
  Object.entries(su.owners || {}).forEach(([i, id]) => { S.props[i].owner = id; });
  Object.entries(su.jc || {}).forEach(([id, n]) => { for (let k = 0; k < n; k++) P(id).jc.push({ d: 'chance', id: 7 }); });
  (su.mort || []).forEach((i) => { S.props[i].mort = true; });
  Object.entries(su.rec || {}).forEach(([id, n]) => { J.rec(S, id).strikes = n; });
  Object.entries(su.frivolous || {}).forEach(([id, n]) => { J.rec(S, id).frivolous = n; });
  const side = (s, owner) => ({ cash: (s && s.cash) || 0, props: ((s && s.props) || []).slice(), jc: (s && s.jc) || 0, _o: owner });
  const give = side(c.deal.give, 'p0'), get = side(c.deal.get, 'p1');
  give.props.forEach((i) => { S.props[i].owner = 'p0'; }); get.props.forEach((i) => { S.props[i].owner = 'p1'; });
  Object.entries(su.debts || {}).forEach(([id, d]) => { S.debts.push({ pid: id, amt: d.amt, to: d.to, why: 'teste' }); });
  return { S, t: { id: 1, from: 'p0', to: 'p1', give: { cash: give.cash, props: give.props, jc: give.jc }, get: { cash: get.cash, props: get.props, jc: get.jc } } };
}
function run(c) {
  const { S, t } = build(c);
  const rv = J.reviewTrade(E, S, t);
  const guard = rv.level === 'veto' ? 'veto' : rv.level === 'warn' ? 'warn' : 'ok';
  const S2 = S; S2.trades.push(t);
  const e = E.act(S2, 'p1', { type: 'tradeYes', id: 1 }); if (e) return { err: e, guard };
  const d = S2.deals[S2.deals.length - 1], rep = c.reporter || 'p2';
  const e2 = E.act(S2, rep, { type: 'report', deal: d.id }); if (e2) return { err: e2, guard };
  for (let i = 0; i < 25 && S2.case; i++) E.tick(S2);
  return { verdict: S2.verdict && S2.verdict.verdict, guard, text: S2.verdict && S2.verdict.text };
}
function evaluate(verbose) {
  let pts = 0, max = 0; const bad = [];
  for (const c of cases) {
    const r = run(c); max += 2;
    const vOk = !r.err && c.expect.includes(r.verdict), gOk = r.guard === c.guard;
    pts += (vOk ? 1 : 0) + (gOk ? 1 : 0);
    if (!vOk || !gOk) bad.push(`${c.id}: ${r.err ? 'ERRO ' + r.err : 'veredicto ' + r.verdict + ' (aceita ' + c.expect.join('/') + ')'} · proposta ${r.guard} (esperado ${c.guard})`);
  }
  if (verbose) { console.log(`Pontuação: ${pts}/${max} (${Math.round((pts / max) * 100)}%) em ${cases.length} casos`); bad.forEach((b) => console.log('  ✗ ' + b)); }
  return { pts, max, bad };
}

const base = JSON.parse(JSON.stringify(J.P));
console.log('Parâmetros actuais:'); const first = evaluate(true);
if (process.argv.includes('--tune')) {
  const grid = { hard: [0.25, 0.3, 0.35, 0.4, 0.45], gift: [0.1, 0.15, 0.2, 0.25, 0.3], giftMin: [60, 80, 100, 120], shamMin: [30, 50, 70], sham: [0.25, 0.35, 0.45, 0.55], pred: [0.45, 0.6, 0.7, 0.8], predDeep: [0.15, 0.25, 0.35], distressCash: [60, 90, 120, 160], evade: [0.4, 0.5, 0.6], evadeMin: [60, 100, 150], vetoGift: [0.1, 0.15, 0.2], vetoGiftMin: [100, 150, 200], vetoPred: [0.2, 0.3, 0.4] };
  let best = first.pts;
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (const k of Object.keys(grid)) {
      const keep = J.P[k]; let bv = keep;
      for (const v of grid[k]) { J.P[k] = v; const s = evaluate(false).pts; if (s > best) { best = s; bv = v; improved = true; } }
      J.P[k] = bv;
    }
    if (!improved) break;
  }
  console.log('\nDepois da afinação:'); const after = evaluate(true);
  const diff = Object.keys(J.P).filter((k) => J.P[k] !== base[k]);
  console.log(diff.length ? 'Parâmetros alterados: ' + diff.map((k) => `${k} ${base[k]} → ${J.P[k]}`).join(', ') : 'Nenhuma alteração melhora o resultado.');
  if (process.argv.includes('--write') && diff.length) {
    const f = path.join(__dirname, '..', 'public', 'judge.js'); let s = fs.readFileSync(f, 'utf8');
    const body = '  J.P = ' + JSON.stringify(J.P, null, 4).replace(/\n/g, '\n  ') + ';';
    s = s.replace(/  \/\* PARAMS \*\/[\s\S]*?  \/\* END \*\//, '  /* PARAMS */\n' + body + '\n  /* END */');
    fs.writeFileSync(f, s); console.log('Gravado em public/judge.js');
  }
  process.exit(after.pts === after.max ? 0 : 0);
}
process.exit(first.pts === first.max ? 0 : 1);
