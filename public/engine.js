/* Imobiliário Luanda - motor de regras (puro, sem DOM). Corre no navegador (anfitrião) e em Node (testes). */
(function (root) {
  'use strict';
  const E = { rand: Math.random };

  /* ------------------------------------------------------------------ TABULEIRO */
  const GC = { brown: '#8B4A2B', lblue: '#9ED8F3', pink: '#D93A96', orange: '#F7941D', red: '#E3262B', yellow: '#FBE400', green: '#1FB25A', dblue: '#0B5CA8' };
  const P = (n, g, p, r, h) => ({ t: 'prop', n, g, p, r, h });
  const BOARD = [
    { t: 'go', n: 'Partida' },
    P('Cazenga', 'brown', 60, [2, 10, 30, 90, 160, 250], 50),
    { t: 'cc', n: 'Caixa Comunitária' },
    P('Sambizanga', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
    { t: 'tax', n: 'Imposto de Rendimento', amt: 200 },
    { t: 'rail', n: 'Linha de Luanda', p: 200 },
    P('Rangel', 'lblue', 100, [6, 30, 90, 270, 400, 550], 50),
    { t: 'chance', n: 'Sorte' },
    P('Viana', 'lblue', 100, [6, 30, 90, 270, 400, 550], 50),
    P('Cacuaco', 'lblue', 120, [8, 40, 100, 300, 450, 600], 50),
    { t: 'jail', n: 'Cadeia / Visita' },
    P('Benfica', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
    { t: 'util', n: 'ENDE Electricidade', p: 150 },
    P('Camama', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
    P('Golfe', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
    { t: 'rail', n: 'Linha de Benguela', p: 200 },
    P('Maianga', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
    { t: 'cc', n: 'Caixa Comunitária' },
    P('Alvalade', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
    P('Maculusso', 'orange', 200, [16, 80, 220, 600, 800, 1000], 100),
    { t: 'park', n: 'Parque Gratuito' },
    P('Miramar', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
    { t: 'chance', n: 'Sorte' },
    P('Prenda', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
    P('Kinaxixi', 'red', 240, [20, 100, 300, 750, 925, 1100], 150),
    { t: 'rail', n: 'Linha de Moçâmedes', p: 200 },
    P('Ingombota', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
    P('Baía de Luanda', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
    { t: 'util', n: 'EPAL Águas', p: 150 },
    P('Ilha do Cabo', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 150),
    { t: 'gojail', n: 'Vá para a Cadeia' },
    P('Talatona', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
    P('Belas', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
    { t: 'cc', n: 'Caixa Comunitária' },
    P('Kilamba', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 200),
    { t: 'rail', n: 'Linha de Malanje', p: 200 },
    { t: 'chance', n: 'Sorte' },
    P('Marginal', 'dblue', 350, [35, 175, 500, 1100, 1300, 1500], 200),
    { t: 'tax', n: 'Imposto de Luxo', amt: 100 },
    P('Mussulo', 'dblue', 400, [50, 200, 600, 1400, 1700, 2000], 200),
  ];
  const GROUPS = {};
  BOARD.forEach((s, i) => { if (s.g) (GROUPS[s.g] = GROUPS[s.g] || []).push(i); });
  const RAILS = [5, 15, 25, 35], UTILS = [12, 28];

  const TOKENS = ['🐕', '🎩', '🏎️', '🚢', '👢', '🐈', '🐎', '✈️', '🎸', '🦆', '🚲', '🐘'];
  const PCOL = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#0aa5a5', '#c2a600', '#f032e6', '#808000', '#7a4b2a', '#000075', '#e08080'];

  /* ------------------------------------------------------------------ CARTAS */
  const CARDS = {
    chance: [
      { x: 'Avança até à Partida. Recebe 200 Kz.', k: 'to', v: 0 },
      { x: 'Avança até Kinaxixi. Se passares pela Partida, recebe 200 Kz.', k: 'to', v: 24 },
      { x: 'Avança até Benfica. Se passares pela Partida, recebe 200 Kz.', k: 'to', v: 11 },
      { x: 'Avança até à companhia de serviços mais próxima. Se não tiver dono, podes comprá-la; se tiver, paga 10 vezes o valor dos dados.', k: 'util' },
      { x: 'Avança até à linha de comboio mais próxima. Se tiver dono, paga o dobro da renda.', k: 'rail' },
      { x: 'Avança até à linha de comboio mais próxima. Se tiver dono, paga o dobro da renda.', k: 'rail' },
      { x: 'O banco paga-te um dividendo de 50 Kz.', k: 'get', v: 50 },
      { x: 'Sai livre da Cadeia. Guarda esta carta até precisares dela.', k: 'jail' },
      { x: 'Recua 3 casas.', k: 'back' },
      { x: 'Vá para a Cadeia. Vai directamente para a Cadeia, sem passar pela Partida.', k: 'gojail' },
      { x: 'Reparações gerais nas tuas propriedades: paga 25 Kz por cada casa e 100 Kz por cada hotel.', k: 'repair', v: 25, h: 100 },
      { x: 'Paga a multa de 15 Kz.', k: 'pay', v: 15 },
      { x: 'Faz uma viagem na Linha de Luanda. Se passares pela Partida, recebe 200 Kz.', k: 'to', v: 5 },
      { x: 'Avança até Mussulo.', k: 'to', v: 39 },
      { x: 'Foste eleito presidente da direcção. Paga 50 Kz a cada jogador.', k: 'payEach', v: 50 },
      { x: 'O teu empréstimo de construção vence. Recebe 150 Kz.', k: 'get', v: 150 },
    ],
    cc: [
      { x: 'Avança até à Partida. Recebe 200 Kz.', k: 'to', v: 0 },
      { x: 'Erro do banco a teu favor. Recebe 200 Kz.', k: 'get', v: 200 },
      { x: 'Honorários médicos. Paga 50 Kz.', k: 'pay', v: 50 },
      { x: 'Vendeste acções. Recebe 50 Kz.', k: 'get', v: 50 },
      { x: 'Sai livre da Cadeia. Guarda esta carta até precisares dela.', k: 'jail' },
      { x: 'Vá para a Cadeia. Vai directamente para a Cadeia, sem passar pela Partida.', k: 'gojail' },
      { x: 'O fundo de férias vence. Recebe 100 Kz.', k: 'get', v: 100 },
      { x: 'Reembolso de impostos. Recebe 20 Kz.', k: 'get', v: 20 },
      { x: 'É o teu aniversário. Recebe 10 Kz de cada jogador.', k: 'getEach', v: 10 },
      { x: 'O seguro de vida vence. Recebe 100 Kz.', k: 'get', v: 100 },
      { x: 'Despesas de hospital. Paga 100 Kz.', k: 'pay', v: 100 },
      { x: 'Propinas escolares. Paga 50 Kz.', k: 'pay', v: 50 },
      { x: 'Recebes 25 Kz de honorários de consultoria.', k: 'get', v: 25 },
      { x: 'Obras nas ruas: paga 40 Kz por cada casa e 115 Kz por cada hotel.', k: 'repair', v: 40, h: 115 },
      { x: 'Ganhaste o segundo prémio num concurso de beleza. Recebe 10 Kz.', k: 'get', v: 10 },
      { x: 'Recebes uma herança de 100 Kz.', k: 'get', v: 100 },
    ],
  };

  /* ------------------------------------------------------------------ UTIL */
  const byId = (S, id) => S.players.find((p) => p.id === id);
  const cur = (S) => S.players[S.cur];
  const log = (S, m) => { S.log.push(m); if (S.log.length > 120) S.log.shift(); };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(E.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const d6 = () => 1 + Math.floor(E.rand() * 6);
  const money = (n) => n + ' Kz';
  const avail = (S, p) => p.cash - (S.auction && S.auction.bidder === p.id ? S.auction.bid : 0);

  function newGame(code, hostPid) {
    return {
      v: 1, phase: 'lobby', code, hostPid, settings: { cash: 1500, pot: false },
      players: [], cur: 0, props: {}, houses: 32, hotels: 12,
      turn: { phase: 'roll', doubles: 0, extra: false, dice: [1, 1], seq: 0, pend: 0 },
      debts: [], auction: null, aq: [], trades: [], tid: 0, log: [], pot: 0,
      card: null, cardSeq: 0, decks: { chance: [], cc: [] }, winner: null,
    };
  }

  function join(S, pid, name, token) {
    name = String(name || '').trim().slice(0, 16) || 'Jogador';
    let p = byId(S, pid);
    if (p) { p.connected = true; if (S.phase === 'lobby') p.name = name; return null; }
    if (S.phase !== 'lobby') return 'O jogo já começou.';
    if (S.players.length >= 12) return 'A sala está cheia (máximo 12 jogadores).';
    const taken = S.players.map((x) => x.token);
    if (token == null || taken.includes(token) || token < 0 || token >= 12) token = TOKENS.findIndex((_, i) => !taken.includes(i));
    S.players.push({ id: pid, name, token, connected: true, cash: 0, pos: 0, jail: false, jt: 0, jc: [], bk: false });
    return null;
  }

  function start(S) {
    if (S.players.length < 2) return 'São precisos pelo menos 2 jogadores.';
    shuffle(S.players);
    S.players.forEach((p) => { p.cash = S.settings.cash; p.pos = 0; p.jail = false; p.jt = 0; p.jc = []; p.bk = false; });
    S.props = {};
    BOARD.forEach((s, i) => { if (s.t === 'prop' || s.t === 'rail' || s.t === 'util') S.props[i] = { owner: null, houses: 0, mort: false }; });
    S.decks.chance = shuffle(CARDS.chance.map((_, i) => i));
    S.decks.cc = shuffle(CARDS.cc.map((_, i) => i));
    S.houses = 32; S.hotels = 12; S.pot = 0; S.debts = []; S.auction = null; S.aq = []; S.trades = []; S.winner = null;
    S.cur = 0; S.phase = 'play';
    S.turn = { phase: 'roll', doubles: 0, extra: false, dice: [1, 1], seq: 0, pend: 0 };
    log(S, 'O jogo começou! Primeiro a jogar: ' + cur(S).name + '.');
    return null;
  }

  /* ------------------------------------------------------------------ DINHEIRO / DÍVIDAS */
  function payTo(S, payer, to, amt) {
    payer.cash -= amt;
    if (to === 'bank') { if (S.settings.pot) S.pot += amt; } else byId(S, to).cash += amt;
  }
  function settle(S) {
    while (S.debts.length) {
      const d = S.debts[0], p = byId(S, d.pid);
      if (p.cash >= d.amt) { payTo(S, p, d.to, d.amt); S.debts.shift(); }
      else { S.turn.phase = 'debt'; return false; }
    }
    return true;
  }
  function charge(S, p, amt, to, why) {
    if (amt <= 0) return true;
    S.debts.push({ pid: p.id, amt, to, why });
    return settle(S);
  }
  function afterDebt(S) {
    const T = S.turn;
    if (S.debts.length || T.phase !== 'debt') return;
    T.phase = 'moving';
    const c = cur(S);
    if (T.pend && !c.bk) { const n = T.pend; T.pend = 0; move(S, c, n); }
    T.pend = 0;
    flow(S);
  }
  function trySettle(S) { if (S.debts.length && S.phase === 'play') { if (settle(S)) afterDebt(S); } }

  /* ------------------------------------------------------------------ RENDAS */
  function ownsGroup(S, owner, g) { return GROUPS[g].every((i) => S.props[i].owner === owner); }
  function calcRent(S, idx, dice, o) {
    const sq = BOARD[idx], st = S.props[idx];
    if (sq.t === 'rail') {
      const n = RAILS.filter((i) => S.props[i].owner === st.owner).length;
      return 25 * Math.pow(2, n - 1) * (o && o.dbl ? 2 : 1);
    }
    if (sq.t === 'util') {
      const n = UTILS.filter((i) => S.props[i].owner === st.owner).length;
      const sum = o && o.dice ? o.dice : dice[0] + dice[1];
      return sum * (o && o.dice ? 10 : n === 2 ? 10 : 4);
    }
    if (st.houses > 0) return sq.r[st.houses];
    return ownsGroup(S, st.owner, sq.g) ? sq.r[0] * 2 : sq.r[0];
  }

  /* ------------------------------------------------------------------ MOVIMENTO */
  function goJail(S, p) { p.pos = 10; p.jail = true; p.jt = 0; S.turn.extra = false; log(S, p.name + ' foi para a Cadeia.'); }
  function move(S, p, n) {
    const np = (p.pos + n) % 40;
    if (p.pos + n >= 40) { p.cash += 200; log(S, p.name + ' passou pela Partida e recebeu 200 Kz.'); }
    p.pos = np; land(S, p, {});
  }
  function moveTo(S, p, sq, o) {
    if (sq < p.pos) { p.cash += 200; log(S, p.name + ' passou pela Partida e recebeu 200 Kz.'); }
    p.pos = sq; land(S, p, o || {});
  }
  function land(S, p, o) {
    const sq = BOARD[p.pos], T = S.turn;
    switch (sq.t) {
      case 'prop': case 'rail': case 'util': {
        const st = S.props[p.pos];
        if (!st.owner) { T.phase = 'buy'; log(S, p.name + ' caiu em ' + sq.n + ' (' + money(sq.p) + ').'); return; }
        if (st.owner === p.id || st.mort) return;
        const rent = calcRent(S, p.pos, T.dice, o), ow = byId(S, st.owner);
        log(S, p.name + ' paga ' + money(rent) + ' de renda a ' + ow.name + ' (' + sq.n + ').');
        charge(S, p, rent, ow.id, 'Renda de ' + sq.n);
        return;
      }
      case 'tax': log(S, p.name + ' paga ' + money(sq.amt) + ' de imposto.'); charge(S, p, sq.amt, 'bank', sq.n); return;
      case 'chance': case 'cc': drawCard(S, p, sq.t); return;
      case 'gojail': goJail(S, p); return;
      case 'park': if (S.settings.pot && S.pot > 0) { log(S, p.name + ' recebeu ' + money(S.pot) + ' do Parque Gratuito.'); p.cash += S.pot; S.pot = 0; } return;
    }
  }
  function nearest(from, set) { for (const i of set) if (i > from) return i; return set[0]; }
  function drawCard(S, p, deck) {
    const id = S.decks[deck].shift(), c = CARDS[deck][id];
    S.card = { seq: ++S.cardSeq, deck, text: c.x, pid: p.id };
    log(S, p.name + ' tirou ' + (deck === 'chance' ? 'Sorte' : 'Caixa Comunitária') + ': ' + c.x);
    if (c.k === 'jail') p.jc.push({ d: deck, id }); else S.decks[deck].push(id);
    const others = S.players.filter((x) => !x.bk && x.id !== p.id);
    switch (c.k) {
      case 'to': moveTo(S, p, c.v); break;
      case 'get': p.cash += c.v; break;
      case 'pay': charge(S, p, c.v, 'bank', 'Carta'); break;
      case 'back': p.pos = (p.pos + 37) % 40; land(S, p, {}); break;
      case 'gojail': goJail(S, p); break;
      case 'rail': moveTo(S, p, nearest(p.pos, RAILS), { dbl: true }); break;
      case 'util': { const dd = d6() + d6(); log(S, p.name + ' lançou os dados: ' + dd + '.'); moveTo(S, p, nearest(p.pos, UTILS), { dice: dd }); break; }
      case 'repair': {
        let h = 0, ho = 0;
        Object.keys(S.props).forEach((i) => { const st = S.props[i]; if (st.owner === p.id) { if (st.houses === 5) ho++; else h += st.houses; } });
        const amt = h * c.v + ho * c.h; if (amt) charge(S, p, amt, 'bank', 'Reparações'); break;
      }
      case 'payEach': others.forEach((o) => charge(S, p, c.v, o.id, 'Carta')); break;
      case 'getEach': others.forEach((o) => charge(S, o, c.v, p.id, 'Carta')); break;
    }
  }

  function flow(S) {
    const T = S.turn;
    if (S.phase !== 'play' || T.phase !== 'moving') return;
    const c = cur(S);
    if (c.bk) { nextTurn(S); return; }
    T.phase = T.extra && !c.jail ? 'roll' : 'end';
  }
  function nextTurn(S) {
    if (S.phase !== 'play') return;
    do { S.cur = (S.cur + 1) % S.players.length; } while (cur(S).bk);
    S.turn = { phase: 'roll', doubles: 0, extra: false, dice: S.turn.dice, seq: S.turn.seq, pend: 0 };
  }

  function doRoll(S, p) {
    const T = S.turn, a = d6(), b = d6(), dbl = a === b, tot = a + b;
    T.dice = [a, b]; T.seq++; T.phase = 'moving';
    log(S, p.name + ' lançou ' + a + ' + ' + b + (dbl ? ' (duplo!)' : '') + '.');
    if (p.jail) {
      if (dbl) { p.jail = false; p.jt = 0; T.extra = false; log(S, p.name + ' saiu da Cadeia com um duplo.'); move(S, p, tot); flow(S); return; }
      p.jt++;
      if (p.jt >= 3) {
        p.jail = false; p.jt = 0; T.extra = false; T.pend = tot;
        log(S, p.name + ' falhou 3 vezes: paga 50 Kz e sai da Cadeia.');
        if (!charge(S, p, 50, 'bank', 'Multa da Cadeia')) return;
        T.pend = 0; move(S, p, tot); flow(S); return;
      }
      T.extra = false; T.phase = 'end'; log(S, p.name + ' continua na Cadeia.'); return;
    }
    if (dbl) { T.doubles++; if (T.doubles >= 3) { log(S, p.name + ' tirou 3 duplos seguidos!'); goJail(S, p); T.phase = 'moving'; flow(S); return; } }
    T.extra = dbl;
    move(S, p, tot); flow(S);
  }

  /* ------------------------------------------------------------------ LEILÃO */
  function startAuction(S, idx) {
    S.auction = { sq: idx, bid: 0, bidder: null, pass: [], left: 20 };
    S.turn.phase = 'auction';
    log(S, 'Leilão de ' + BOARD[idx].n + '!');
  }
  function finishAuction(S) {
    const A = S.auction;
    if (A.bidder) {
      const w = byId(S, A.bidder); w.cash -= A.bid; S.props[A.sq].owner = w.id;
      log(S, w.name + ' ganhou ' + BOARD[A.sq].n + ' por ' + money(A.bid) + '.');
    } else log(S, 'Ninguém licitou ' + BOARD[A.sq].n + '.');
    S.auction = null;
    if (S.aq.length) { startAuction(S, S.aq.shift()); return; }
    S.turn.phase = 'moving'; flow(S);
  }
  function checkAuctionEnd(S) {
    const A = S.auction; if (!A) return;
    const active = S.players.filter((p) => !p.bk && !A.pass.includes(p.id));
    if ((A.bidder && active.length <= 1) || (!A.bidder && active.length === 0)) finishAuction(S);
  }
  function tick(S) {
    if (S.phase !== 'play' || !S.auction) return false;
    if (--S.auction.left <= 0) finishAuction(S);
    return true;
  }

  /* ------------------------------------------------------------------ FALÊNCIA */
  function bankrupt(S, pid, forceBank) {
    const p = byId(S, pid); if (!p || p.bk) return;
    const debt = S.debts.find((d) => d.pid === pid);
    const to = !forceBank && debt && debt.to !== 'bank' ? byId(S, debt.to) : null;
    S.debts = S.debts.filter((d) => d.pid !== pid);
    S.debts.forEach((d) => { if (d.to === pid) d.to = 'bank'; });
    S.trades = S.trades.filter((t) => t.from !== pid && t.to !== pid);
    const mine = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === pid);
    mine.forEach((i) => {
      const st = S.props[i];
      if (st.houses === 5) S.hotels++; else S.houses += st.houses;
      st.houses = 0;
    });
    if (to) {
      log(S, p.name + ' faliu e entregou tudo a ' + to.name + '.');
      to.cash += p.cash;
      mine.forEach((i) => {
        const st = S.props[i]; st.owner = to.id;
        if (st.mort) { const fee = Math.ceil(BOARD[i].p * 0.05); const pay = Math.min(fee, to.cash); to.cash -= pay; }
      });
      to.jc.push(...p.jc);
    } else {
      log(S, p.name + ' faliu. As propriedades vão a leilão.');
      mine.forEach((i) => { const st = S.props[i]; st.owner = null; st.mort = false; S.aq.push(i); });
      p.jc.forEach((c) => S.decks[c.d].push(c.id));
    }
    p.cash = 0; p.jc = []; p.bk = true;
    const alive = S.players.filter((x) => !x.bk);
    if (alive.length === 1) { S.phase = 'over'; S.winner = alive[0].id; S.auction = null; S.aq = []; S.debts = []; log(S, '🏆 ' + alive[0].name + ' venceu o jogo!'); return; }
    if (S.auction) { checkAuctionEnd(S); return; }
    if (S.aq.length) { startAuction(S, S.aq.shift()); return; }
    if (S.debts.length) { if (settle(S)) afterDebt(S); return; }
    if (S.turn.phase === 'debt' || S.turn.phase === 'buy' || cur(S).id === pid) { S.turn.phase = 'moving'; flow(S); }
  }

  /* ------------------------------------------------------------------ PROPRIEDADES */
  const mortVal = (i) => BOARD[i].p / 2;
  const unmortCost = (i) => Math.ceil(BOARD[i].p / 2 * 1.1);
  function groupBuilt(S, g) { return GROUPS[g].some((i) => S.props[i].houses > 0); }
  function canBuild(S, p, i) {
    const sq = BOARD[i], st = S.props[i];
    if (!st || sq.t !== 'prop') return 'Só podes construir em ruas.';
    if (st.owner !== p.id) return 'Esta propriedade não é tua.';
    if (!ownsGroup(S, p.id, sq.g)) return 'Precisas de todas as propriedades da cor.';
    if (GROUPS[sq.g].some((j) => S.props[j].mort)) return 'Há propriedades hipotecadas neste grupo.';
    if (st.houses >= 5) return 'Já tem hotel.';
    const min = Math.min(...GROUPS[sq.g].map((j) => S.props[j].houses));
    if (st.houses > min) return 'Constrói de forma uniforme (as outras casas primeiro).';
    if (st.houses === 4 && S.hotels < 1) return 'Já não há hotéis no banco.';
    if (st.houses < 4 && S.houses < 1) return 'Já não há casas no banco.';
    if (avail(S, p) < sq.h) return 'Dinheiro insuficiente (há uma licitação em curso).';
    return null;
  }
  function canSell(S, p, i) {
    const sq = BOARD[i], st = S.props[i];
    if (!st || sq.t !== 'prop' || st.owner !== p.id) return 'Não podes vender aqui.';
    if (st.houses < 1) return 'Não há construções.';
    const max = Math.max(...GROUPS[sq.g].map((j) => S.props[j].houses));
    if (st.houses < max) return 'Vende de forma uniforme.';
    if (st.houses === 5 && S.houses < 4) return 'Não há casas suficientes no banco para trocar o hotel.';
    return null;
  }

  /* ------------------------------------------------------------------ TROCAS */
  function validTrade(S, t) {
    const a = byId(S, t.from), b = byId(S, t.to);
    if (!a || !b || a.bk || b.bk) return 'Jogador inválido.';
    const chk = (side, owner) => {
      if (side.cash > avail(S, owner)) return owner.name + ' não tem dinheiro suficiente.';
      if (side.jc > owner.jc.length) return owner.name + ' não tem essas cartas.';
      for (const i of side.props) {
        const st = S.props[i];
        if (!st || st.owner !== owner.id) return 'Uma propriedade já não pertence a ' + owner.name + '.';
        if (BOARD[i].g && groupBuilt(S, BOARD[i].g)) return 'Vende as construções de ' + BOARD[i].n + ' (e do grupo) antes de trocar.';
      }
      return null;
    };
    let e = chk(t.give, a) || chk(t.get, b); if (e) return e;
    const fee = (props) => props.reduce((s, i) => s + (S.props[i].mort ? Math.ceil(BOARD[i].p * 0.05) : 0), 0);
    if (avail(S, a) - t.give.cash + t.get.cash < fee(t.get.props)) return a.name + ' não tem dinheiro para os juros das hipotecas.';
    if (avail(S, b) - t.get.cash + t.give.cash < fee(t.give.props)) return b.name + ' não tem dinheiro para os juros das hipotecas.';
    return null;
  }
  function execTrade(S, t) {
    const a = byId(S, t.from), b = byId(S, t.to);
    a.cash += t.get.cash - t.give.cash; b.cash += t.give.cash - t.get.cash;
    t.give.props.forEach((i) => { S.props[i].owner = b.id; if (S.props[i].mort) b.cash -= Math.ceil(BOARD[i].p * 0.05); });
    t.get.props.forEach((i) => { S.props[i].owner = a.id; if (S.props[i].mort) a.cash -= Math.ceil(BOARD[i].p * 0.05); });
    for (let k = 0; k < t.give.jc; k++) b.jc.push(a.jc.pop());
    for (let k = 0; k < t.get.jc; k++) a.jc.push(b.jc.pop());
    log(S, 'Troca concluída entre ' + a.name + ' e ' + b.name + '.');
  }
  const cleanSide = (s) => ({ cash: Math.max(0, Math.floor(+s.cash || 0)), props: (s.props || []).map(Number), jc: Math.max(0, Math.floor(+s.jc || 0)) });

  /* ------------------------------------------------------------------ ACÇÕES */
  function act(S, pid, a) {
    const me = byId(S, pid);
    if (!me) return 'Jogador desconhecido.';
    if (a.type === 'chat') { const t = String(a.text || '').trim().slice(0, 200); if (t) { S.log.push({ n: me.name, c: me.token, t }); if (S.log.length > 120) S.log.shift(); } return null; }
    if (S.phase === 'lobby') {
      if (a.type === 'token') { const t = a.token | 0; if (t < 0 || t > 11 || S.players.some((x) => x.token === t && x.id !== pid)) return 'Peça indisponível.'; me.token = t; return null; }
      if (a.type === 'rename') { me.name = String(a.name || '').trim().slice(0, 16) || me.name; return null; }
      if (pid !== S.hostPid) return 'Só o anfitrião pode fazer isso.';
      if (a.type === 'settings') { S.settings.cash = Math.min(10000, Math.max(500, (a.cash | 0) || 1500)); S.settings.pot = !!a.pot; return null; }
      if (a.type === 'start') return start(S);
      if (a.type === 'kick') { if (a.pid === pid) return 'Não te podes expulsar.'; S.players = S.players.filter((x) => x.id !== a.pid); return null; }
      return 'Acção inválida no lobby.';
    }
    if (S.phase !== 'play') return 'O jogo terminou.';
    if (me.bk && a.type !== 'noop') return 'Já estás eliminado.';
    const T = S.turn, isCur = cur(S).id === pid;
    switch (a.type) {
      case 'roll':
        if (!isCur || T.phase !== 'roll') return 'Não podes lançar os dados agora.';
        doRoll(S, me); return null;
      case 'payJail':
        if (!isCur || T.phase !== 'roll' || !me.jail) return 'Não estás preso.';
        if (avail(S, me) < 50) return 'Dinheiro insuficiente.';
        me.cash -= 50; if (S.settings.pot) S.pot += 50; me.jail = false; me.jt = 0; log(S, me.name + ' pagou 50 Kz e saiu da Cadeia.'); return null;
      case 'useJail':
        if (!isCur || T.phase !== 'roll' || !me.jail || !me.jc.length) return 'Não podes usar a carta.';
        { const c = me.jc.pop(); S.decks[c.d].push(c.id); me.jail = false; me.jt = 0; log(S, me.name + ' usou a carta Sai livre da Cadeia.'); } return null;
      case 'buy': {
        if (!isCur || T.phase !== 'buy') return 'Não podes comprar agora.';
        const sq = BOARD[me.pos];
        if (me.cash < sq.p) return 'Dinheiro insuficiente.';
        me.cash -= sq.p; S.props[me.pos].owner = me.id; log(S, me.name + ' comprou ' + sq.n + ' por ' + money(sq.p) + '.');
        T.phase = 'moving'; flow(S); return null;
      }
      case 'decline':
        if (!isCur || T.phase !== 'buy') return 'Não podes recusar agora.';
        log(S, me.name + ' não quis comprar.'); startAuction(S, me.pos); return null;
      case 'bid': {
        const A = S.auction; if (!A) return 'Não há leilão.';
        const amt = Math.floor(+a.amount);
        if (A.pass.includes(pid)) return 'Já desististe deste leilão.';
        if (!(amt > A.bid)) return 'A licitação tem de ser superior a ' + A.bid + ' Kz.';
        if (amt > me.cash) return 'Dinheiro insuficiente.';
        A.bid = amt; A.bidder = pid; A.left = 12; log(S, me.name + ' licita ' + money(amt) + '.'); return null;
      }
      case 'pass': {
        const A = S.auction; if (!A) return 'Não há leilão.';
        if (A.bidder === pid) return 'És o maior licitador.';
        if (!A.pass.includes(pid)) A.pass.push(pid);
        checkAuctionEnd(S); return null;
      }
      case 'endTurn':
        if (!isCur || T.phase !== 'end') return 'Ainda não podes terminar a vez.';
        nextTurn(S); return null;
      case 'build': {
        const i = a.sq | 0, e = canBuild(S, me, i); if (e) return e;
        const st = S.props[i], sq = BOARD[i];
        me.cash -= sq.h;
        if (st.houses === 4) { S.hotels--; S.houses += 4; st.houses = 5; log(S, me.name + ' construiu um hotel em ' + sq.n + '.'); }
        else { S.houses--; st.houses++; log(S, me.name + ' construiu uma casa em ' + sq.n + '.'); }
        return null;
      }
      case 'sell': {
        const i = a.sq | 0, e = canSell(S, me, i); if (e) return e;
        const st = S.props[i], sq = BOARD[i];
        if (st.houses === 5) { S.hotels++; S.houses -= 4; st.houses = 4; } else { S.houses++; st.houses--; }
        me.cash += sq.h / 2; log(S, me.name + ' vendeu uma construção em ' + sq.n + '.'); trySettle(S); return null;
      }
      case 'mortgage': {
        const i = a.sq | 0, st = S.props[i];
        if (!st || st.owner !== pid) return 'Não é tua.';
        if (st.mort) return 'Já está hipotecada.';
        if (BOARD[i].g && groupBuilt(S, BOARD[i].g)) return 'Vende primeiro as construções do grupo.';
        st.mort = true; me.cash += mortVal(i); log(S, me.name + ' hipotecou ' + BOARD[i].n + ' (+' + money(mortVal(i)) + ').'); trySettle(S); return null;
      }
      case 'unmortgage': {
        const i = a.sq | 0, st = S.props[i];
        if (!st || st.owner !== pid || !st.mort) return 'Não está hipotecada.';
        if (avail(S, me) < unmortCost(i)) return 'Dinheiro insuficiente (' + money(unmortCost(i)) + ').';
        me.cash -= unmortCost(i); st.mort = false; log(S, me.name + ' resgatou ' + BOARD[i].n + '.'); return null;
      }
      case 'bankrupt': {
        const d = S.debts.find((x) => x.pid === pid);
        if (!d) return 'Só podes declarar falência quando tens uma dívida por pagar.';
        bankrupt(S, pid, false); return null;
      }
      case 'trade': {
        const to = byId(S, a.to);
        if (!to || to.bk || to.id === pid) return 'Jogador inválido.';
        if (S.trades.filter((t) => t.from === pid).length >= 5) return 'Tens demasiadas propostas pendentes.';
        const t = { id: ++S.tid, from: pid, to: to.id, give: cleanSide(a.give || {}), get: cleanSide(a.get || {}) };
        if (!t.give.cash && !t.give.props.length && !t.give.jc && !t.get.cash && !t.get.props.length && !t.get.jc) return 'Proposta vazia.';
        const e = validTrade(S, t); if (e) return e;
        S.trades.push(t); log(S, me.name + ' propôs uma troca a ' + to.name + '.'); return null;
      }
      case 'tradeYes': {
        const t = S.trades.find((x) => x.id === a.id); if (!t || t.to !== pid) return 'Proposta inexistente.';
        const e = validTrade(S, t);
        S.trades = S.trades.filter((x) => x.id !== t.id);
        if (e) return 'Troca inválida: ' + e;
        execTrade(S, t); trySettle(S); return null;
      }
      case 'tradeNo': {
        const t = S.trades.find((x) => x.id === a.id); if (!t || (t.to !== pid && t.from !== pid)) return 'Proposta inexistente.';
        S.trades = S.trades.filter((x) => x.id !== t.id); log(S, t.to === pid ? me.name + ' recusou uma troca.' : me.name + ' cancelou uma troca.'); return null;
      }
      case 'kick': {
        if (pid !== S.hostPid) return 'Só o anfitrião pode fazer isso.';
        const v = byId(S, a.pid); if (!v || v.bk) return 'Jogador inválido.';
        log(S, v.name + ' foi removido pelo anfitrião.'); bankrupt(S, v.id, true); return null;
      }
    }
    return 'Acção desconhecida.';
  }

  Object.assign(E, { BOARD, GROUPS, GC, RAILS, UTILS, TOKENS, PCOL, CARDS, newGame, join, start, act, tick, byId, cur, calcRent, canBuild, canSell, mortVal, unmortCost, validTrade, ownsGroup, groupBuilt, money });
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : this);
