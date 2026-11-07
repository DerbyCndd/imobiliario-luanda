/* Bots do Imobiliário Luanda: jogam como qualquer jogador (as mesmas acções do motor, nenhuma trapaça).
   Compram, licitam, constroem, hipotecam, negoceiam trocas (várias por ronda e de vários tipos), avaliam as propostas
   de bots E de humanos (aceitam, recusam com explicação no chat ou fazem contraproposta), pedem/dão empréstimos,
   defendem-se em tribunal e respeitam o Juiz Digital. step() devolve UMA acção por chamada (ou null).
   Estilos: equilibrado, agressivo, cauteloso, negociador. */
(function (root) {
  'use strict';
  const STY = {
    equilibrado: { res: 150, aggr: 1.0, accept: 1.0, build: 200, trade: 1, lend: 1 },
    agressivo: { res: 60, aggr: 1.25, accept: 0.9, build: 80, trade: 1, lend: 0.6 },
    cauteloso: { res: 180, aggr: 0.95, accept: 1.15, build: 350, trade: 1, lend: 1.3 },
    negociador: { res: 120, aggr: 1.0, accept: 0.95, build: 150, trade: 2, lend: 1 },
  };
  const DEFENSES = [
    'Foi um negócio livre entre as partes: ninguém foi forçado.',
    'Aceitei porque me convinha. Pode confirmar os valores, Meritíssimo.',
    'Não houve conluio: cada um decidiu por si e pelas suas contas.',
    'Precisava de ajustar a minha estratégia e este era o preço justo para mim.',
  ];
  const YES = ['Fechado! Bom negócio.', 'Aceito, faz sentido para mim.', 'Negócio feito!', 'Boa proposta, aceito.'];
  const PRIO = { orange: 5, red: 5, yellow: 4, pink: 3, green: 3, dblue: 3, lblue: 2, brown: 1 };
  const r10 = (n) => Math.round(n / 10) * 10, r25 = (n) => Math.round(n / 25) * 25;
  const pick = (E, a) => a[Math.floor(E.rand() * a.length)];

  const owned = (S, pid) => Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === pid);
  const cnt = (S, E, g, pid) => E.GROUPS[g].filter((i) => S.props[i].owner === pid).length;
  const nm = (S, id) => (S.players.find((p) => p.id === id) || { name: '?' }).name;
  const sideTxt = (E, s) => [s.cash ? s.cash + ' Kz' : ''].concat(s.props.map((i) => E.BOARD[i].n)).filter(Boolean).join(' + ') || 'nada';

  /* quanto vale uma propriedade para este bot (preço + sinergias) */
  function propValue(E, S, bot, i) {
    const sq = E.BOARD[i], J = E.Judge; let v = sq.p;
    if (sq.t === 'rail') return v * (1 + 0.2 * owned(S, bot.id).filter((j) => E.BOARD[j].t === 'rail').length);
    if (sq.t === 'util') return v * 0.9;
    const grp = E.GROUPS[sq.g], total = grp.reduce((s, j) => s + E.BOARD[j].p, 0), mine = cnt(S, E, sq.g, bot.id);
    v *= 1 + 0.15 * mine;
    const others = grp.filter((j) => j !== i);
    if (others.every((j) => S.props[j].owner === bot.id)) v += (J.GBONUS[sq.g] || 0.9) * total;
    else {
      const o = S.props[others[0]].owner;
      if (o && o !== bot.id && others.every((j) => S.props[j].owner === o)) v += 0.5 * (J.GBONUS[sq.g] || 0.9) * total; /* tirar o monopólio a um rival */
    }
    return v;
  }

  /* -------- avaliar uma proposta recebida (de bot ou de humano) */
  function evalIncoming(E, S, bot, sty, t) {
    const J = E.Judge;
    const rv = J.reviewTrade(E, S, t);
    const an = J.analyzeTrade(E, S, t.from, t.to, t.give, t.get);
    let thr = sty.accept; const dist = J.distress(S, bot.id);
    if (dist.is && bot.cash < 100) thr *= 0.85;
    if (an.sA > 0) thr = Math.max(thr, 1.3); /* não oferece um monopólio ao rival sem grande compensação */
    let why = '';
    if (rv.level === 'veto') return { ok: false, an, thr, why: 'o Juiz Digital vetaria isto' };
    if (bot.cash - t.get.cash + t.give.cash < sty.res * 0.4) return { ok: false, an, thr, why: 'ficaria sem dinheiro de reserva' };
    if (an.rB < thr) why = an.sA > 0 ? 'estaria a dar-te uma cor completa sem compensação suficiente' : 'recebo só ' + Math.round(an.rB * 100) + '% do que dou';
    return { ok: an.rB >= thr, an, thr, why };
  }

  /* contraproposta: pede mais dinheiro ao proponente até o negócio servir ao bot */
  function counterOffer(E, S, bot, sty, t, r) {
    const P = E.byId(S, t.from), J = E.Judge; if (!P || P.bk || r.an.rB < 0.6) return null;
    for (let x = 25; x <= 500; x += 25) {
      const give = { cash: t.get.cash, props: t.get.props.slice(), jc: t.get.jc };
      const get = { cash: t.give.cash + x, props: t.give.props.slice(), jc: t.give.jc };
      if (get.cash > E.avail(S, P) - 20) return null;
      const c = { from: bot.id, to: P.id, give, get };
      if (E.validTrade(S, c)) return null;
      const an = J.analyzeTrade(E, S, bot.id, P.id, give, get);
      if (an.rA >= r.thr && an.rB >= 0.85) { if (J.reviewTrade(E, S, c).level === 'veto') return null; return { type: 'trade', to: P.id, give, get }; }
    }
    return null;
  }

  /* -------- gerar propostas (vários tipos) */
  function candidates(E, S, bot, sty, mem) {
    const J = E.Judge, B = E.BOARD, mine = owned(S, bot.id), out = [];
    mem.tried = mem.tried || {};
    const live = S.players.filter((p) => !p.bk && p.id !== bot.id);
    const sentTo = (to) => S.trades.some((t) => t.from === bot.id && t.to === to);
    const hot = new Set(); S.deals.forEach((d) => { if (S.round - d.round < 5) [...d.give.props, ...d.get.props].forEach((i) => hot.add(i)); });
    const mineVal = (j) => B[j].p * (B[j].g && cnt(S, E, B[j].g, bot.id) >= 2 ? 1.2 : 0.85); /* quanto me custa perder uma minha */
    const loose = (j) => { const g = B[j].g; return !g || cnt(S, E, g, bot.id) < 2; }; /* propriedade que não me faz falta */
    function consider(to, give, get, base, minRB) {
      const key = to + '|' + JSON.stringify(give) + '|' + JSON.stringify(get);
      if (mem.tried[key] === S.round || sentTo(to)) return false;
      if ([...give.props, ...get.props].some((i) => hot.has(i))) return false; /* já mudou de mãos há pouco: evita troca-troca em circuito */
      const t = { from: bot.id, to, give, get };
      if (E.validTrade(S, t)) return false;
      if (J.reviewTrade(E, S, t).level === 'veto') return false;
      const an = J.analyzeTrade(E, S, bot.id, to, give, get);
      /* justo para o outro (valor de mercado >= 100%; mais se lhe dou uma cor completa) e vantajoso para MIM pela minha valorização */
      if (an.rB < (an.sA > 0 ? 1.35 : minRB || 1.1)) return false;
      const vGet = get.cash + get.props.reduce((a, i) => a + propValue(E, S, bot, i), 0);
      const vGive = give.cash + give.props.reduce((a, j) => a + mineVal(j), 0);
      if (vGet < 1.25 * vGive) return false;
      out.push({ score: base + (vGet / Math.max(vGive, 1)) * 30 - give.cash / 25, a: { type: 'trade', to, give, get }, key });
      return true;
    }
    /* cash mínimo para o negócio servir ao outro lado */
    function pay(to, giveProps, getProps, base) {
      for (let c = 0; c <= 40; c++) {
        const cash = c * 25; if (cash > E.avail(S, bot) - sty.res) return;
        if (consider(to, { cash, props: giveProps, jc: 0 }, { cash: 0, props: getProps, jc: 0 }, base)) return;
      }
    }
    for (const g of Object.keys(E.GROUPS)) {
      const grp = E.GROUPS[g]; if (grp.some((i) => S.props[i].houses > 0)) continue;
      const mc = cnt(S, E, g, bot.id), missing = grp.filter((i) => S.props[i].owner !== bot.id);
      if (mc >= 1 && B[grp[0]].t === 'prop') {
        /* 1. completar uma cor (a dinheiro ou trocando uma propriedade minha que não preciso) */
        if (missing.length === 1 && S.props[missing[0]].owner) {
          const X = S.props[missing[0]].owner;
          for (const j of [null].concat(mine.filter(loose).slice(0, 8))) pay(X, j === null ? [] : [j], [missing[0]], 100 + (PRIO[g] || 1) * 5);
        }
        /* 2. pacote: as duas que me faltam, do mesmo dono */
        if (missing.length === 2) {
          const o = S.props[missing[0]].owner;
          if (o && o === S.props[missing[1]].owner) pay(o, [], missing, 70 + (PRIO[g] || 1) * 4);
        }
        /* 3. trocar uma que me falta por uma minha solta (consolidar) */
        for (const i of missing) {
          const X = S.props[i].owner; if (!X) continue;
          for (const j of mine.filter(loose).slice(0, 8)) {
            if (B[j].g === g) continue;
            const diff = B[i].p - B[j].p;
            consider(X, { cash: diff > 0 ? r25(diff * 1.1) : 0, props: [j], jc: 0 }, { cash: diff < 0 ? r25(-diff * 0.8) : 0, props: [i], jc: 0 }, 50 + (PRIO[g] || 1) * 3);
          }
        }
      }
    }
    /* 4. linhas e serviços: juntar o conjunto */
    for (const group of [E.RAILS, E.UTILS]) {
      const mc = group.filter((i) => S.props[i].owner === bot.id).length;
      if (!mc) continue;
      for (const i of group) { const X = S.props[i].owner; if (X && X !== bot.id) pay(X, [], [i], 40 + mc * 8); }
    }
    /* 5. vender uma propriedade solta a quem a quer (pede o máximo que o Juiz acha justo) */
    for (const j of mine.filter(loose).slice(0, 6)) {
      for (const p of live) {
        if (p.cash < B[j].p * 1.1) continue;
        for (const m of [1.15, 1.1, 1.05, 1.0]) {
          const ask = r10(B[j].p * m); if (ask > p.cash - 50) continue;
          if (consider(p.id, { cash: 0, props: [j], jc: 0 }, { cash: ask, props: [], jc: 0 }, 30 + m * 10, 1.05)) break;
        }
      }
    }
    return out.sort((a, b) => b.score - a.score);
  }

  /* -------- gestão no fim da jogada */
  function manage(E, S, bot, sty, mem) {
    const B = E.BOARD, myProps = owned(S, bot.id), loans = S.loans.filter((l) => l.borrower === bot.id);
    for (const i of S.seized || []) {
      if (S.props[i].owner === null && !S.auction && !S.debts.length && bot.cash - B[i].p >= sty.res && propValue(E, S, bot, i) * sty.aggr >= B[i].p) return { type: 'buySeized', sq: i };
    }
    for (const i of myProps) if (S.props[i].mort && bot.cash > sty.res + 400 + E.unmortCost(i)) return { type: 'unmortgage', sq: i };
    const groups = Object.keys(E.GROUPS).filter((g) => B[E.GROUPS[g][0]].t === 'prop' && E.ownsGroup(S, bot.id, g)).sort((a, b) => (PRIO[b] || 0) - (PRIO[a] || 0));
    for (const g of groups) {
      const order = E.GROUPS[g].slice().sort((a, b) => S.props[a].houses - S.props[b].houses);
      for (const i of order) if (bot.cash - B[i].h >= sty.build && !E.canBuild(S, bot, i)) return { type: 'build', sq: i };
    }
    if (loans.length && bot.cash > 1500) { const L = loans.slice().sort((a, b) => b.rate - a.rate).find((l) => l.rem <= bot.cash - 900); if (L) return { type: 'repay', id: L.id }; }
    const owed = loans.filter((l) => l.lender === 'bank').reduce((s, l) => s + l.rem, 0);
    if (groups.length && loans.length < 2 && owed < 800 && bot.cash < sty.build + 150 && S.round >= 3 && mem.loanRound !== S.round) {
      const rich = Object.assign({}, bot, { cash: 99999 });
      if (groups.some((x) => E.GROUPS[x].some((i) => !E.canBuild(S, rich, i)))) { mem.loanRound = S.round; return { type: 'loanBank', amount: 300, n: 8, pen: 'neg' }; }
    }
    /* trocas: várias por ronda (1 a 3 conforme o estilo), logo desde a 1.ª ronda */
    mem.tc = mem.tc || {};
    if ((mem.tc[S.round] || 0) < sty.trade && S.trades.filter((t) => t.from === bot.id).length < 3) {
      mem.tc[S.round] = (mem.tc[S.round] || 0) + 1;
      const best = candidates(E, S, bot, sty, mem)[0];
      if (best) { mem.tried[best.key] = S.round; mem.sent = mem.sent || {}; mem.sent[S.tid + 1] = S.round; return best.a; }
    }
    return null;
  }

  /* -------- levantar dinheiro quando há dívida */
  function raise(E, S, bot) {
    const mine = owned(S, bot.id), B = E.BOARD;
    const keep = (i) => (B[i].g && E.ownsGroup(S, bot.id, B[i].g) ? 100 : 0) + (PRIO[B[i].g] || 0) * 10 + B[i].p / 100;
    const built = mine.filter((i) => S.props[i].houses > 0 && !E.canSell(S, bot, i)).sort((a, b) => keep(a) - keep(b));
    if (built.length) return { type: 'sell', sq: built[0] };
    const mort = mine.filter((i) => !S.props[i].mort && !(B[i].g && E.groupBuilt(S, B[i].g))).sort((a, b) => keep(a) - keep(b));
    if (mort.length) return { type: 'mortgage', sq: mort[0] };
    return { type: 'bankrupt' };
  }

  /* -------- um passo */
  function step(E, S, bot, mem) {
    if (S.phase !== 'play' || bot.bk) return null;
    const sty = STY[bot.style] || STY.equilibrado, T = S.turn, J = E.Judge, B = E.BOARD;
    const sig = S.cur + '|' + T.phase + '|' + T.seq + '|' + S.debts.length + '|' + (S.auction ? S.auction.bid : '-') + '|' + bot.cash;
    if (mem.sig !== sig) { mem.sig = sig; mem.n = 0; }
    if (++mem.n > 24) return T.phase === 'end' && E.actorOf(S).id === bot.id ? { type: 'endTurn' } : null;

    /* mensagens/contrapropostas em fila (só valem na mesma ronda) */
    while (mem.q && mem.q.length) { const q = mem.q.shift(); if (q.round === S.round) return q.a; }

    if (S.case && S.case.phase === 'hearing' && S.case.accused.includes(bot.id) && !S.case.defs[bot.id]) return { type: 'defend', text: pick(E, DEFENSES) };

    if (S.auction) {
      const A = S.auction;
      if (A.pass.includes(bot.id) || A.bidder === bot.id) return null;
      const maxBid = Math.min(propValue(E, S, bot, A.sq) * sty.aggr, bot.cash - sty.res * 0.5);
      const next = A.bid + (A.bid < 100 ? 10 : A.bid < 300 ? 20 : 30);
      if (next <= maxBid) return { type: 'bid', amount: next };
      return { type: 'pass' };
    }

    /* propostas recebidas (de bots ou de humanos): decide, explica no chat e, se estiver perto, contrapropõe */
    for (const t of S.trades.filter((x) => x.to === bot.id)) {
      const r = evalIncoming(E, S, bot, sty, t), who = nm(S, t.from);
      mem.q = mem.q || [];
      const human = !E.byId(S, t.from).bot;
      if (r.ok) { if (human) mem.q.push({ round: S.round, a: { type: 'chat', text: who + ': ' + pick(E, YES) } }); return { type: 'tradeYes', id: t.id }; }
      const counter = human ? counterOffer(E, S, bot, sty, t, r) : null;
      if (human) mem.q.push({ round: S.round, a: { type: 'chat', text: who + ', recusei: ' + r.why + '.' + (counter ? ' Faço uma contraproposta: dou ' + sideTxt(E, counter.give) + ' e quero ' + sideTxt(E, counter.get) + '.' : '') } });
      if (counter) mem.q.push({ round: S.round, a: counter });
      return { type: 'tradeNo', id: t.id };
    }
    for (const r of S.lreq.filter((x) => x.to === bot.id)) {
      const b = E.byId(S, r.from);
      const wealth = b ? b.cash + owned(S, b.id).reduce((s, i) => s + B[i].p / 2, 0) : 0;
      const ok = b && !b.bk && r.rate >= 10 && r.rate <= J.P.usury && r.n <= 12 && bot.cash - r.amount >= sty.res + 150 && wealth >= r.amount * 1.5 && E.rand() < 0.6 * sty.lend;
      return { type: ok ? 'loanYes' : 'loanNo', id: r.id };
    }
    for (const t of S.trades.filter((x) => x.from === bot.id)) if (mem.sent && mem.sent[t.id] && S.round - mem.sent[t.id] >= 2) return { type: 'tradeNo', id: t.id };

    if (!S.case && S.deals.length) {
      const d = S.deals[S.deals.length - 1];
      mem.rep = mem.rep || {};
      if (!d.rep && !mem.rep[d.id] && d.a !== bot.id && d.b !== bot.id) {
        mem.rep[d.id] = 1;
        if (d.an && d.an.flags.some((f) => ['SHAM', 'GIFT', 'PREDATION', 'EVASION'].includes(f)) && E.rand() < 0.5) return { type: 'report', deal: d.id, reason: 'Troca suspeita: valores muito desiguais.' };
      }
    }

    const actor = E.actorOf(S);
    if (!actor || actor.id !== bot.id) return null;
    switch (T.phase) {
      case 'roll':
        if (bot.jail && bot.jc.length) return { type: 'useJail' };
        if (bot.jail && bot.cash > 450) return { type: 'payJail' };
        return { type: 'roll' };
      case 'buy': {
        const sq = B[bot.pos], v = propValue(E, S, bot, bot.pos) * sty.aggr;
        const completes = v > sq.p * 1.6;
        if (bot.cash >= sq.p && (bot.cash - sq.p >= sty.res || completes) && v >= sq.p * 0.9) return { type: 'buy' };
        return { type: 'decline' };
      }
      case 'debt': return S.debts[0] && S.debts[0].pid === bot.id ? raise(E, S, bot) : null;
      case 'end': return manage(E, S, bot, sty, mem) || { type: 'endTurn' };
    }
    return null;
  }

  const api = { step, STY, propValue, candidates, evalIncoming, names: Object.keys(STY) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Bots = api;
})(typeof window !== 'undefined' ? window : this);
