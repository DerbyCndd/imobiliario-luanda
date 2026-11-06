const E = require('./public/engine.js');
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exit(1); } console.log('ok -', m); };
function game(n) {
  const S = E.newGame('T', 'p0');
  for (let i = 0; i < n; i++) E.join(S, 'p' + i, 'J' + i, i);
  E.start(S);
  S.players.sort((a, b) => a.id.localeCompare(b.id)); S.cur = 0; // p0 começa
  return S;
}
const P = (S, id) => E.byId(S, id);
const turnTo = (S, id) => { let g = 0; while (E.cur(S).id !== id && g++ < 50) { S.turn.phase = 'end'; E.act(S, E.cur(S).id, { type: 'endTurn' }); } };

// 1) empréstimo do banco: recebe o dinheiro, juros 5+2n %
let S = game(3);
const c0 = P(S, 'p1').cash;
ok(E.act(S, 'p1', { type: 'loanBank', amount: 500, n: 5, pen: 'prop' }) === null, 'pedido ao banco aceite');
ok(P(S, 'p1').cash === c0 + 500, 'recebeu 500 Kz');
let L = S.loans[0];
ok(L.rate === 15 && L.total === 575 && L.inst === 115, 'taxa 15%: total 575, prestação 115 (' + L.total + '/' + L.inst + ')');
ok(E.act(S, 'p1', { type: 'loanBank', amount: 1200, n: 5 }) !== null, 'acima de 1000 Kz recusado');
ok(E.act(S, 'p1', { type: 'loanBank', amount: 55, n: 5 }) !== null, 'valor não múltiplo de 50 recusado');

// 2) prestação cobrada no início da vez do devedor
turnTo(S, 'p1');
ok(P(S, 'p1').cash === c0 + 500 - 115 && L.rem === 460, 'prestação de 115 cobrada ao chegar a vez');

// 3) falhas -> confisco de propriedade (a mais barata)
S = game(3);
S.props[1].owner = 'p1'; S.props[39].owner = 'p1'; S.props[3].owner = 'p1';
E.act(S, 'p1', { type: 'loanBank', amount: 100, n: 3, pen: 'prop' });
P(S, 'p1').cash = 0;
turnTo(S, 'p1'); // falha 1
L = S.loans[0];
ok(L.miss === 1 && S.props[1].owner === 'p1', 'falha 1/2: ainda sem confisco');
turnTo(S, 'p2'); turnTo(S, 'p0'); P(S, 'p1').cash = 0; turnTo(S, 'p1'); // falha 2
ok(S.props[1].owner === null || S.props[3].owner === null, 'falha 2/2: propriedade mais barata confiscada ao banco');
ok(S.props[39].owner === 'p1', 'a propriedade cara ficou com o jogador');

// 4) saldo negativo
S = game(3);
E.act(S, 'p1', { type: 'loanBank', amount: 100, n: 3, pen: 'neg' });
P(S, 'p1').cash = 10;
turnTo(S, 'p1'); turnTo(S, 'p2'); turnTo(S, 'p0'); turnTo(S, 'p1');
ok(P(S, 'p1').cash < 0, 'ficou com saldo negativo (' + P(S, 'p1').cash + ')');

// 5) empréstimo entre jogadores com juros próprios + confisco para o credor
S = game(3);
const a0 = P(S, 'p0').cash;
ok(E.act(S, 'p2', { type: 'loanAsk', to: 'p0', amount: 300, rate: 20, n: 4, pen: 'prop' }) === null, 'pedido a jogador criado');
ok(E.act(S, 'p1', { type: 'loanYes', id: S.lreq[0].id }) !== null, 'terceiro não pode aceitar');
ok(E.act(S, 'p0', { type: 'loanYes', id: S.lreq[0].id }) === null, 'credor aceita');
ok(P(S, 'p0').cash === a0 - 300 && S.loans[0].total === 360 && S.loans[0].inst === 90, 'credor deu 300; total 360; prestação 90');
S.props[5].owner = 'p2'; P(S, 'p2').cash = 0;
turnTo(S, 'p2'); turnTo(S, 'p0'); turnTo(S, 'p1'); P(S, 'p2').cash = 0; turnTo(S, 'p2');
ok(S.props[5].owner === 'p0', 'linha confiscada passou para o credor');
const before = P(S, 'p0').cash;
// 6) pagamento antecipado
S = game(2);
E.act(S, 'p1', { type: 'loanBank', amount: 200, n: 3 });
const rem = S.loans[0].rem;
ok(E.act(S, 'p1', { type: 'repay', id: S.loans[0].id }) === null && S.loans.length === 0, 'quitação antecipada (' + rem + ' Kz)');
// 7) falência do devedor remove empréstimos; do credor passa ao banco
S = game(3);
E.act(S, 'p2', { type: 'loanAsk', to: 'p0', amount: 100, rate: 10, n: 3 }); E.act(S, 'p0', { type: 'loanYes', id: S.lreq[0].id });
E.act(S, 'p0', { type: 'loanBank', amount: 100, n: 3 });
S.debts.push({ pid: 'p0', amt: 99999, to: 'bank', why: 't' });
E.act(S, 'p0', { type: 'bankrupt' });
ok(S.loans.every((l) => l.lender === 'bank') && S.loans.length === 1, 'falência do credor: dívida passa para o banco; empréstimo do falido apagado');
console.log('TUDO OK');
