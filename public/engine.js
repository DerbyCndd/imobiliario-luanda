/* Imobiliário Luanda - motor de regras (puro, sem DOM). Corre no navegador (anfitrião) e em Node (testes). */
(function (root) {
  'use strict';
  const E = { rand: Math.random };

  /* ------------------------------------------------------------------ TABULEIRO */
  const GC = { brown: '#8B4A2B', lblue: '#9ED8F3', pink: '#D93A96', orange: '#F7941D', red: '#E3262B', yellow: '#FBE400', green: '#1FB25A', dblue: '#0B5CA8' };
  const P = (n, g, p, r, h) => ({ t: 'prop', n, g, p, r, h });
  const BOARD = [
    { t: 'go', n: 'Partida' },
    P('Cazenga', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
    { t: 'cc', n: 'Caixa Comunitária' },
    P('Sambizanga', 'brown', 60, [6, 30, 90, 270, 400, 550], 50),
    { t: 'tax', n: 'Imposto de Rendimento', amt: 200 },
    { t: 'rail', n: 'Linha de Luanda', p: 200 },
    P('Rangel', 'lblue', 100, [8, 40, 100, 300, 450, 600], 50),
    { t: 'chance', n: 'Sorte' },
    P('Viana', 'lblue', 100, [8, 40, 100, 300, 450, 600], 50),
    P('Cacuaco', 'lblue', 120, [10, 50, 150, 450, 625, 750], 50),
    { t: 'jail', n: 'Cadeia / Visita' },
    P('Benfica', 'pink', 140, [12, 60, 180, 500, 700, 900], 100),
    { t: 'util', n: 'ENDE Electricidade', p: 150 },
    P('Camama', 'pink', 140, [12, 60, 180, 500, 700, 900], 100),
    P('Golfe', 'pink', 160, [14, 70, 200, 550, 750, 950], 100),
    { t: 'rail', n: 'Linha de Benguela', p: 200 },
    P('Maianga', 'orange', 180, [16, 80, 220, 600, 800, 1000], 100),
    { t: 'cc', n: 'Caixa Comunitária' },
    P('Alvalade', 'orange', 180, [16, 80, 220, 600, 800, 1000], 100),
    P('Maculusso', 'orange', 200, [18, 90, 250, 700, 875, 1050], 100),
    { t: 'park', n: 'Parque Gratuito' },
    P('Miramar', 'red', 220, [20, 100, 300, 750, 925, 1100], 150),
    { t: 'chance', n: 'Sorte' },
    P('Prenda', 'red', 220, [20, 100, 300, 750, 925, 1100], 150),
    P('Kinaxixi', 'red', 240, [22, 110, 330, 800, 975, 1150], 150),
    { t: 'rail', n: 'Linha de Moçâmedes', p: 200 },
    P('Ingombota', 'yellow', 260, [24, 120, 360, 850, 1025, 1200], 150),
    P('Baía de Luanda', 'yellow', 260, [24, 120, 360, 850, 1025, 1200], 150),
    { t: 'util', n: 'EPAL Águas', p: 150 },
    P('Ilha do Cabo', 'yellow', 280, [26, 130, 390, 900, 1100, 1275], 150),
    { t: 'gojail', n: 'Vá para a Cadeia' },
    P('Talatona', 'green', 300, [28, 150, 450, 1000, 1200, 1400], 200),
    P('Belas', 'green', 300, [28, 150, 450, 1000, 1200, 1400], 200),
    { t: 'cc', n: 'Caixa Comunitária' },
    P('Kilamba', 'green', 320, [32, 170, 500, 1100, 1300, 1500], 200),
    { t: 'rail', n: 'Linha de Malanje', p: 200 },
    { t: 'chance', n: 'Sorte' },
    P('Marginal', 'dblue', 350, [40, 200, 550, 1200, 1400, 1600], 200),
    { t: 'tax', n: 'Imposto de Luxo', amt: 100 },
    P('Mussulo', 'dblue', 400, [55, 250, 650, 1500, 1800, 2100], 200),
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
      v: 1, phase: 'lobby', code, hostPid, settings: { cash: 1500, pot: false, turnTime: 60, limitHouses: true, lateJoin: true }, tl: 0, tk: '',
      players: [], specs: [], round: 1, deals: [], did: 0, case: null, cid: 0, verdict: null, cur: 0, props: {}, houses: 32, hotels: 12,
      turn: { phase: 'roll', doubles: 0, extra: false, dice: [1, 1], seq: 0, pend: 0 },
      debts: [], auction: null, aq: [], seized: [], trades: [], tid: 0, loans: [], lreq: [], lid: 0, log: [], pot: 0,
      card: null, cardSeq: 0, decks: { chance: [], cc: [] }, winner: null,
    };
  }

  function join(S, pid, name, token) {
    name = String(name || '').trim().slice(0, 16) || 'Jogador';
    let p = byId(S, pid);
    if (p) { p.connected = true; if (S.phase === 'lobby') p.name = name; return null; }
    S.specs = S.specs || [];
    const sp = S.specs.find((x) => x.id === pid);
    if (sp) { sp.connected = true; return null; }
    if (S.phase !== 'lobby') {
      /* partida a decorrer: entra a meio nas 2 primeiras rondas; depois só assiste */
      if (S.phase === 'play' && (S.round || 1) <= 2 && S.settings.lateJoin !== false && S.players.length < 12) {
        const taken = S.players.map((x) => x.token);
        if (token == null || taken.includes(token) || token < 0 || token >= 12) token = TOKENS.findIndex((_, i) => !taken.includes(i));
        S.players.push({ id: pid, name, token, connected: true, cash: S.settings.cash, pos: 0, jail: false, jt: 0, jc: [], bk: false, miss: 0, auto: false });
        if (S.settings.limitHouses !== false) {
          const hm = Math.max(32, 4 * S.players.length), tm = Math.max(12, Math.ceil(1.5 * S.players.length));
          S.houses += hm - S.houseMax; S.hotels += tm - S.hotelMax; S.houseMax = hm; S.hotelMax = tm;
        }
        log(S, '🎉 ' + name + ' entrou na partida a meio (ronda ' + S.round + ') com ' + money(S.settings.cash) + '.');
        return null;
      }
      if (S.specs.length >= 40) return 'Há demasiados espectadores nesta sala.';
      S.specs.push({ id: pid, name, connected: true });
      return null;
    }
    if (S.players.length >= 12) return 'A sala está cheia (máximo 12 jogadores).';
    const taken = S.players.map((x) => x.token);
    if (token == null || taken.includes(token) || token < 0 || token >= 12) token = TOKENS.findIndex((_, i) => !taken.includes(i));
    S.players.push({ id: pid, name, token, connected: true, cash: 0, pos: 0, jail: false, jt: 0, jc: [], bk: false, miss: 0, auto: false });
    return null;
  }

  function start(S) {
    if (S.players.length < 2) return 'São precisos pelo menos 2 jogadores.';
    shuffle(S.players);
    S.players.forEach((p) => { p.cash = S.settings.cash; p.pos = 0; p.jail = false; p.jt = 0; p.jc = []; p.bk = false; p.miss = 0; p.auto = false; });
    S.tl = 0; S.tk = '';
    S.props = {};
    BOARD.forEach((s, i) => { if (s.t === 'prop' || s.t === 'rail' || s.t === 'util') S.props[i] = { owner: null, houses: 0, mort: false }; });
    S.decks.chance = shuffle(CARDS.chance.map((_, i) => i));
    S.decks.cc = shuffle(CARDS.cc.map((_, i) => i));
    /* até 8 jogadores: 32 casas e 12 hotéis; acima disso o banco ganha 4 casas e 1,5 hotéis por jogador */
    S.round = 1; S.deals = []; S.did = 0; S.case = null; S.verdict = null;
    /* sem limite: o banco "tem" casas de sobra (9999) */
    S.houseMax = S.settings.limitHouses === false ? 9999 : Math.max(32, 4 * S.players.length);
    S.hotelMax = S.settings.limitHouses === false ? 9999 : Math.max(12, Math.ceil(1.5 * S.players.length));
    S.houses = S.houseMax; S.hotels = S.hotelMax; S.pot = 0; S.debts = []; S.auction = null; S.aq = []; S.seized = []; S.trades = []; S.loans = []; S.lreq = []; S.lid = 0; S.winner = null;
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
    const prevCur = S.cur;
    do { S.cur = (S.cur + 1) % S.players.length; } while (cur(S).bk);
    if (S.cur <= prevCur) S.round = (S.round || 1) + 1;
    S.turn = { phase: 'roll', doubles: 0, extra: false, dice: S.turn.dice, seq: S.turn.seq, pend: 0 };
    collectLoans(S, cur(S));
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
    if (A.bidder) S.seized = (S.seized || []).filter((i) => i !== A.sq);
    S.auction = null;
    if (A.prev && !S.aq.length) { S.turn.phase = A.prev; return; }
    if (S.aq.length) { startAuction(S, S.aq.shift()); return; }
    S.turn.phase = 'moving'; flow(S);
  }
  function checkAuctionEnd(S) {
    const A = S.auction; if (!A) return;
    const active = S.players.filter((p) => !p.bk && !A.pass.includes(p.id));
    if ((A.bidder && active.length <= 1) || (!A.bidder && active.length === 0)) finishAuction(S);
  }
  /* ------------------------------------------------------------------ RELÓGIO E JOGO AUTOMÁTICO */
  const actorOf = (S) => (S.turn.phase === 'debt' && S.debts.length ? byId(S, S.debts[0].pid) : cur(S));
  const timeFor = (p, tt) => (p.auto ? 3 : !p.connected ? Math.min(tt, 15) : tt);
  function autoStep(S, p) {
    const T = S.turn, m = p;
    if (T.phase === 'roll') {
      if (m.jail && m.jc.length) act(S, m.id, { type: 'useJail' });
      else if (m.jail && m.cash > 400) act(S, m.id, { type: 'payJail' });
      act(S, m.id, { type: 'roll' });
    } else if (T.phase === 'buy') {
      if (m.cash >= BOARD[m.pos].p + 150) act(S, m.id, { type: 'buy' }); else act(S, m.id, { type: 'decline' });
    } else if (T.phase === 'end') act(S, m.id, { type: 'endTurn' });
    else if (T.phase === 'debt') {
      for (let g = 0; g < 200 && S.phase === 'play' && S.debts.some((d) => d.pid === m.id); g++) {
        const owned = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === m.id);
        let did = false;
        for (const i of owned) if (act(S, m.id, { type: 'sell', sq: i }) === null) { did = true; break; }
        if (!did) for (const i of owned) if (act(S, m.id, { type: 'mortgage', sq: i }) === null) { did = true; break; }
        if (!did) { act(S, m.id, { type: 'bankrupt' }); break; }
      }
    }
  }
  function autoTurn(S, p) {
    S._auto = true;
    try {
      for (let n = 0; n < 14 && S.phase === 'play'; n++) {
        const a = actorOf(S);
        if (!a || a.id !== p.id || S.turn.phase === 'auction') break;
        autoStep(S, a);
      }
    } finally { delete S._auto; }
  }
  // devolve 0 (nada), 1 (só relógio mudou) ou 2 (o estado do jogo mudou)
  function tick(S) {
    if (S.phase !== 'play') return 0;
    let ret = 0;
    if (S.case) { ret = 1; if (--S.case.left <= 0 || caseDone(S)) { resolveCase(S); ret = 2; } }
    if (S.auction) {
      ret = 1;
      if (--S.auction.left <= 0) { finishAuction(S); ret = 2; }
      else {
        const A = S.auction;
        S.players.forEach((p) => { if (p.auto && !p.bk && A.bidder !== p.id && !A.pass.includes(p.id)) A.pass.push(p.id); });
        checkAuctionEnd(S); if (!S.auction) ret = 2;
      }
    }
    const tt = S.settings.turnTime | 0;
    if (!tt || S.phase !== 'play' || S.turn.phase === 'auction') { if (S.tl) { S.tl = 0; S.tk = ''; ret = Math.max(ret, 1); } return ret; }
    const a = actorOf(S), key = S.cur + '|' + S.turn.phase + '|' + S.turn.seq + '|' + a.id + '|' + S.debts.length;
    if (key !== S.tk) { S.tk = key; S.tl = timeFor(a, tt); return Math.max(ret, 1); }
    if (--S.tl > 0) return Math.max(ret, 1);
    a.miss = (a.miss || 0) + 1;
    log(S, '⏱️ Tempo esgotado: a jogada de ' + a.name + ' é feita automaticamente.');
    if (a.miss >= 2 && !a.auto) { a.auto = true; log(S, '🤖 ' + a.name + ' passou ao modo automático (volta a clicar para retomar).'); }
    autoTurn(S, a);
    S.tk = '';
    return 2;
  }

  /* ------------------------------------------------------------------ FALÊNCIA */
  function bankrupt(S, pid, forceBank) {
    const p = byId(S, pid); if (!p || p.bk) return;
    const debt = S.debts.find((d) => d.pid === pid);
    const to = !forceBank && debt && debt.to !== 'bank' ? byId(S, debt.to) : null;
    S.debts = S.debts.filter((d) => d.pid !== pid);
    S.debts.forEach((d) => { if (d.to === pid) d.to = 'bank'; });
    S.trades = S.trades.filter((t) => t.from !== pid && t.to !== pid);
    S.lreq = S.lreq.filter((r) => r.from !== pid && r.to !== pid);
    S.loans = S.loans.filter((l) => l.borrower !== pid);
    const heir = !forceBank && S.debts.find((d) => d.pid === pid);
    S.loans.forEach((l) => { if (l.lender === pid) l.lender = heir && heir.to !== 'bank' ? heir.to : 'bank'; });
    const mine = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === pid);
    mine.forEach((i) => {
      const st = S.props[i];
      if (st.houses === 5) S.hotels++; else S.houses += st.houses;
      st.houses = 0;
    });
    if (to) {
      log(S, p.name + ' faliu e entregou tudo a ' + to.name + '.');
      to.cash += Math.max(0, p.cash);
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
    if (alive.length === 1) { S.phase = 'over'; S.winner = alive[0].id; S.auction = null; S.aq = []; S.debts = []; S.case = null; log(S, '🏆 ' + alive[0].name + ' venceu o jogo!'); return; }
    if (S.auction) { checkAuctionEnd(S); return; }
    if (S.aq.length) { startAuction(S, S.aq.shift()); return; }
    if (S.debts.length) { if (settle(S)) afterDebt(S); return; }
    if (S.turn.phase === 'debt' || S.turn.phase === 'buy' || cur(S).id === pid) { S.turn.phase = 'moving'; flow(S); }
  }

  /* ------------------------------------------------------------------ EMPRÉSTIMOS */
  const LOAN_GRACE = 2;
  const bankRate = (n) => 5 + 2 * n;               // % total de juros do banco conforme o prazo
  const loanTotal = (amount, rate) => Math.round(amount * (1 + rate / 100));
  function newLoan(S, lender, borrower, amount, rate, n, pen) {
    const total = loanTotal(amount, rate);
    return { id: ++S.lid, lender, borrower, principal: amount, rate, n, inst: Math.ceil(total / n), total, rem: total, miss: 0, grace: LOAN_GRACE, pen };
  }
  function creditLender(S, L, amt) { if (L.lender !== 'bank') { const l = byId(S, L.lender); if (l) l.cash += amt; } }
  function dropLoan(S, L) { S.loans = S.loans.filter((x) => x.id !== L.id); }
  function collectLoans(S, p) {
    for (const L of S.loans.filter((l) => l.borrower === p.id)) {
      const pay = Math.min(L.inst, L.rem), who = L.lender === 'bank' ? 'ao banco' : 'a ' + byId(S, L.lender).name;
      if (p.cash >= pay) {
        p.cash -= pay; creditLender(S, L, pay); L.rem -= pay; L.miss = 0;
        log(S, '💳 ' + p.name + ' pagou a prestação de ' + money(pay) + ' ' + who + '.');
        if (L.rem <= 0) { dropLoan(S, L); log(S, '✅ ' + p.name + ' liquidou o empréstimo.'); }
        continue;
      }
      L.miss++;
      log(S, '⚠️ ' + p.name + ' não conseguiu pagar a prestação de ' + money(pay) + ' (falha ' + L.miss + '/' + L.grace + ').');
      if (L.miss >= L.grace) penalize(S, p, L, pay, who);
    }
  }
  function penalize(S, p, L, pay, who) {
    if (L.pen === 'prop') {
      const mine = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === p.id);
      mine.sort((a, b) => (S.props[a].houses > 0) - (S.props[b].houses > 0) || BOARD[a].p - BOARD[b].p);
      if (mine.length) {
        const i = mine[0], st = S.props[i], value = st.mort ? BOARD[i].p / 2 : BOARD[i].p;
        if (st.houses === 5) S.hotels++; else S.houses += st.houses;
        st.houses = 0;
        st.owner = L.lender === 'bank' ? null : L.lender;
        if (L.lender === 'bank') { st.mort = false; S.seized = S.seized || []; if (!S.seized.includes(i)) S.seized.push(i); log(S, '🏦 ' + BOARD[i].n + ' ficou à venda no banco (comprar ou leiloar).'); }
        L.rem = Math.max(0, L.rem - value); L.miss = 0;
        log(S, '🏚️ ' + BOARD[i].n + ' foi confiscada a ' + p.name + ' (abate ' + money(value) + ' à dívida).');
        if (L.rem <= 0) { dropLoan(S, L); log(S, '✅ Empréstimo liquidado com a propriedade confiscada.'); }
        return;
      }
    }
    p.cash -= pay; creditLender(S, L, pay); L.rem -= pay; L.miss = 0;
    log(S, '🔻 ' + p.name + ' ficou com saldo ' + (p.cash < 0 ? 'negativo' : 'reduzido') + ' (' + money(p.cash) + ') pela prestação em atraso ' + who + '.');
    if (L.rem <= 0) dropLoan(S, L);
  }
  function termsError(a, maxAmt) {
    if (!(a.amount >= 10 && a.amount <= maxAmt) || a.amount % 10) return 'Valor inválido.';
    if (!(a.n >= 2 && a.n <= 20)) return 'O prazo tem de ser entre 2 e 20 rondas.';
    return null;
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
    const snap = (x) => ({ cash: x.cash, props: x.props.slice(), jc: x.jc });
    S.deals = S.deals || [];
    S.deals.push({ id: ++S.did, a: a.id, b: b.id, give: snap(t.give), get: snap(t.get), round: S.round, rep: false });
    if (S.deals.length > 12) S.deals.shift();
  }

  /* ------------------------------------------------------------------ JUIZ (denúncias de trocas suspeitas, decididas por votação) */
  const VERDICTS = { fine: 'Multar', seize: 'Confiscar', return: 'Devolver', comp: 'Indemnizar quem denunciou', void: 'Denúncia inválida' };
  const dealValue = (d) => d.give.cash + d.get.cash + [...d.give.props, ...d.get.props].reduce((s, i) => s + BOARD[i].p, 0);
  const casePen = (d) => Math.min(400, Math.max(50, Math.round((dealValue(d) * 0.15) / 10) * 10));
  const caseNeeded = (S) => S.case.voters.filter((id) => { const p = byId(S, id); return p && !p.bk && !p.auto; });
  function transfer(S, from, to, amt) {
    const pay = Math.max(0, Math.min(amt, from.cash));
    from.cash -= pay;
    if (to === 'bank') { if (S.settings.pot) S.pot += pay; } else to.cash += pay;
    return pay;
  }
  function seizeProp(S, i) {
    const st = S.props[i]; if (!st || st.owner === null) return;
    if (st.houses === 5) S.hotels++; else S.houses += st.houses;
    st.houses = 0; st.owner = null; st.mort = false;
    S.seized = S.seized || []; if (!S.seized.includes(i)) S.seized.push(i);
  }
  function resolveCase(S) {
    const c = S.case; if (!c) return;
    const d = S.deals.find((x) => x.id === c.deal), rep = byId(S, c.by);
    const tally = {}; Object.values(c.votes).forEach((v) => { tally[v] = (tally[v] || 0) + 1; });
    const top = Math.max(0, ...Object.values(tally)), win = Object.keys(tally).filter((k) => tally[k] === top);
    S.case = null; S.verdict = { seq: ((S.verdict && S.verdict.seq) || 0) + 1, text: '' };
    const say = (m) => { S.verdict.text = m; log(S, '⚖️ ' + m); };
    if (!d || !top || win.length !== 1) { say('Denúncia arquivada (sem maioria): nada acontece.'); return; }
    const v = win[0], pen = casePen(d), acc = c.accused.map((id) => byId(S, id)).filter(Boolean);
    const A = byId(S, d.a), Bp = byId(S, d.b), names = acc.map((p) => p.name).join(' e ');
    if (v === 'fine') {
      acc.forEach((p) => transfer(S, p, 'bank', pen));
      say('Veredicto: MULTA. ' + names + ' paga' + (acc.length > 1 ? 'm' : '') + ' até ' + money(pen) + ' cada ao banco.');
    } else if (v === 'seize') {
      const ps = [...d.give.props, ...d.get.props].filter((i) => S.props[i] && S.props[i].owner && [d.a, d.b].includes(S.props[i].owner));
      if (!ps.length) { acc.forEach((p) => transfer(S, p, 'bank', pen * 2)); say('Veredicto: CONFISCO (sem propriedades na troca): ' + names + ' paga até ' + money(pen * 2) + ' ao banco.'); }
      else { ps.forEach((i) => seizeProp(S, i)); say('Veredicto: CONFISCO. ' + ps.map((i) => BOARD[i].n).join(', ') + ' voltou ao banco (à venda).'); }
    } else if (v === 'return') {
      if (A && Bp) {
        d.give.props.forEach((i) => { if (S.props[i].owner === Bp.id) S.props[i].owner = A.id; });
        d.get.props.forEach((i) => { if (S.props[i].owner === A.id) S.props[i].owner = Bp.id; });
        const j1 = Math.min(d.give.jc, Bp.jc.length), j2 = Math.min(d.get.jc, A.jc.length);
        for (let k = 0; k < j1; k++) A.jc.push(Bp.jc.pop());
        for (let k = 0; k < j2; k++) Bp.jc.push(A.jc.pop());
        transfer(S, Bp, A, d.give.cash); transfer(S, A, Bp, d.get.cash);
      }
      say('Veredicto: DEVOLVER. A troca foi anulada e cada um recebeu de volta o que deu.');
    } else if (v === 'comp') {
      if (rep && !rep.bk) { acc.forEach((p) => transfer(S, p, rep, pen)); say('Veredicto: INDEMNIZAÇÃO. ' + names + ' paga' + (acc.length > 1 ? 'm' : '') + ' até ' + money(pen) + ' cada a ' + rep.name + '.'); }
      else say('Veredicto: indemnização, mas quem denunciou já não está no jogo.');
    } else {
      const share = Math.floor(pen / Math.max(1, acc.length));
      if (rep) acc.forEach((p) => transfer(S, rep, p, share));
      say('Veredicto: DENÚNCIA INVÁLIDA. ' + (rep ? rep.name : 'Quem denunciou') + ' paga até ' + money(pen) + ' de indemnização a ' + names + '.');
    }
    d.verdict = v; trySettle(S);
  }
  function caseDone(S) {
    const need = caseNeeded(S);
    return need.length === 0 || need.every((id) => S.case.votes[id]);
  }
  const cleanSide = (s) => ({ cash: Math.max(0, Math.floor(+s.cash || 0)), props: (s.props || []).map(Number), jc: Math.max(0, Math.floor(+s.jc || 0)) });

  /* ------------------------------------------------------------------ ACÇÕES */
  function act(S, pid, a) {
    const me = byId(S, pid);
    if (!me) {
      const sp = (S.specs || []).find((x) => x.id === pid);
      if (!sp) return 'Jogador desconhecido.';
      if (a.type === 'chat') { const t = String(a.text || '').trim().slice(0, 200); if (t) { S.log.push({ n: sp.name, c: -1, t }); if (S.log.length > 120) S.log.shift(); } return null; }
      return 'Estás a assistir: só podes conversar.';
    }
    if (a.type === 'chat') { const t = String(a.text || '').trim().slice(0, 200); if (t) { S.log.push({ n: me.name, c: me.token, t }); if (S.log.length > 120) S.log.shift(); } return null; }
    if (S.phase === 'lobby') {
      if (a.type === 'token') { const t = a.token | 0; if (t < 0 || t > 11 || S.players.some((x) => x.token === t && x.id !== pid)) return 'Peça indisponível.'; me.token = t; return null; }
      if (a.type === 'rename') { me.name = String(a.name || '').trim().slice(0, 16) || me.name; return null; }
      if (pid !== S.hostPid) return 'Só o anfitrião pode fazer isso.';
      if (a.type === 'settings') { S.settings.cash = Math.min(10000, Math.max(500, (a.cash | 0) || 1500)); S.settings.pot = !!a.pot; S.settings.limitHouses = a.limitHouses !== false; S.settings.lateJoin = a.lateJoin !== false; const tt = a.turnTime | 0; S.settings.turnTime = [0, 30, 45, 60, 90, 120].includes(tt) ? tt : 60; return null; }
      if (a.type === 'start') return start(S);
      if (a.type === 'kick') { if (a.pid === pid) return 'Não te podes expulsar.'; S.players = S.players.filter((x) => x.id !== a.pid); return null; }
      return 'Acção inválida no lobby.';
    }
    if (S.phase !== 'play') return 'O jogo terminou.';
    if (me.bk && a.type !== 'noop') return 'Já estás eliminado.';
    const T = S.turn, isCur = cur(S).id === pid;
    if (!S._auto) { me.miss = 0; me.auto = false; }
    switch (a.type) {
      case 'back': return null;
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
      case 'buySeized': {
        const i = a.sq | 0, st = S.props[i];
        if (S.auction) return 'Há um leilão em curso.';
        if (S.debts.length) return 'Resolve primeiro as dívidas pendentes.';
        if (!st || st.owner !== null || !(S.seized || []).includes(i)) return 'Essa propriedade não está à venda no banco.';
        if (me.cash < BOARD[i].p) return 'Dinheiro insuficiente.';
        me.cash -= BOARD[i].p; st.owner = me.id; st.mort = false; S.seized = S.seized.filter((x) => x !== i);
        log(S, '🏦 ' + me.name + ' comprou ao banco a propriedade confiscada ' + BOARD[i].n + ' por ' + money(BOARD[i].p) + '.'); return null;
      }
      case 'auctionSeized': {
        const i = a.sq | 0, st = S.props[i];
        if (!isCur || (T.phase !== 'roll' && T.phase !== 'end')) return 'Só podes pôr a leilão na tua vez (antes de lançar os dados ou depois de jogar).';
        if (S.auction || S.debts.length) return 'Há um leilão ou dívida em curso.';
        if (!st || st.owner !== null || !(S.seized || []).includes(i)) return 'Essa propriedade não está à venda no banco.';
        log(S, '🔨 ' + me.name + ' pediu leilão da propriedade confiscada ' + BOARD[i].n + '.');
        const prev = T.phase; startAuction(S, i); S.auction.prev = prev; return null;
      }
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
      case 'loanBank': {
        const amt = a.amount | 0, n = a.n | 0, pen = a.pen === 'neg' ? 'neg' : 'prop';
        if (amt < 50 || amt > 1000 || amt % 50) return 'O banco empresta entre 50 e 1000 Kz (múltiplos de 50).';
        if (n < 3 || n > 15) return 'Prazo do banco: 3 a 15 rondas.';
        if (S.loans.filter((l) => l.borrower === pid).length >= 4) return 'Máximo de 4 empréstimos activos.';
        const owed = S.loans.filter((l) => l.borrower === pid && l.lender === 'bank').reduce((s, l) => s + l.rem, 0);
        if (owed + loanTotal(amt, bankRate(n)) > 2500) return 'Limite de dívida ao banco: 2500 Kz.';
        S.loans.push(newLoan(S, 'bank', pid, amt, bankRate(n), n, pen)); me.cash += amt;
        log(S, '🏦 ' + me.name + ' pediu ' + money(amt) + ' ao banco (' + bankRate(n) + '% de juros, ' + n + ' rondas).'); trySettle(S); return null;
      }
      case 'loanAsk': {
        const to = byId(S, a.to);
        if (!to || to.bk || to.id === pid) return 'Jogador inválido.';
        const t = { amount: a.amount | 0, n: a.n | 0, rate: Math.floor(+a.rate), pen: a.pen === 'neg' ? 'neg' : 'prop' };
        const e = termsError(t, 5000); if (e) return e;
        if (!(t.rate >= 0 && t.rate <= 100)) return 'A taxa de juro tem de estar entre 0% e 100%.';
        if (S.lreq.filter((r) => r.from === pid).length >= 3) return 'Tens demasiados pedidos pendentes.';
        if (S.loans.filter((l) => l.borrower === pid).length >= 4) return 'Máximo de 4 empréstimos activos.';
        S.lreq.push({ id: ++S.lid, from: pid, to: to.id, ...t });
        log(S, '💬 ' + me.name + ' pediu ' + money(t.amount) + ' a ' + to.name + '.'); return null;
      }
      case 'loanYes': {
        const r = S.lreq.find((x) => x.id === a.id && x.to === pid); if (!r) return 'Pedido inexistente.';
        const b = byId(S, r.from); S.lreq = S.lreq.filter((x) => x.id !== r.id);
        if (!b || b.bk) return 'O jogador já não está no jogo.';
        if (avail(S, me) < r.amount) return 'Não tens dinheiro suficiente para emprestar.';
        if (S.loans.filter((l) => l.borrower === b.id).length >= 4) return 'O jogador já tem demasiados empréstimos.';
        me.cash -= r.amount; b.cash += r.amount; S.loans.push(newLoan(S, pid, b.id, r.amount, r.rate, r.n, r.pen));
        log(S, '🤝 ' + me.name + ' emprestou ' + money(r.amount) + ' a ' + b.name + ' (' + r.rate + '%, ' + r.n + ' rondas).'); trySettle(S); return null;
      }
      case 'loanNo': {
        const r = S.lreq.find((x) => x.id === a.id && (x.to === pid || x.from === pid)); if (!r) return 'Pedido inexistente.';
        S.lreq = S.lreq.filter((x) => x.id !== r.id); log(S, r.to === pid ? me.name + ' recusou um pedido de empréstimo.' : me.name + ' cancelou um pedido de empréstimo.'); return null;
      }
      case 'repay': {
        const L = S.loans.find((x) => x.id === a.id && x.borrower === pid); if (!L) return 'Empréstimo inexistente.';
        if (avail(S, me) < L.rem) return 'Precisas de ' + money(L.rem) + ' para quitar.';
        me.cash -= L.rem; creditLender(S, L, L.rem); dropLoan(S, L); log(S, '✅ ' + me.name + ' quitou um empréstimo antecipadamente.'); return null;
      }
      case 'report': {
        if (S.case) return 'Já há uma denúncia em julgamento.';
        const d = (S.deals || []).find((x) => x.id === a.deal);
        if (!d) return 'Negócio inexistente (só os últimos 12 podem ser denunciados).';
        if (d.rep) return 'Este negócio já foi denunciado.';
        const accused = [d.a, d.b].filter((id) => id !== pid);
        let voters = S.players.filter((p) => !p.bk && p.id !== d.a && p.id !== d.b && p.id !== pid).map((p) => p.id);
        if (!voters.length && pid !== d.a && pid !== d.b) voters = [pid];
        if (!voters.length) return 'Não há jurados suficientes (precisa de pelo menos um jogador fora do negócio).';
        d.rep = true;
        S.case = { id: ++S.cid, deal: d.id, by: pid, accused, voters, votes: {}, reason: String(a.reason || '').trim().slice(0, 120), left: 60 };
        log(S, '⚖️ ' + me.name + ' denunciou uma troca entre ' + byId(S, d.a).name + ' e ' + byId(S, d.b).name + '. Os jurados têm 60 s para votar.'); return null;
      }
      case 'vote': {
        const c = S.case; if (!c) return 'Não há nenhuma denúncia em julgamento.';
        if (!c.voters.includes(pid)) return 'Não és jurado neste caso.';
        if (!VERDICTS[a.v]) return 'Voto inválido.';
        c.votes[pid] = a.v; if (caseDone(S)) resolveCase(S); return null;
      }
      case 'kick': {
        if (pid !== S.hostPid) return 'Só o anfitrião pode fazer isso.';
        const v = byId(S, a.pid); if (!v || v.bk) return 'Jogador inválido.';
        log(S, v.name + ' foi removido pelo anfitrião.'); bankrupt(S, v.id, true); return null;
      }
    }
    return 'Acção desconhecida.';
  }

  Object.assign(E, { VERDICTS, casePen, dealValue, BOARD, GROUPS, GC, RAILS, UTILS, TOKENS, PCOL, CARDS, newGame, join, start, act, tick, byId, cur, calcRent, canBuild, canSell, bankRate, loanTotal, LOAN_GRACE, mortVal, unmortCost, validTrade, ownsGroup, groupBuilt, money });
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : this);
