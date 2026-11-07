const E = require('./public/engine.js');
let ok = true; const t = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU - ') + m); if (!c) ok = false; };
function game(n, opts) {
  const S = E.newGame('J', 'p0'); for (let i = 0; i < n; i++) E.join(S, 'p' + i, 'J' + i, i);
  Object.assign(S.settings, opts || {}); E.act(S, 'p0', { type: 'start' }); return S;
}
function mkDeal(S) { // p0 dá Cazenga(1) a p1 por 100 Kz
  S.props[1].owner = 'p0'; S.players.forEach((p) => { p.cash = 1500; });
  S.trades.push({ id: 99, from: 'p0', to: 'p1', give: { cash: 0, props: [1], jc: 0 }, get: { cash: 100, props: [], jc: 0 } });
  t(!E.act(S, 'p1', { type: 'tradeYes', id: 99 }), 'troca concluída'); return S.deals[S.deals.length - 1];
}
const cash = (S, id) => S.players.find((p) => p.id === id).cash;
// 1. sem jurados
let S = game(2); let d = mkDeal(S);
t(d && d.a === 'p0' && d.b === 'p1', 'troca guardada no histórico');
t(!!E.act(S, 'p0', { type: 'report', deal: d.id }), '2 jogadores: sem jurados, denúncia recusada');
// 2. confiscar (denunciante terceiro, jurados = restantes)
S = game(5); d = mkDeal(S);
t(!E.act(S, 'p2', { type: 'report', deal: d.id, reason: 'suspeito' }) && S.case, 'p2 denuncia');
t(JSON.stringify([...S.case.voters].sort()) === '["p3","p4"]', 'jurados = jogadores fora do negócio e do denunciante');
t(!!E.act(S, 'p2', { type: 'report', deal: d.id }), 'não se denuncia 2 vezes');
t(!!E.act(S, 'p0', { type: 'vote', v: 'seize' }), 'parte envolvida não vota');
E.act(S, 'p3', { type: 'vote', v: 'seize' }); t(!!S.case, 'caso continua à espera do 2.º jurado');
E.act(S, 'p4', { type: 'vote', v: 'seize' });
t(!S.case && S.props[1].owner === null && S.seized.includes(1), 'confiscar: propriedade volta ao banco e fica à venda');
// 3. devolver
S = game(4); d = mkDeal(S); E.act(S, 'p2', { type: 'report', deal: d.id });
E.act(S, 'p3', { type: 'vote', v: 'return' });
t(S.props[1].owner === 'p0' && cash(S, 'p0') === 1500 && cash(S, 'p1') === 1500, 'devolver: tudo volta ao que era');
// 4. indemnizar quem denunciou (denunciante é parte lesada p1)
S = game(4); d = mkDeal(S); E.act(S, 'p1', { type: 'report', deal: d.id });
const pen = E.casePen(d); E.act(S, 'p2', { type: 'vote', v: 'comp' }); E.act(S, 'p3', { type: 'vote', v: 'comp' });
t(cash(S, 'p1') === 1400 + pen && cash(S, 'p0') === 1600 - pen, 'indemnizar: acusado paga ao denunciante (' + pen + ' Kz)');
// 5. denúncia inválida: denunciante paga
S = game(4); d = mkDeal(S); E.act(S, 'p2', { type: 'report', deal: d.id });
E.act(S, 'p3', { type: 'vote', v: 'void' });
t(cash(S, 'p2') === 1500 - pen && cash(S, 'p0') + cash(S, 'p1') === 3000 + pen, 'inválida: denunciante indemniza os acusados');
// 6. multa vai para o banco
S = game(4); d = mkDeal(S); E.act(S, 'p2', { type: 'report', deal: d.id }); E.act(S, 'p3', { type: 'vote', v: 'fine' });
t(cash(S, 'p0') === 1600 - pen && cash(S, 'p1') === 1400 - pen, 'multa: cada acusado paga ' + pen);
// 7. empate/sem votos arquiva; tempo esgotado
S = game(5); d = mkDeal(S); E.act(S, 'p2', { type: 'report', deal: d.id });
E.act(S, 'p3', { type: 'vote', v: 'fine' }); E.act(S, 'p4', { type: 'vote', v: 'seize' });
t(!S.case && S.props[1].owner === 'p1', 'empate: denúncia arquivada');
S = game(4); d = mkDeal(S); E.act(S, 'p2', { type: 'report', deal: d.id }); S.settings.turnTime = 0;
for (let i = 0; i < 61 && S.case; i++) E.tick(S);
t(!S.case && S.props[1].owner === 'p1', 'tempo esgotado sem votos: arquivada');
// 8. limite de casas desligado
S = game(2, { limitHouses: false });
t(S.houses >= 9999 && S.hotels >= 9999, 'sem limite: banco com casas de sobra');
S = game(2); t(S.houses === 32 && S.hotels === 12, 'com limite: 32 casas e 12 hotéis');
// 9. entrada a meio e ronda
S = game(2); E.join(S, 'late', 'Tardio', null);
t(S.players.length === 3 && S.players[2].id === 'late', 'entra a meio na ronda 1');
S.round = 3; E.join(S, 'late2', 'Outro', null); t(S.players.length === 3 && S.specs.length === 1, 'ronda 3: assiste');
S = game(3); const r0 = S.round; for (let i = 0; i < 3; i++) { S.turn.phase = 'end'; E.act(S, E.cur(S).id, { type: 'endTurn' }); }
t(S.round === r0 + 1, 'a ronda sobe quando a vez volta ao primeiro');
// 10. rendas
t(E.BOARD[1].r[0] >= 4 && E.BOARD[39].r[0] === 56, 'rendas ajustadas');
// 11. Partida configurável e economia
S = game(2); t(S.settings.go === 500, 'Partida paga 500 por defeito');
{ const c = E.cur(S); c.pos = 38; c.cash = 1000; S.turn.phase = 'roll'; E.rand = () => 0.4; E.act(S, c.id, { type: 'roll' }); t(c.cash >= 1500 - 300, 'passar pela Partida recebe 500 (cash ' + c.cash + ')'); }
S = E.newGame('G', 'p0'); E.join(S, 'p0', 'A', 0); E.join(S, 'p1', 'B', 1); E.act(S, 'p0', { type: 'settings', go: 300, cash: 1500 }); t(S.settings.go === 300, 'anfitrião define a Partida no lobby');
t(E.CARDS.chance.concat(E.CARDS.cc).every((c) => c.k !== 'get' || c.v <= 150), 'recompensas das cartas até 150 Kz');
t(E.BOARD.filter((q) => q.t === 'prop').every((q) => q.r[0] / q.p >= 0.12 && q.h >= 70), 'renda base >= 12% do preço e construção mais cara');
process.exit(ok ? 0 : 1);
