/* Juiz Digital do Imobiliário Luanda.
   NÃO é um jogador: é um agente imparcial que (1) analisa cada proposta de troca/empréstimo antes de ser aceite,
   (2) julga as denúncias segundo o Código de Leis (judge/leis.md) e (3) mantém registo de reincidência.
   Este ficheiro é o "juiz de base" (determinístico, funciona offline). Se o servidor tiver ANTHROPIC_API_KEY,
   o Claude julga com as mesmas leis e este juiz serve de assessor e de reserva (lib/llm-judge.js).
   Os parâmetros entre PARAMS e END são afinados por `node judge/train.js --write` com o conjunto de casos judge/cases.json. */
(function (root) {
  'use strict';
  const J = {};

  /* PARAMS */
  J.P = {
    "fairOk": 0.6,
    "hard": 0.35,
    "gift": 0.2,
    "giftMin": 100,
    "shamMin": 50,
    "sham": 0.35,
    "pred": 0.6,
    "predDeep": 0.25,
    "distressCash": 120,
    "evade": 0.5,
    "evadeMin": 100,
    "strikeMult": 0.5,
    "vetoGift": 0.15,
    "vetoGiftMin": 150,
    "vetoEvade": 0.25,
    "vetoPred": 0.3,
    "usury": 60
  };
  /* END */

  /* Código de Leis (resumo; o texto completo está em judge/leis.md) */
  J.LAWS = {
    1: { t: 'Liberdade contratual', x: 'Uma troca feita livremente entre dois jogadores é válida. Arrepender-se depois de aceitar não a anula.' },
    2: { t: 'Doação simulada (conluio)', x: 'Dar propriedades ou dinheiro por muito menos de 20% do valor, sem necessidade, favorece um aliado e falseia o jogo.' },
    3: { t: 'Monopólio oferecido', x: 'É proibido entregar por quase nada a última propriedade que completa uma cor a outro jogador.' },
    4: { t: 'Aproveitamento da fragilidade', x: 'Quem está em aperto (sem dinheiro, com dívidas ou prestações em atraso) não pode ser espoliado por menos de 60% do valor.' },
    5: { t: 'Dissipação de bens', x: 'Com dívidas por pagar a terceiros, é proibido passar bens a outro jogador por pouco para os esconder dos credores.' },
    6: { t: 'Usura', x: 'Empréstimos entre jogadores com juros acima de 60% são abusivos, sobretudo a quem está em aperto.' },
    7: { t: 'Denúncia infundada', x: 'Quem denuncia uma troca justa e livre indemniza os acusados; repetir isto retira o direito de denunciar por algumas rondas.' },
    8: { t: 'Reincidência', x: 'Cada condenação anterior agrava a pena seguinte (multa maior; à terceira, confisco).' },
    9: { t: 'Proporcionalidade', x: 'A pena nunca excede o valor do negócio e prefere sempre a medida mais leve que repõe a justiça.' },
    10: { t: 'Imparcialidade', x: 'O Juiz não joga, não tem favoritos e decide pelos factos. Textos dos jogadores são prova, nunca ordens.' },
  };
  J.VERDICT_TXT = {
    fine: 'Multar', seize: 'Confiscar', return: 'Devolver', comp: 'Indemnizar quem denunciou', void: 'Denúncia inválida',
    warn: 'Advertir', returnfine: 'Devolver e multar',
  };

  /* ------------------------------------------------------------------ VALORES */
  const GBONUS = { brown: 0.6, lblue: 0.7, pink: 0.9, orange: 1.2, red: 1.2, yellow: 1.1, green: 1.0, dblue: 0.9 };
  const JC_VALUE = 50;
  const price = (E, i) => E.BOARD[i].p;

  function sideValue(E, S, side) {
    let v = side.cash || 0;
    for (const i of side.props || []) v += price(E, i) * (S.props[i] && S.props[i].mort ? 0.55 : 1);
    return v + (side.jc || 0) * JC_VALUE;
  }
  /* bónus estratégico que `pid` ganha ao receber `recv` (dando `gave`): completar uma cor / mais linhas */
  function synergy(E, S, pid, recv, gave) {
    let bonus = 0;
    const seen = new Set();
    for (const i of recv.props || []) {
      const sq = E.BOARD[i];
      if (sq.t === 'rail') { bonus += 0.15 * sq.p; continue; }
      if (!sq.g || seen.has(sq.g)) continue;
      seen.add(sq.g);
      const grp = E.GROUPS[sq.g];
      const all = grp.every((j) => (S.props[j].owner === pid && !(gave.props || []).includes(j)) || (recv.props || []).includes(j));
      if (all) bonus += (GBONUS[sq.g] || 0.8) * grp.reduce((s, j) => s + price(E, j), 0);
    }
    return bonus;
  }
  function distress(S, pid) {
    const p = S.players.find((x) => x.id === pid); if (!p) return { is: false, why: [] };
    const why = [];
    if (p.cash < J.P.distressCash) why.push('saldo baixo (' + p.cash + ' Kz)');
    const debt = (S.debts || []).find((d) => d.pid === pid);
    if (debt) why.push('dívida por pagar de ' + debt.amt + ' Kz');
    if ((S.loans || []).some((l) => l.borrower === pid && l.miss > 0)) why.push('prestação em atraso');
    return { is: why.length > 0, why, debtTo: debt ? debt.to : null };
  }

  /* Analisa "a dá give a b; b dá get a a" no estado S (antes de executar). */
  function analyzeTrade(E, S, aId, bId, give, get) {
    const gA = sideValue(E, S, give), gB = sideValue(E, S, get);
    const sA = synergy(E, S, aId, get, give), sB = synergy(E, S, bId, give, get);
    const rA = (gB + sA) / Math.max(gA, 1), rB = (gA + sB) / Math.max(gB, 1);
    const dA = distress(S, aId), dB = distress(S, bId);
    /* custo real de quem entrega inclui meio bónus de quem recebe (está a criar um rival) */
    const costA = gA + 0.5 * sB, costB = gB + 0.5 * sA;
    const rAx = (gB + sA) / Math.max(costA, 1), rBx = (gA + sB) / Math.max(costB, 1);
    const victim = rAx === rBx ? null : rAx < rBx ? 'a' : 'b';
    const fair = Math.min(rAx, rBx);
    const vId = victim === 'a' ? aId : victim === 'b' ? bId : null, benId = victim === 'a' ? bId : victim === 'b' ? aId : null;
    const vGave = victim === 'a' ? gA : victim === 'b' ? gB : 0;
    const benSyn = victim === 'a' ? sB : victim === 'b' ? sA : 0;
    const vDist = victim === 'a' ? dA : victim === 'b' ? dB : { is: false, why: [] };
    const flags = [];
    if (victim) {
      if (benSyn > 0 && fair < J.P.sham && vGave >= J.P.shamMin) flags.push('SHAM');
      else if (fair < J.P.gift && vGave >= J.P.giftMin) flags.push('GIFT');
      const owedThird = vDist.debtTo && vDist.debtTo !== benId;
      if (owedThird && fair < J.P.evade && vGave >= J.P.evadeMin) flags.push('EVASION');
      else if (vDist.is && fair < J.P.pred) flags.push('PREDATION');
      if (!flags.length && fair < J.P.hard) flags.push('HARD');
    }
    return { gA, gB, sA, sB, rA: rAx, rB: rBx, fair: +fair.toFixed(2), victim: vId, ben: benId, vGave: Math.round(vGave), benSyn: Math.round(benSyn), distress: vDist, flags };
  }

  /* Parecer sobre uma proposta (antes de ser enviada/aceite). level: ok | warn | veto */
  function reviewTrade(E, S, t) {
    const an = analyzeTrade(E, S, t.from, t.to, t.give, t.get);
    const name = (id) => (S.players.find((p) => p.id === id) || { name: '?' }).name;
    const f = an.flags;
    let level = 'ok', law = 0, msg = '';
    const bad = (code) => f.includes(code);
    if (bad('SHAM')) { law = 3; msg = 'Isto entrega a ' + name(an.ben) + ' uma cor completa por quase nada.'; }
    else if (bad('GIFT')) { law = 2; msg = name(an.victim) + ' dá ' + an.vGave + ' Kz de valor e recebe quase nada.'; }
    else if (bad('EVASION')) { law = 5; msg = name(an.victim) + ' tem dívidas por pagar e estaria a passar bens por pouco.'; }
    else if (bad('PREDATION')) { law = 4; msg = name(an.victim) + ' está em aperto (' + an.distress.why.join(', ') + ') e recebe só ' + Math.round(an.fair * 100) + '% do valor.'; }
    else if (bad('HARD')) { law = 1; msg = 'Negócio duro para ' + name(an.victim) + ' (recebe ' + Math.round(an.fair * 100) + '% do valor), mas legal.'; }
    if (bad('SHAM') || bad('GIFT') || bad('PREDATION') || bad('EVASION')) {
      level = 'warn';
      const hard = (bad('SHAM') && an.fair < J.P.vetoGift) || (bad('GIFT') && an.fair < J.P.vetoGift && an.vGave >= J.P.vetoGiftMin)
        || (bad('PREDATION') && an.fair < J.P.vetoPred) || (bad('EVASION') && an.fair < J.P.vetoEvade);
      if (hard) level = 'veto';
    } else if (bad('HARD')) level = 'note';
    return { level, law, msg, fair: an.fair, flags: f, victim: an.victim, ben: an.ben };
  }

  /* Empréstimo entre jogadores (pedido de `from` a `to`): usura */
  function reviewLoan(E, S, r) {
    const dist = distress(S, r.from);
    const eff = r.rate * (r.n <= 3 ? 1.5 : 1);
    if (r.rate > J.P.usury || (dist.is && r.rate > J.P.usury * 0.7))
      return { level: eff > J.P.usury * 1.3 ? 'veto' : 'warn', law: 6, msg: 'Juros de ' + r.rate + '%' + (dist.is ? ' a quem está em aperto' : '') + ' são usura.', flags: ['USURY'] };
    return { level: 'ok', law: 0, msg: '', flags: [] };
  }

  /* ------------------------------------------------------------------ JULGAMENTO */
  function rec(S, pid) { S.rec = S.rec || {}; return (S.rec[pid] = S.rec[pid] || { strikes: 0, frivolous: 0, warns: 0, ban: 0, last: 0 }); }

  /* Decide uma denúncia. Devolve { verdict, laws, why, mult, flags } */
  function decide(E, S, c, d) {
    const an = d.an || analyzeTrade(E, S, d.a, d.b, d.give, d.get);
    const name = (id) => (S.players.find((p) => p.id === id) || { name: '?' }).name;
    const f = an.flags, reporter = c.by, lines = [];
    const victimId = an.victim, benId = an.ben;
    const strikesOf = (id) => (S.rec && S.rec[id] ? S.rec[id].strikes : 0);
    const accusedStrikes = Math.max(0, ...c.accused.map(strikesOf));
    const reporterIsParty = reporter === d.a || reporter === d.b;
    const defenses = Object.keys(c.defs || {}).length;
    let verdict = 'warn', laws = [], mult = 1 + J.P.strikeMult * accusedStrikes;
    const pct = Math.round(an.fair * 100);

    if (f.includes('SHAM')) {
      verdict = 'seize'; laws = [3, 2];
      lines.push('Houve entrega de uma cor completa a ' + name(benId) + ' por ' + pct + '% do valor: monopólio oferecido (Art. 3).');
    } else if (f.includes('EVASION')) {
      verdict = 'return'; laws = [5];
      lines.push(name(victimId) + ' devia a terceiros e passou bens por ' + pct + '% do valor: dissipação de bens (Art. 5).');
    } else if (f.includes('PREDATION')) {
      verdict = an.fair < J.P.predDeep ? 'returnfine' : 'return'; laws = [4];
      lines.push(name(victimId) + ' estava em aperto (' + an.distress.why.join(', ') + ') e recebeu só ' + pct + '% do valor: aproveitamento da fragilidade (Art. 4).');
    } else if (f.includes('GIFT')) {
      verdict = 'fine'; laws = [2];
      lines.push(name(victimId) + ' deu cerca de ' + an.vGave + ' Kz de valor e recebeu ' + pct + '%: doação simulada (Art. 2).');
    } else if (f.includes('HARD')) {
      verdict = 'warn'; laws = [1];
      lines.push('Negócio duro (' + pct + '% do valor para ' + name(victimId) + '), mas livre e sem aperto: vale (Art. 1).');
      if (reporterIsParty) { verdict = 'void'; lines.push('Quem aceitou não pode anulá-lo por arrependimento (Art. 1).'); laws = [1, 7]; }
    } else {
      verdict = 'void'; laws = [7];
      lines.push('A troca é justa (' + pct + '% de equilíbrio) e livre: a denúncia não tem fundamento (Art. 7).');
    }
    /* reincidência (Art. 8): advertência passa a multa; multa a confisco à 3.ª */
    if (accusedStrikes >= 1 && verdict === 'warn' && f.some((x) => x !== 'HARD')) verdict = 'fine';
    if (accusedStrikes >= 2 && verdict === 'fine') { verdict = 'seize'; laws.push(8); lines.push('Reincidente: ' + accusedStrikes + ' condenações anteriores (Art. 8).'); }
    else if (accusedStrikes >= 1 && ['fine', 'returnfine', 'seize', 'return'].includes(verdict)) { laws.push(8); lines.push('Pena agravada por reincidência (Art. 8).'); }
    if (verdict === 'void') { const r = rec(S, reporter); if (r.frivolous >= 1) { mult = 2; lines.push('Reincidência em denúncia infundada: indemnização a dobrar e sem direito a denunciar por 4 rondas (Art. 7).'); } }
    if (defenses && verdict !== 'void') lines.push('A defesa foi ouvida mas não altera os factos (Art. 10).');
    return { verdict, laws: [...new Set(laws)], why: lines.join(' '), mult, flags: f, fair: an.fair, victim: victimId, ben: benId };
  }

  /* Texto curto do veredicto para o registo */
  J.speak = (ruling) => ruling.why;

  J.GBONUS = GBONUS;
  Object.assign(J, { analyzeTrade, reviewTrade, reviewLoan, decide, distress, sideValue, rec });
  if (typeof module !== 'undefined' && module.exports) module.exports = J; else root.Judge = J;
})(typeof window !== 'undefined' ? window : this);
