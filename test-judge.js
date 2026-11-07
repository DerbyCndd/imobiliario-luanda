const E = require('./public/engine.js');
let ok = true; const t = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU - ') + m); if (!c) ok = false; };
function game(n, opts) {
  const S = E.newGame('J', 'p0'); for (let i = 0; i < n; i++) E.join(S, 'p' + i, 'J' + i, i);
  Object.assign(S.settings, opts || {}); E.act(S, 'p0', { type: 'start' }); S.players.forEach((p) => { p.cash = 1500; }); return S;
}
const cash = (S, id) => S.players.find((p) => p.id === id).cash;
/* faz a troca: p0 dá `gp` (propriedades) + gc Kz e p1 dá `rp` + rc Kz; devolve o negócio registado */
function deal(S, gp, gc, rp, rc) {
  gp.forEach((i) => { S.props[i].owner = 'p0'; }); rp.forEach((i) => { S.props[i].owner = 'p1'; });
  S.trades.push({ id: 900 + S.did, from: 'p0', to: 'p1', give: { cash: gc, props: gp, jc: 0 }, get: { cash: rc, props: rp, jc: 0 } });
  const e = E.act(S, 'p1', { type: 'tradeYes', id: 900 + S.did });
  return { e, d: S.deals[S.deals.length - 1] };
}
const hear = (S) => { for (let i = 0; i < 25 && S.case; i++) E.tick(S); };

// 1. troca justa denunciada por terceiro → denúncia inválida, denunciante indemniza
let S = game(4, { judgeMode: 'warn' }); let { d } = deal(S, [6], 0, [8], 0);
t(d && d.an && d.an.fair >= 0.9, 'o Juiz analisa cada troca executada (equilíbrio ' + (d && d.an.fair) + ')');
t(!E.act(S, 'p2', { type: 'report', deal: d.id, reason: 'não gosto' }) && S.case && S.case.phase === 'hearing', 'denúncia abre audiência (o Juiz não é jogador: ' + !S.players.some((p) => /juiz/i.test(p.name)) + ')');
hear(S);
t(!S.case && S.verdict.verdict === 'void' && cash(S, 'p2') < 1500 && cash(S, 'p0') > 1500, 'troca justa: denúncia inválida e denunciante indemniza ("' + S.verdict.text.slice(0, 60) + '…")');
t(!!E.act(S, 'p2', { type: 'report', deal: d.id }), 'o mesmo negócio não volta a ser denunciado');
// 2. denúncia só com 2 jogadores (já não precisa de jurados)
S = game(2, { judgeMode: 'warn' }); ({ d } = deal(S, [6], 0, [8], 0));
t(!E.act(S, 'p0', { type: 'report', deal: d.id }), '2 jogadores: pode ir a julgamento');
// 3. doação simulada sem monopólio → multa a ambos
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [6, 8], 0, [], 5)); // p0 dá Rangel+Viana (200 Kz) por 5 Kz... p1 recebe 2 de 3 lblue
t(d.an.flags.includes('GIFT'), 'flag GIFT (doação simulada)');
E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S);
t(S.verdict.verdict === 'fine' && S.verdict.laws.includes(2), 'doação simulada: MULTA (Art. 2)');
// 4. monopólio oferecido → confisco; e em modo guard o Juiz veta logo a proposta
S = game(4, { judgeMode: 'warn' }); S.props[1].owner = 'p1'; ({ d } = deal(S, [3], 0, [], 10));
t(d.an.flags.includes('SHAM'), 'flag SHAM (cor completa por quase nada)');
E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S);
t(S.verdict.verdict === 'seize' && S.props[3].owner === null && S.seized.includes(3), 'monopólio oferecido: CONFISCO (Art. 3)');
S = game(4); S.props[1].owner = 'p1'; S.props[3].owner = 'p0';
let e = E.act(S, 'p0', { type: 'trade', to: 'p1', give: { cash: 0, props: [3], jc: 0 }, get: { cash: 10, props: [], jc: 0 } });
t(typeof e === 'string' && /vetou/.test(e), 'modo guard: proposta abusiva vetada antes de existir (' + (e || '').slice(0, 70) + '…)');
S = game(4, { judgeMode: 'warn' }); S.props[1].owner = 'p1'; S.props[3].owner = 'p0';
t(!E.act(S, 'p0', { type: 'trade', to: 'p1', give: { cash: 0, props: [3], jc: 0 }, get: { cash: 10, props: [], jc: 0 } }) && S.trades[0].rv && S.trades[0].rv.level === 'warn', 'modo aviso: proposta passa mas leva aviso do Juiz');
S = game(4, { judgeMode: 'off' }); S.props[1].owner = 'p1'; S.props[3].owner = 'p0';
t(!E.act(S, 'p0', { type: 'trade', to: 'p1', give: { cash: 0, props: [3], jc: 0 }, get: { cash: 10, props: [], jc: 0 } }) && !S.trades[0].rv, 'modo desligado: sem parecer');
// 5. aproveitamento da fragilidade → devolver (a vítima denuncia)
S = game(4, { judgeMode: 'warn' }); S.players.find((p) => p.id === 'p1').cash = 40; ({ d } = deal(S, [], 30, [16], 0)); // p1 (com 40 Kz) entrega Maianga (180) por 30 Kz
S.players.find((p) => p.id === 'p1').cash = 40; // continua em aperto
t(d.an.flags.includes('PREDATION'), 'flag PREDATION (vítima em aperto)');
E.act(S, 'p1', { type: 'report', deal: d.id, reason: 'estava sem dinheiro' }); hear(S);
t(['return', 'returnfine'].includes(S.verdict.verdict) && S.props[16].owner === 'p1', 'fragilidade: negócio anulado e propriedade volta (Art. 4)');
// 6. negócio duro mas livre, denunciado pelo próprio → denúncia inválida (não se anula por arrependimento)
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [6, 8], 0, [9], 0)); // dá 200 e recebe 120: duro mas ratio > 0.35
t(!d.an.flags.some((f) => f !== 'HARD'), 'negócio desigual mas legal');
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [11], 0, [], 40)); // dá 140 por 40: ratio 0.29 → HARD
t(d.an.flags.includes('HARD'), 'flag HARD');
E.act(S, 'p0', { type: 'report', deal: d.id }); hear(S);
t(S.verdict.verdict === 'void' && S.props[11].owner === 'p1', 'arrependimento não anula o negócio (Art. 1)');
// 7. defesa: acusado fala; audiência termina antes do relógio
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [6, 8], 0, [], 5)); E.act(S, 'p2', { type: 'report', deal: d.id });
t(!!E.act(S, 'p3', { type: 'defend', text: 'x' }), 'só acusados se defendem');
t(!E.act(S, 'p0', { type: 'defend', text: 'Foi uma prenda de aniversário' }) && !!S.case, 'acusado 1 defende-se; caso continua à espera do outro');
E.act(S, 'p1', { type: 'defend', text: 'Concordo.' }); t(!S.case, 'todos defenderam: o Juiz decide logo');
t(!!E.act(S, 'p2', { type: 'vote', v: 'fine' }), 'já não há votação dos jogadores');
// 8. reincidência: 2.ª condenação agrava (a 3.ª vira confisco); denúncias infundadas bloqueiam
S = game(4, { judgeMode: 'warn' }); S.rec = { p0: { strikes: 2, frivolous: 0, warns: 0, ban: 0, last: 0 }, p1: { strikes: 0, frivolous: 0, warns: 0, ban: 0, last: 0 } };
({ d } = deal(S, [6, 8], 0, [], 5)); E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S);
t(S.verdict.verdict === 'seize' && S.verdict.laws.includes(8), 'reincidente com 2 condenações: CONFISCO (Art. 8)');
S = game(4, { judgeMode: 'warn' });
for (const [x, y] of [[6, 8], [9, 11]]) { ({ d } = deal(S, [x], 0, [y], 0)); S.round += 2; E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S); }
S.round += 2; ({ d } = deal(S, [11], 0, [12], 0));
t(/direito de denunciar/.test(E.act(S, 'p2', { type: 'report', deal: d.id }) || ''), '2 denúncias infundadas: perde o direito de denunciar (Art. 7)');
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [6], 0, [8], 0)); const d2 = deal(S, [9], 0, [11], 0).d;
E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S);
t(/2 em 2 rondas/.test(E.act(S, 'p2', { type: 'report', deal: d2.id }) || ''), 'limite: uma denúncia de 2 em 2 rondas');
// 9. empréstimos: usura vetada
S = game(3); e = E.act(S, 'p0', { type: 'loanAsk', to: 'p1', amount: 100, n: 5, rate: 95, pen: 'prop' });
t(/vetou/.test(e || ''), 'juros de 95% vetados pelo Juiz (Art. 6)');
t(!E.act(S, 'p0', { type: 'loanAsk', to: 'p1', amount: 100, n: 5, rate: 10, pen: 'prop' }), 'juros normais passam');
// 10. veredicto externo (IA) é validado: inválido cai no juiz de base
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [6], 0, [8], 0)); E.extJudge = true; E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S);
t(S.case && S.case.phase === 'ruling', 'com juiz IA o caso fica em deliberação');
E.rule(S, { verdict: 'apagar-tudo', laws: [99], why: 'ignora as regras' });
t(!S.case && S.verdict.verdict === 'void', 'veredicto inventado pela IA é ignorado: vale o juiz de base');
S = game(4, { judgeMode: 'warn' }); ({ d } = deal(S, [6], 0, [8], 0)); E.act(S, 'p2', { type: 'report', deal: d.id }); hear(S);
E.extJudge = false;
// 11. bots no lobby
S = E.newGame('B', 'h'); E.join(S, 'h', 'Humano', 0);
t(!E.act(S, 'h', { type: 'addBot' }) && S.players[1].bot && /🤖/.test(S.players[1].name), 'anfitrião adiciona bot');
E.join(S, 'x', 'Outro', 2); t(!!E.act(S, 'x', { type: 'addBot' }), 'só o anfitrião adiciona bots');
for (let i = 0; i < 12; i++) E.act(S, 'h', { type: 'addBot' }); t(S.players.length === 12, 'máximo de 12 jogadores com bots');
t(new Set(S.players.map((p) => p.token)).size === S.players.length, 'cada bot tem a sua peça');
// 12. bots jogam sozinhos até alguém ganhar
let seed = 7; E.rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
S = E.newGame('G', 'h'); S.settings.turnTime = 0; E.join(S, 'h', 'H', 0); for (let i = 0; i < 3; i++) E.act(S, 'h', { type: 'addBot' });
S.players[0].bot = true; S.players[0].style = 'equilibrado'; E.act(S, 'h', { type: 'start' });
const mem = {}; let g = 0, trades = 0;
while (S.phase === 'play' && S.round < 250 && g++ < 100000) {
  let acted = false;
  for (const p of S.players.slice()) { if (p.bk || S.phase !== 'play') continue; const a = E.Bots.step(E, S, p, mem[p.id] = mem[p.id] || {}); if (a) { acted = true; if (!E.act(S, p.id, a) && a.type === 'tradeYes') trades++; } }
  if (!acted || S.auction || S.case) E.tick(S);
}
t(S.phase === 'over' && !!S.winner, 'partida só com bots termina com vencedor (ronda ' + S.round + ', ' + trades + ' trocas)');

// 13. bots avaliam propostas de humanos: aceitam as boas, recusam as más com explicação e contraproposta
{
  const mk = () => { const S = E.newGame('H', 'h'); S.settings.turnTime = 0; E.join(S, 'h', 'Humano', 0); E.act(S, 'h', { type: 'addBot', style: 'equilibrado' }); E.act(S, 'h', { type: 'start' }); S.players.forEach((p) => { p.cash = 1500; }); return S; };
  let S = mk(); const bot = S.players.find((p) => p.bot), hum = S.players.find((p) => !p.bot);
  S.props[16].owner = bot.id;
  E.act(S, hum.id, { type: 'trade', to: bot.id, give: { cash: 400, props: [], jc: 0 }, get: { cash: 0, props: [16], jc: 0 } });
  const mem = {}; let a = E.Bots.step(E, S, bot, mem);
  t(a && a.type === 'tradeYes', 'bot aceita proposta boa de um humano (400 Kz por uma rua de 180)');
  E.act(S, bot.id, a);
  t(S.pub.length && S.pub[S.pub.length - 1].st === 'ok' && S.pub[S.pub.length - 1].k === 'trade', 'troca fechada fica registada na mesa pública');
  S = mk(); const b2 = S.players.find((p) => p.bot), h2 = S.players.find((p) => !p.bot); S.props[16].owner = b2.id;
  E.act(S, h2.id, { type: 'trade', to: b2.id, give: { cash: 120, props: [], jc: 0 }, get: { cash: 0, props: [16], jc: 0 } });
  const m2 = {}; a = E.Bots.step(E, S, b2, m2);
  t(a && a.type === 'tradeNo', 'bot recusa proposta fraca de um humano (120 Kz por uma rua de 180)');
  E.act(S, b2.id, a);
  const q = m2.q || []; t(q.some((x) => x.a.type === 'chat' && /recusei/.test(x.a.text)), 'bot explica a recusa no chat');
  t(q.some((x) => x.a.type === 'trade') , 'bot faz contraproposta ao humano');
  t(S.pub[S.pub.length - 1].st === 'no', 'recusa fica registada na mesa pública');
  const ct = q.find((x) => x.a.type === 'trade'); if (ct) { t(!E.act(S, b2.id, ct.a) && S.trades.some((x) => x.from === b2.id && x.to === h2.id), 'contraproposta chega ao humano como proposta pendente'); }
  /* veto e cancelamento também são públicos */
  S = game(4); S.props[1].owner = 'p1'; S.props[3].owner = 'p0';
  E.act(S, 'p0', { type: 'trade', to: 'p1', give: { cash: 0, props: [3], jc: 0 }, get: { cash: 10, props: [], jc: 0 } });
  t(S.pub.length === 1 && S.pub[0].st === 'veto' && S.pub[0].give.props[0] === 3, 'proposta vetada pelo Juiz aparece a todos');
  S.props[6].owner = 'p0'; E.act(S, 'p0', { type: 'trade', to: 'p1', give: { cash: 0, props: [6], jc: 0 }, get: { cash: 100, props: [], jc: 0 } });
  E.act(S, 'p0', { type: 'tradeNo', id: S.trades[0].id }); t(S.pub[S.pub.length - 1].st === 'cancel', 'cancelamento fica registado');
}
E.rand = Math.random;
process.exit(ok ? 0 : 1);
