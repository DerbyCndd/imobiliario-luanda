const E = require('./public/engine.js');
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exit(1); } console.log('ok -', m); };
function game(n, tt) {
  const S = E.newGame('T', 'p0');
  for (let i = 0; i < n; i++) E.join(S, 'p' + i, 'J' + i, i);
  S.settings.turnTime = tt; E.start(S);
  S.players.sort((a, b) => a.id.localeCompare(b.id)); S.cur = 0;
  return S;
}
const P = (S, id) => E.byId(S, id);
const ticks = (S, n) => { for (let i = 0; i < n; i++) E.tick(S); };

// 1) relógio arranca e desce
let S = game(3, 30);
E.tick(S); ok(S.tl === 30, 'relógio inicia nos 30 s (' + S.tl + ')');
ticks(S, 5); ok(S.tl === 25, 'desce 1 por segundo');

// 2) timeout -> turno jogado automaticamente e passa ao próximo
S = game(3, 30); E.tick(S); ticks(S, 30);
ok(E.cur(S).id !== 'p0' && S.turn.seq >= 1, 'após 30 s a vez de p0 foi jogada sozinha e passou a ' + E.cur(S).id);
ok(P(S, 'p0').miss === 1 && !P(S, 'p0').auto, 'p0 tem 1 falha, ainda não automático');

// 3) segunda falha -> modo automático; depois joga em 3 s
for (let g = 0; g < 100 && E.cur(S).id !== 'p0'; g++) { E.tick(S); if (E.cur(S).id !== 'p0') ticks(S, 1); if (g > 90) break; }
// força a vez de p0 (outros jogam por timeout enquanto esperamos)
let guard = 0; while (E.cur(S).id !== 'p0' && guard++ < 400) E.tick(S);
ok(E.cur(S).id === 'p0', 'voltou a vez de p0');
const seq0 = S.turn.seq; ticks(S, 31);
ok(P(S, 'p0').auto === true, 'após 2 falhas p0 está em modo automático');
ok(S.log.some((l) => typeof l === 'string' && l.includes('modo automático')), 'registo informa o modo automático');

// 4) em modo automático joga rápido (3 s)
guard = 0; while (E.cur(S).id !== 'p0' && guard++ < 600) E.tick(S);
ok(E.cur(S).id === 'p0', 'novamente a vez de p0');
const s1 = S.turn.seq; E.tick(S); ticks(S, 4);
ok(E.cur(S).id !== 'p0' || S.turn.seq > s1, 'em modo automático p0 jogou em poucos segundos');

// 5) acção manual retoma o controlo
guard = 0; while (E.cur(S).id !== 'p0' && guard++ < 600) E.tick(S);
E.act(S, 'p0', { type: 'back' });
ok(P(S, 'p0').auto === false && P(S, 'p0').miss === 0, 'acção manual repõe o controlo (auto=false)');

// 6) sem limite (turnTime 0) nunca joga sozinho
S = game(3, 0); ticks(S, 500);
ok(E.cur(S).id === 'p0' && S.turn.seq === 0, 'turnTime 0: nada acontece automaticamente');

// 7) dívida: jogador auto vende/hipoteca e, se não chegar, falência
S = game(3, 30);
S.props[1].owner = 'p1'; P(S, 'p1').cash = 0;
S.debts.push({ pid: 'p1', amt: 9999, to: 'bank', why: 'teste' }); S.turn.phase = 'debt';
E.tick(S); ticks(S, 30);
ok(P(S, 'p1').bk === true, 'dívida impossível: tempo esgotado leva à falência automática');

// 8) leilão: jogadores automáticos desistem sozinhos
S = game(3, 30); P(S, 'p1').auto = true; P(S, 'p2').auto = true;
S.turn.phase = 'buy'; S.players[0].pos = 1; E.act(S, 'p0', { type: 'decline' });
E.tick(S);
ok(S.auction === null || S.auction.pass.includes('p1'), 'jogadores automáticos desistem do leilão');
console.log('TUDO OK');
