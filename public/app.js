'use strict';
/* Imobiliário Luanda - interface e ligação online (WebSocket para o servidor Next.js) */
const E = window.Engine, B = E.BOARD;
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kz = (n) => Number(n).toLocaleString('pt-PT') + ' Kz';
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

let S = null, ws = null, roomCode = '', retryT = null, leaving = false, wantCreate = false, attempts = 0, local = false;
let pid = ssGet('imobl_pid') || (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4));
ssSet('imobl_pid', pid);
let myName = lsGet('imobl_name') || '';
let ui = { trade: null, lastSig: '', cardSeq: 0, diceSeq: -1, tab: 'props', shown: {}, hop: {}, hold: 0, dealsN: 0, ang: [[0, 0], [0, 0]], overShown: false };

/* ====================================================================== REDE (WebSocket) */
function setNet(m) { const n = $('#net'); n.textContent = m || ''; n.classList.toggle('hidden', !m); }
function toast(m, ms) { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), ms || 3200); }
function sess() { ssSet('imobl_sess', JSON.stringify({ code: roomCode })); lsSet('imobl_last', JSON.stringify({ code: roomCode, pid })); }
const wsUrl = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

function enter(create) { wantCreate = !!create; leaving = false; attempts = 0; connect(); }
function connect() {
  clearTimeout(retryT);
  if (leaving) return;
  try { if (ws) { ws.onclose = null; ws.close(); } } catch (e) {}
  setNet(S ? 'Ligação perdida. A reconectar…' : attempts > 1 ? 'A acordar o servidor… pode demorar até 1 minuto' : 'A ligar…');
  const w = (ws = new WebSocket(wsUrl()));
  const wd = setTimeout(() => { if (w.readyState !== 1) { try { w.close(); } catch (e) {} } }, 8000);
  w.onopen = () => {
    clearTimeout(wd); attempts = 0; setNet('');
    w.send(JSON.stringify(wantCreate && !S ? { t: 'create', pid, name: myName } : { t: 'join', code: roomCode, pid, name: myName }));
  };
  w.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.t === 's') { S = m.s; roomCode = S.code; wantCreate = false; sess(); render(); }
    else if (m.t === 'clk' && S) { S.tl = m.tl; if (S.auction) S.auction.left = m.left; updClock(); }
    else if (m.t === 'err') { toast(m.m, 4500); if (m.fatal) leaveRoom(); }
  };
  w.onclose = () => { clearTimeout(wd); if (w === ws) retry(); };
  w.onerror = () => {};
}
function retry() {
  if (leaving) return;
  attempts++;
  if (!S && attempts > 25) { setNet(''); toast('Não foi possível ligar ao servidor. Tenta de novo daqui a pouco.', 6000); leaveRoom(); return; }
  setNet(S ? 'Ligação perdida. A reconectar…' : attempts > 1 ? 'A acordar o servidor… pode demorar até 1 minuto' : 'A ligar…');
  clearTimeout(retryT); retryT = setTimeout(connect, Math.min(1000 + attempts * 500, 4000));
}
function dispatch(a) {
  if (local) { const err = E.act(S, pid, a); if (err) toast(err); ui.lastSig = ''; render(); return; }
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'act', a }));
  else toast('Sem ligação ao servidor.');
}
function leaveRoom() {
  leaving = true; clearTimeout(retryT);
  try { if (ws) { ws.onclose = null; ws.close(); } } catch (e) {}
  ws = null; S = null; roomCode = '';
  ssSet('imobl_sess', ''); lsSet('imobl_last', ''); setNet(''); goHome();
}
function goHome() {
  S = null; ui.lastSig = ''; ui.shown = {}; ui.diceSeq = -1; ui.cardSeq = 0; ui.dealsN = 0; ui.overShown = false;
  $('#game').innerHTML = '';
  ['lobby', 'game', 'modal', 'cardpop'].forEach((i) => $('#' + i).classList.add('hidden'));
  $('#home').classList.remove('hidden');
  let last = null; try { last = JSON.parse(lsGet('imobl_last') || 'null'); } catch (e) {}
  const b = $('#bResume'); b.classList.toggle('hidden', !(last && last.code)); if (last && last.code) b.textContent = '↩️ Voltar à sala ' + last.code;
}

/* ====================================================================== HELPERS */
const pcol = (p) => E.PCOL[p.token];
const tokenOf = (p) => E.TOKENS[p.token];
const me = () => S && E.byId(S, pid);
const sqPos = (i) => (i <= 10 ? { r: 11, c: 11 - i } : i <= 20 ? { r: 21 - i, c: 1 } : i <= 30 ? { r: 1, c: i - 19 } : { r: i - 29, c: 11 });
const sideOf = (i) => (i > 0 && i < 10 ? 'b' : i > 10 && i < 20 ? 'l' : i > 20 && i < 30 ? 't' : i > 30 ? 'r' : 'c');
const icon = (s) => ({ go: '➡️', chance: '❓', cc: '📦', tax: '💰', rail: '🚂', util: s.n.startsWith('ENDE') ? '💡' : '🚰', jail: '🔒', park: '🅿️', gojail: '👮' }[s.t] || '');
const propColor = (i) => (B[i].g ? E.GC[B[i].g] : B[i].t === 'rail' ? '#555' : '#e8e8e8');
const nameOf = (id) => (id === 'bank' ? 'o Banco' : (E.byId(S, id) || { name: '?' }).name);
const penTxt = (p) => (p === 'prop' ? 'confisco de propriedade' : 'saldo negativo');
const sideDesc = (s) => {
  const parts = [];
  if (s.cash) parts.push(kz(s.cash));
  s.props.forEach((i) => parts.push(B[i].n));
  if (s.jc) parts.push(s.jc + '× carta Sai da Cadeia');
  return parts.join(', ') || 'nada';
};
const colPct = (k) => { const w = [1.55, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.55]; let a = 0; for (let i = 0; i < k; i++) a += w[i]; return ((a + w[k] / 2) / 12.1) * 100; };

/* ====================================================================== RENDER */
function render() {
  if (!S) return;
  $('#home').classList.add('hidden');
  const sig = JSON.stringify(S, (k, v) => (k === 'left' || k === 'tl' ? undefined : v)) + '|' + pid + '|' + ui.tab;
  if (sig === ui.lastSig) { updClock(); return; }
  ui.lastSig = sig;
  if (S.phase === 'lobby') { $('#game').classList.add('hidden'); $('#lobby').classList.remove('hidden'); renderLobby(); }
  else { $('#lobby').classList.add('hidden'); $('#game').classList.remove('hidden'); renderGame(); }
}

function updClock() {
  const el = $('#aucLeft'); if (el && S.auction) el.textContent = S.auction.left + 's';
  const t = $('#tlv'); if (!t) return;
  const on = S.phase === 'play' && S.settings.turnTime && S.turn.phase !== 'auction' && S.tl > 0;
  t.classList.toggle('hidden', !on);
  if (on) { t.textContent = '⏱ ' + S.tl + 's'; t.classList.toggle('low', S.tl <= 10); }
}
function renderLobby() {
  const isHost = pid === S.hostPid;
  const link = location.origin + location.pathname + '?sala=' + S.code;
  const tk = E.TOKENS.map((t, i) => {
    const takenBy = S.players.find((p) => p.token === i), mine = takenBy && takenBy.id === pid;
    return `<button class="${mine ? 'sel' : ''}" data-act="token" data-token="${i}" ${takenBy && !mine ? 'disabled' : ''}>${t}</button>`;
  }).join('');
  const pl = S.players.map((p) => `<div class="pl"><span class="tk">${tokenOf(p)}</span><b style="flex:1">${esc(p.name)}${p.id === S.hostPid ? ' 👑' : ''}${p.id === pid ? ' (tu)' : ''}</b><span class="dot" style="background:${p.connected ? '#2fb26a' : '#777'}"></span>${isHost && p.id !== pid ? `<button class="sm ghost" data-act="kick" data-pid="${p.id}">Expulsar</button>` : ''}</div>`).join('');
  $('#lobby').innerHTML = `
  <div class="hero"><div class="logo">🏠🎩</div><h1>SALA DE ESPERA</h1></div>
  <div class="card"><h2>Código da sala</h2><div class="code">${S.code}</div>
    <p class="hint">Os amigos abrem o jogo e entram com este código, ou usam directamente o link:</p>
    <div class="row"><input readonly value="${esc(link)}" id="lnk" onclick="this.select()"><button class="alt" data-act="copy">Copiar link</button></div></div>
  <div class="card"><h2>Jogadores (${S.players.length}/12)</h2><div class="plist">${pl}</div></div>
  <div class="card"><h2>A tua peça</h2><div class="tokens">${tk}</div></div>
  ${isHost ? `<div class="card"><h2>Regras da casa</h2>
    <div class="row"><label>Dinheiro inicial <input type="number" id="setCash" value="${S.settings.cash}" min="500" max="10000" step="100" style="width:110px"></label>
    <label><input type="checkbox" id="setPot" ${S.settings.pot ? 'checked' : ''}> Multas e impostos acumulam no Parque Gratuito</label>
    <label>Tempo por jogada <select id="setTime">${[[0, 'Sem limite'], [30, '30 s'], [45, '45 s'], [60, '60 s'], [90, '90 s'], [120, '2 min']].map(([v, l]) => `<option value="${v}" ${S.settings.turnTime === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <p class="hint">Se alguém demorar mais que o tempo, o jogo joga a vez por essa pessoa; depois de 2 vezes seguidas passa a modo automático até voltar a clicar.</p>
    <p class="hint">Por defeito segue as regras oficiais: 1500 Kz iniciais e o Parque Gratuito não paga nada.</p></div>
    <button class="bigbtn" data-act="start" ${S.players.length < 2 ? 'disabled' : ''}>▶ Começar o jogo</button>
    ${S.players.length < 2 ? '<p class="hint" style="text-align:center">Faltam jogadores (mínimo 2).</p>' : ''}`
  : '<p class="hint" style="text-align:center;font-size:16px">A aguardar que o anfitrião comece o jogo…</p>'}
  <p style="text-align:center"><button class="ghost sm" data-act="leave">Sair da sala</button></p>`;
}

/* ---------- casas do tabuleiro ---------- */
function housesHtml(st) {
  if (!st || !st.houses) return '';
  return st.houses === 5 ? '<i class="hs ho"></i>' : '<i class="hs"></i>'.repeat(st.houses);
}
function squaresHtml() {
  let h = '';
  for (let i = 0; i < 40; i++) {
    const s = B[i], pos = sqPos(i), side = sideOf(i), st = S.props[i];
    const owner = st && st.owner ? E.byId(S, st.owner) : null;
    const price = s.p ? s.p : s.amt ? s.amt : '';
    h += `<div class="sq ${side === 'c' ? 'corner sb' : 's' + side} ${s.t} ${st && st.mort ? 'mort' : ''}" data-sq="${i}" style="grid-row:${pos.r};grid-column:${pos.c}">
      ${s.t === 'prop' ? `<div class="bar" style="--c:${E.GC[s.g]}">${housesHtml(st)}</div>` : ''}
      <div class="body"><div class="nm"><i>${icon(s)}</i>${esc(s.n)}</div>${price ? `<div class="pr">${price}</div>` : ''}</div>
      ${owner ? `<div class="own" style="--o:${pcol(owner)}" title="${esc(owner.name)}"></div>` : ''}</div>`;
  }
  return h;
}

/* ---------- dados 3D ---------- */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const DIEROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
const face = (n, cls) => `<div class="face ${cls}">${PIPS[n].map((p) => `<i class="pip${n === 1 ? ' one' : ''}" style="grid-area:${Math.ceil(p / 3)}/${((p - 1) % 3) + 1}"></i>`).join('')}</div>`;
const dieHtml = (id) => `<div class="dwrap" id="w${id}"><div class="die" id="die${id}">${face(1, 'ff')}${face(6, 'fb')}${face(3, 'fr')}${face(4, 'fl')}${face(2, 'ft')}${face(5, 'fbt')}</div></div>`;
function setDice(vals, animate) {
  vals.forEach((v, i) => {
    const d = $('#die' + i), w = $('#w' + i); if (!d) return;
    const [fx, fy] = DIEROT[v];
    if (!animate) { d.style.transition = 'none'; d.style.transform = `rotateX(${fx}deg) rotateY(${fy}deg)`; ui.ang[i] = [fx, fy]; return; }
    const [cx, cy] = ui.ang[i];
    const tx = fx + 360 * (Math.ceil((cx - fx) / 360) + 2 + i), ty = fy + 360 * (Math.ceil((cy - fy) / 360) + 3 + i);
    d.style.transition = `transform ${1.15 + i * 0.12}s cubic-bezier(.12,.72,.18,1)`;
    d.style.transform = `rotateX(${tx}deg) rotateY(${ty}deg) rotateZ(0deg)`;
    ui.ang[i] = [tx, ty];
    w.classList.remove('throw'); void w.offsetWidth; w.classList.add('throw');
  });
}

/* ---------- peças (movimento casa a casa) ---------- */
function tokenXY(pos, idx, total) {
  const p = sqPos(pos), x = colPct(p.c - 1), y = colPct(p.r - 1);
  if (total === 1) return [x, y];
  const cols = total <= 4 ? 2 : 3, step = 2.5;
  const dx = ((idx % cols) - (cols - 1) / 2) * step, dy = (Math.floor(idx / cols) - (Math.ceil(total / cols) - 1) / 2) * step;
  return [x + dx, y + dy];
}
function placeTokens() {
  const layer = $('#toks'); if (!layer) return;
  const alive = S.players.filter((p) => !p.bk), cur = E.cur(S);
  Array.from(layer.children).forEach((el) => { if (!alive.find((p) => 'tk-' + p.id === el.id)) el.remove(); });
  const groups = {};
  alive.forEach((p) => { const k = ui.shown[p.id]; (groups[k] = groups[k] || []).push(p); });
  alive.forEach((p) => {
    let el = document.getElementById('tk-' + p.id);
    if (!el) { el = document.createElement('div'); el.id = 'tk-' + p.id; el.className = 'tk'; layer.appendChild(el); }
    const g = groups[ui.shown[p.id]], [x, y] = tokenXY(ui.shown[p.id], g.indexOf(p), g.length);
    el.style.left = x + '%'; el.style.top = y + '%'; el.style.background = pcol(p); el.textContent = tokenOf(p); el.title = p.name;
    el.classList.toggle('turn', S.phase === 'play' && p.id === cur.id);
  });
}
function syncTokens() {
  S.players.forEach((p) => {
    if (p.bk) { delete ui.shown[p.id]; return; }
    if (ui.shown[p.id] == null) { ui.shown[p.id] = p.pos; return; }
    if (ui.shown[p.id] === p.pos || ui.hop[p.id]) return;
    const fwd = (p.pos - ui.shown[p.id] + 40) % 40;
    if (fwd > 12 || p.pos === 10 && p.jail) { ui.shown[p.id] = p.pos; return; }
    ui.hop[p.id] = setInterval(() => {
      if (Date.now() < ui.hold) return;
      const target = E.byId(S, p.id) ? E.byId(S, p.id).pos : ui.shown[p.id];
      if (ui.shown[p.id] === target) { clearInterval(ui.hop[p.id]); delete ui.hop[p.id]; return; }
      ui.shown[p.id] = (ui.shown[p.id] + 1) % 40; placeTokens();
    }, 150);
  });
  placeTokens();
}

/* ---------- carta de propriedade ---------- */
function deedHtml(i) {
  const s = B[i], st = S.props[i], owner = st && st.owner ? E.byId(S, st.owner) : null;
  let body = '';
  if (s.t === 'prop') {
    body = `<table><tr><td>Renda</td><td>${kz(s.r[0])}</td></tr><tr><td>Grupo completo (sem casas)</td><td>${kz(s.r[0] * 2)}</td></tr>
    ${[1, 2, 3, 4].map((n) => `<tr><td>Com ${n} casa${n > 1 ? 's' : ''}</td><td>${kz(s.r[n])}</td></tr>`).join('')}
    <tr><td>Com hotel</td><td>${kz(s.r[5])}</td></tr></table><hr><table><tr><td>Custo de cada casa</td><td>${kz(s.h)}</td></tr><tr><td>Custo do hotel</td><td>${kz(s.h)} + 4 casas</td></tr></table>`;
  } else if (s.t === 'rail') body = '<table><tr><td>Renda (1 linha)</td><td>25 Kz</td></tr><tr><td>2 linhas</td><td>50 Kz</td></tr><tr><td>3 linhas</td><td>100 Kz</td></tr><tr><td>4 linhas</td><td>200 Kz</td></tr></table>';
  else if (s.t === 'util') body = '<p>Com 1 companhia: renda = <b>4×</b> os dados.<br>Com as 2: <b>10×</b> os dados.</p>';
  else body = `<p>${s.t === 'tax' ? 'Paga ' + kz(s.amt) + ' ao banco.' : s.t === 'go' ? 'Recebe 200 Kz de cada vez que passas por aqui.' : s.t === 'jail' ? 'Só de visita... ou preso.' : s.t === 'park' ? 'Descansa (nada acontece).' : s.t === 'gojail' ? 'Vais directamente para a Cadeia.' : 'Tira uma carta.'}</p>`;
  const light = ['lblue', 'yellow'].includes(s.g) || !s.g;
  return `<div class="deed"><div class="dh" style="background:${s.g ? E.GC[s.g] : '#e9efe2'};color:${light ? '#111' : '#fff'}">${icon(s)} ${esc(s.n)}</div><div class="db">
    ${s.p ? `<p><b>Preço: ${kz(s.p)}</b> · Hipoteca: ${kz(s.p / 2)}</p>` : ''}${body}
    ${st ? `<p>${owner ? '👤 Dono: <b>' + esc(owner.name) + '</b>' : '🏦 Sem dono'}${st.mort ? ' · <b>HIPOTECADA</b>' : ''}${st.houses ? ' · ' + (st.houses === 5 ? '1 hotel' : st.houses + ' casa(s)') : ''}</p>` : ''}</div></div>`;
}

/* ---------- painéis ---------- */
function actionsHtml() {
  const T = S.turn, c = E.cur(S), m = me(), mine = c.id === pid;
  if (S.phase === 'over') {
    const w = E.byId(S, S.winner);
    return `<div class="win"><div class="big">🏆</div><b>${esc(w.name)}</b> ${tokenOf(w)}<p>venceu o jogo!</p><button data-act="leave">Voltar ao início</button></div>`;
  }
  let h = `<div class="who"><span class="av" style="background:${pcol(c)}">${tokenOf(c)}</span><span>Vez de <b>${esc(c.name)}</b>${mine ? ' <span style="color:var(--gold)">(tu)</span>' : ''}</span></div>`;
  if (m.bk) return h + '<p class="hint">Foste eliminado. Podes continuar a acompanhar o jogo e a conversar.</p>';
  if (m.auto) h += '<div class="box2">🤖 <b>Modo automático</b>: o jogo está a jogar por ti porque demoraste.<div class="acts"><button class="good sm" data-act="back">Retomar o controlo</button></div></div>';
  if (T.phase === 'auction' && S.auction) h += auctionHtml(m);
  else if (T.phase === 'debt' && S.debts.length) {
    const d = S.debts[0], dp = E.byId(S, d.pid), to = d.to === 'bank' ? 'o Banco' : E.byId(S, d.to).name;
    if (d.pid === pid) h += `<p><b>Deves ${kz(d.amt)} a ${esc(to)}</b> (${esc(d.why)}).<br>Tens ${kz(m.cash)}. Vende construções, hipoteca, negoceia ou pede um empréstimo — o pagamento é automático.</p><div class="acts"><button class="alt" data-open="loanBank">🏦 Pedir ao banco</button><button class="ghost" data-act="bankrupt" data-confirm="Declarar falência? Perdes tudo e sais do jogo.">🏳️ Falência</button></div>`;
    else h += `<p>⏳ <b>${esc(dp.name)}</b> deve ${kz(d.amt)} a ${esc(to)} e está a arranjar dinheiro…</p>`;
  } else if (mine) {
    if (T.phase === 'roll') {
      if (m.jail) h += `<p>🔒 Estás na Cadeia (tentativa ${m.jt + 1}/3). Tira um duplo, paga 50 Kz${m.jc.length ? ' ou usa a carta' : ''}.</p><div class="acts"><button class="alt" data-act="payJail" ${m.cash < 50 ? 'disabled' : ''}>Pagar 50 Kz</button>${m.jc.length ? '<button class="alt" data-act="useJail">Usar carta</button>' : ''}</div>`;
      h += `<div class="acts"><button class="bigbtn" data-act="roll">🎲 ${m.jail ? 'Tentar duplo' : T.doubles ? 'Lançar outra vez' : 'Lançar dados'}</button></div>`;
    } else if (T.phase === 'buy') {
      h += deedHtml(m.pos) + `<div class="acts"><button class="good" data-act="buy" ${m.cash < B[m.pos].p ? 'disabled' : ''}>Comprar por ${kz(B[m.pos].p)}</button><button class="alt" data-act="decline">Leilão</button></div>`;
    } else if (T.phase === 'end') h += `<p class="hint">Podes construir, negociar ou pedir empréstimos antes de terminar.</p><div class="acts"><button class="bigbtn" data-act="endTurn">✅ Terminar a vez</button></div>`;
  } else h += `<p class="hint">⏳ A aguardar ${esc(c.name)}…</p>`;
  h += `<div class="acts"><button class="ghost sm" data-open="trade">🤝 Troca</button><button class="ghost sm" data-open="loanBank">🏦 Banco</button><button class="ghost sm" data-open="loanAsk">💸 Pedir a jogador</button><button class="ghost sm" data-open="rules">📖</button></div>`;
  return h;
}
function auctionHtml(m) {
  const A = S.auction, s = B[A.sq], bd = A.bidder ? E.byId(S, A.bidder) : null, passed = A.pass.includes(pid);
  let h = `<div class="box2"><b>🔨 Leilão: ${esc(s.n)}</b> <span style="float:right;font-weight:800;color:var(--red)" id="aucLeft">${A.left}s</span>
    <p style="margin:6px 0">Preço de tabela: ${kz(s.p)}<br>Licitação actual: <b>${A.bid ? kz(A.bid) : '—'}</b>${bd ? ' de ' + esc(bd.name) : ''}</p>`;
  if (passed) h += '<p class="hint">Desististe deste leilão.</p>';
  else {
    h += `<div class="acts">${[10, 50, 100, 500].map((n) => `<button class="alt sm" data-act="bidrel" data-add="${n}" ${A.bid + n > m.cash ? 'disabled' : ''}>+${n}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><input type="number" id="bidAmt" min="${A.bid + 1}" placeholder="valor" style="width:100px"><button class="sm" data-act="bidcustom">Licitar</button><button class="ghost sm" data-act="pass" ${A.bidder === pid ? 'disabled' : ''}>Desistir</button></div>
    <p class="hint">Tens ${kz(m.cash)}. Cada licitação reinicia o relógio.</p>`;
  }
  return h + '</div>';
}
function playersHtml() {
  const isHost = pid === S.hostPid, c = E.cur(S);
  return S.players.map((p) => {
    const owned = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === p.id);
    const chips = owned.map((i) => `<span class="chip ${S.props[i].mort ? 'm' : ''}" data-sq="${i}" title="${esc(B[i].n)}" style="background:${propColor(i)}"></span>`).join('');
    const nl = S.loans.filter((l) => l.borrower === p.id).length;
    return `<div class="pcard ${p.id === c.id && S.phase === 'play' ? 'turn' : ''} ${p.bk ? 'bk' : ''}">
      <div class="av" style="background:${pcol(p)}">${tokenOf(p)}</div>
      <div class="info"><b>${esc(p.name)}${p.id === pid ? ' (tu)' : ''}${p.id === S.hostPid ? ' 👑' : ''}<span class="bdg">${p.jail ? '🔒' : ''}${p.jc.length ? '🎫'.repeat(p.jc.length) : ''}${nl ? '💳' + nl : ''}${p.auto && !p.bk ? '🤖' : ''}${!p.connected && !p.bk ? '📴' : ''}</span></b>
        <span class="cash ${p.cash < 0 ? 'neg' : ''}">${p.bk ? 'Falido' : kz(p.cash)}</span><div class="chips">${chips}</div></div>
      ${isHost && p.id !== pid && !p.bk ? `<button class="sm ghost" data-act="kick" data-pid="${p.id}" data-confirm="Remover ${esc(p.name)} do jogo?">✖</button>` : ''}</div>`;
  }).join('');
}
function bankHtml() {
  return `<div class="bankinfo"><span>🏠 Casas <b>${S.houses}</b></span><span>🏨 Hotéis <b>${S.hotels}</b></span>${S.settings.pot ? `<span>🅿️ <b>${kz(S.pot)}</b></span>` : ''}</div>`;
}
function myPropsHtml() {
  const m = me();
  const mine = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === pid);
  let h = `<p class="hint" style="margin-top:0">Saldo: <b style="color:${m.cash < 0 ? '#ff7b80' : 'var(--gold)'}">${kz(m.cash)}</b></p>`;
  if (!mine.length) return h + '<p class="hint">Ainda não tens propriedades.</p>';
  return h + mine.map((i) => {
    const s = B[i], st = S.props[i];
    const cb = s.t === 'prop' ? E.canBuild(S, m, i) : 'x', cs = s.t === 'prop' ? E.canSell(S, m, i) : 'x';
    const status = (st.mort ? 'Hipotecada' : '') + (st.houses ? (st.mort ? ' · ' : '') + (st.houses === 5 ? '🏨 hotel' : '🏠'.repeat(st.houses)) : '');
    return `<div class="prow"><span class="pc" style="background:${propColor(i)}"></span>
      <div class="pn"><a href="#" data-sq="${i}">${esc(s.n)}</a><small>${status || '&nbsp;'}</small></div>
      ${s.t === 'prop' ? `<button class="good" data-act="build" data-sq="${i}" ${cb ? 'disabled' : ''} title="${esc(cb || 'Construir por ' + kz(s.h))}">＋🏠 ${s.h}</button><button class="ghost" data-act="sell" data-sq="${i}" ${cs ? 'disabled' : ''} title="${esc(cs || 'Vender por ' + kz(s.h / 2))}">－🏠</button>` : ''}
      ${st.mort ? `<button class="alt" data-act="unmortgage" data-sq="${i}" ${m.cash < E.unmortCost(i) ? 'disabled' : ''}>Resgatar ${E.unmortCost(i)}</button>` : `<button class="ghost" data-act="mortgage" data-sq="${i}" ${s.g && E.groupBuilt(S, s.g) ? 'disabled' : ''}>Hipotecar +${E.mortVal(i)}</button>`}</div>`;
  }).join('');
}
function loansHtml() {
  const m = me(), owe = S.loans.filter((l) => l.borrower === pid), lent = S.loans.filter((l) => l.lender === pid);
  const card = (l, mineB) => {
    const left = Math.ceil(l.rem / l.inst), pct = Math.round(100 - (l.rem / l.total) * 100);
    return `<div class="box2"><div class="loanrow"><div><b>${mineB ? 'Devo a ' + esc(nameOf(l.lender)) : esc(nameOf(l.borrower)) + ' deve-me'}</b><br>
      Resta <b>${kz(l.rem)}</b> · prestação <b>${kz(l.inst)}</b>/ronda (~${left} rondas)<br>Juros ${l.rate}% · falhas ${l.miss}/${l.grace} · penalização: ${penTxt(l.pen)}</div>
      ${mineB ? `<button class="good sm" data-act="repay" data-id="${l.id}" ${m.cash < l.rem ? 'disabled' : ''} title="Quitar tudo">Quitar</button>` : ''}</div><div class="bar2"><i style="width:${pct}%"></i></div></div>`;
  };
  return `<div class="acts" style="margin:0 0 8px"><button data-open="loanBank">🏦 Pedir ao banco</button><button class="alt" data-open="loanAsk">💸 Pedir a jogador</button></div>
    <h3 style="margin:6px 0">O que devo</h3>${owe.length ? owe.map((l) => card(l, true)).join('') : '<p class="hint">Sem empréstimos.</p>'}
    <h3 style="margin:10px 0 6px">O que emprestei</h3>${lent.length ? lent.map((l) => card(l, false)).join('') : '<p class="hint">Nada emprestado.</p>'}
    <p class="hint">A prestação é paga no início da tua vez. Se falhares ${E.LOAN_GRACE} vezes seguidas aplica-se a penalização combinada: confisco da propriedade mais barata ou saldo negativo.</p>`;
}
function dealsHtml() {
  const mineT = S.trades.filter((t) => t.from === pid || t.to === pid), mineL = S.lreq.filter((r) => r.from === pid || r.to === pid);
  if (!mineT.length && !mineL.length) return '<p class="hint">Sem propostas pendentes. Usa os botões 🤝 Troca e 💸 Pedir a jogador.</p>';
  const trades = mineT.map((t) => {
    const a = E.byId(S, t.from), b = E.byId(S, t.to), inc = t.to === pid;
    return `<div class="box2"><b>🤝 ${esc(a.name)}</b> dá: ${esc(sideDesc(t.give))}<br><b>${esc(b.name)}</b> dá: ${esc(sideDesc(t.get))}
      <div class="acts">${inc ? `<button class="good sm" data-act="tradeYes" data-id="${t.id}">Aceitar</button><button class="ghost sm" data-act="tradeNo" data-id="${t.id}">Recusar</button>` : `<button class="ghost sm" data-act="tradeNo" data-id="${t.id}">Cancelar</button>`}</div></div>`;
  }).join('');
  const loans = mineL.map((r) => {
    const a = E.byId(S, r.from), inc = r.to === pid, tot = E.loanTotal(r.amount, r.rate);
    return `<div class="box2"><b>💸 ${esc(a.name)}</b> pede <b>${kz(r.amount)}</b> a ${esc(E.byId(S, r.to).name)}<br>Juros ${r.rate}% (total ${kz(tot)}) · ${r.n} rondas (~${kz(Math.ceil(tot / r.n))}/ronda)<br>Penalização: ${penTxt(r.pen)}
      <div class="acts">${inc ? `<button class="good sm" data-act="loanYes" data-id="${r.id}">Emprestar</button><button class="ghost sm" data-act="loanNo" data-id="${r.id}">Recusar</button>` : `<button class="ghost sm" data-act="loanNo" data-id="${r.id}">Cancelar</button>`}</div></div>`;
  }).join('');
  return trades + loans;
}
const logHtml = () => S.log.slice(-80).map((l) => (typeof l === 'string' ? `<div>${esc(l)}</div>` : `<div class="ch">${E.TOKENS[l.c] || ''} <b>${esc(l.n)}:</b> ${esc(l.t)}</div>`)).join('');
const incomingDeals = () => S.trades.filter((t) => t.to === pid).length + S.lreq.filter((r) => r.to === pid).length;

function tabsHtml() {
  const n = incomingDeals(), tabs = [['props', '🏠 Imóveis'], ['loans', '💳 Dívidas'], ['deals', '🤝 Propostas'], ['log', '💬 Registo'], ['players', '👥']];
  return tabs.map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''} ${k === 'players' ? 'pltab' : ''}" data-tab="${k}">${l}${k === 'deals' && n ? `<span class="b">${n}</span>` : ''}</button>`).join('');
}
function tabContent() {
  switch (ui.tab) {
    case 'loans': return loansHtml();
    case 'deals': return dealsHtml();
    case 'log': return `<div class="log">${logHtml()}</div>`;
    case 'players': return playersHtml() + bankHtml();
    default: return myPropsHtml();
  }
}

/* ---------- jogo ---------- */
function ensureSkeleton() {
  const g = $('#game'); if (g.firstChild) return;
  g.innerHTML = `<aside class="colL"><div class="panel"><div class="brand">IMOBILIÁRIO LUANDA<small>SALA ${esc(S.code)}</small></div></div>
    <div class="panel grow"><h3>Jogadores</h3><div id="plist" class="scroll"></div></div><div class="panel" id="bank"></div></aside>
  <main class="boardArea"><div class="boardwrap"><div id="board"><div id="sqs"></div>
    <div class="center" id="center"><div class="turnpill" id="pill"></div>
      <div><div class="plate">IMOBILIÁRIO<br>LUANDA<small>♦ ♦ ♦</small></div></div>
      <div class="dicebox">${dieHtml(0)}${dieHtml(1)}</div>
      <div><div class="evt" id="evt"></div><div id="potbox" style="text-align:center"></div></div></div>
    <div id="toks"></div></div></div></main>
  <aside class="colR"><div class="panel" id="act"></div>
    <div class="panel grow tabs"><nav id="tabs"></nav><div id="tabc" class="scroll"></div>
      <div id="chatrow" class="hidden"><input id="chatIn" maxlength="200" placeholder="Escreve uma mensagem…"><button class="alt sm" data-act="chat">Enviar</button></div>
      <p style="text-align:center;margin:8px 0 0"><button class="ghost sm" data-act="leave" data-confirm="Sair do jogo?">Sair da sala</button></p></div></aside>`;
  setDice(S.turn.dice, false);
  ui.diceSeq = S.turn.seq;
}
function lastEvent() { for (let i = S.log.length - 1; i >= 0; i--) if (typeof S.log[i] === 'string') return S.log[i]; return ''; }
function renderGame() {
  ensureSkeleton();
  const c = E.cur(S);
  $('#sqs').innerHTML = squaresHtml();
  $('#pill').innerHTML = S.phase === 'over' ? '🏆 Fim de jogo' : `<span class="av" style="background:${pcol(c)}">${tokenOf(c)}</span>Vez de ${esc(c.name)}${c.auto ? ' 🤖' : ''}<span class="tlv hidden" id="tlv"></span>`;
  $('#evt').textContent = lastEvent();
  updClock();
  $('#potbox').innerHTML = S.settings.pot ? `<span class="potv">🅿️ Parque: ${kz(S.pot)}</span>` : '';
  $('#plist').innerHTML = playersHtml(); $('#bank').innerHTML = bankHtml();
  $('#act').innerHTML = actionsHtml();
  $('#tabs').innerHTML = tabsHtml();
  const tc = $('#tabc'), keep = tc.scrollTop, atEnd = tc.scrollTop + tc.clientHeight >= tc.scrollHeight - 30;
  tc.innerHTML = tabContent();
  tc.scrollTop = ui.tab === 'log' && (atEnd || ui.tabJust) ? tc.scrollHeight : keep; ui.tabJust = false;
  $('#chatrow').classList.toggle('hidden', ui.tab !== 'log');
  // dados
  if (S.turn.seq !== ui.diceSeq) {
    if (ui.diceSeq !== -1 && S.turn.seq > ui.diceSeq) { setDice(S.turn.dice, true); ui.hold = Date.now() + 1250; }
    else setDice(S.turn.dice, false);
    ui.diceSeq = S.turn.seq;
  }
  syncTokens();
  // propostas novas
  const dn = incomingDeals();
  if (dn > ui.dealsN) toast('📨 Tens uma nova proposta (separador Propostas)', 4500);
  ui.dealsN = dn;
  // carta
  if (S.card && S.card.seq > ui.cardSeq) { if (ui.cardSeq !== 0 || S.card.seq === 1) showCard(); ui.cardSeq = S.card.seq; }
  if (S.phase === 'over' && !ui.overShown) { ui.overShown = true; const w = E.byId(S, S.winner); openModal(`<div class="win"><div class="big">🏆</div><h2>${esc(w.name)} ${tokenOf(w)}</h2><p>é o grande vencedor do Imobiliário Luanda!</p></div>`); }
}
function showCard() {
  const c = S.card, p = E.byId(S, c.pid), el = $('#cardpop');
  el.className = c.deck; el.innerHTML = `<h3>${c.deck === 'chance' ? '❓ Sorte' : '📦 Caixa Comunitária'}</h3>${esc(c.text)}<p style="font-size:12px;opacity:.7;margin:8px 0 0">${esc(p ? p.name : '')}</p>`;
  clearTimeout(showCard.t); showCard.t = setTimeout(() => el.classList.add('hidden'), ui.hold > Date.now() ? 6200 : 5000);
  if (ui.hold > Date.now()) { el.classList.add('hidden'); setTimeout(() => el.classList.remove('hidden'), Math.max(0, ui.hold - Date.now())); }
}

/* ====================================================================== MODAIS */
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}<p style="text-align:right;margin:12px 0 0"><button class="ghost" data-close="1">Fechar</button></p></div>`; m.classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); ui.trade = null; }
function rulesHtml() {
  return `<h2>📖 Regras</h2><div style="font-size:14px;line-height:1.5;color:var(--txt)">
  <p><b>Objectivo:</b> ficar como o único jogador com dinheiro. Cada jogador começa com 1500 Kz.</p>
  <p><b>Vez:</b> lança os dados e avança. Passar pela <b>Partida</b> dá 200 Kz. <b>Duplo</b> = jogas outra vez; <b>3 duplos</b> seguidos = Cadeia.</p>
  <p><b>Comprar:</b> propriedade sem dono pode ser comprada; se recusares vai a <b>leilão</b>. Com dono, pagas renda.</p>
  <p><b>Cores:</b> todas as ruas de uma cor = renda a dobrar e podes construir (uniformemente; 4 casas e depois hotel). O banco tem 32 casas e 12 hotéis.</p>
  <p><b>Linhas e serviços:</b> linhas 25/50/100/200 Kz; serviços 4× (ou 10× com os dois) os dados.</p>
  <p><b>Cadeia:</b> sais com duplo, 50 Kz ou carta. À 3.ª tentativa falhada pagas 50 Kz e avanças.</p>
  <p><b>Hipotecas:</b> recebes metade do preço; resgatar custa +10%. Sem renda enquanto hipotecada.</p>
  <p><b>Trocas:</b> propriedades, dinheiro e cartas a qualquer momento (sem construções no grupo).</p>
  <p><b>💳 Empréstimos:</b> o banco empresta 50–1000 Kz (juros 5% + 2% por ronda de prazo). Também podes pedir a outro jogador com juros acordados. A prestação paga-se no início da tua vez; se falhares ${E.LOAN_GRACE} vezes seguidas aplica-se a penalização escolhida: <b>confisco da propriedade mais barata</b> ou <b>saldo negativo</b>.</p>
  <p><b>Falência:</b> se não pagas uma dívida: ao jogador a quem deves vai tudo; ao banco, as propriedades vão a leilão.</p></div>`;
}
function tradeModal() {
  const T = ui.trade, others = S.players.filter((p) => !p.bk && p.id !== pid), m = me();
  let h = '<h2>🤝 Propor troca</h2><div class="row" style="margin-bottom:10px">';
  h += others.map((p) => `<button class="${T.to === p.id ? '' : 'ghost'}" data-trade-to="${p.id}">${tokenOf(p)} ${esc(p.name)}</button>`).join('') + '</div>';
  if (!T.to) return h + '<p class="hint">Escolhe com quem queres negociar.</p>';
  const o = E.byId(S, T.to);
  const side = (who, key) => {
    const props = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === who.id);
    return `<div class="c"><b>${key === 'give' ? 'Tu dás' : esc(o.name) + ' dá'}</b>
      <label>Dinheiro: <input type="number" min="0" max="${Math.max(0, who.cash)}" value="${T[key].cash}" data-tcash="${key}" style="width:100px"></label>
      ${props.map((i) => `<label><input type="checkbox" data-tprop="${key}" value="${i}" ${T[key].props.includes(i) ? 'checked' : ''}><span style="display:inline-block;width:10px;height:14px;border:1px solid #000;background:${propColor(i)}"></span>${esc(B[i].n)}${S.props[i].mort ? ' (hip.)' : ''}</label>`).join('') || '<p class="hint">Sem propriedades</p>'}
      ${who.jc.length ? `<label>Cartas Sai da Cadeia: <input type="number" min="0" max="${who.jc.length}" value="${T[key].jc}" data-tjc="${key}" style="width:60px"></label>` : ''}</div>`;
  };
  return h + `<div class="cols">${side(m, 'give')}${side(o, 'get')}</div><div class="acts"><button class="good" data-act="sendTrade">Enviar proposta</button></div>`;
}
function refreshTrade() { $('#modal .box').innerHTML = tradeModal() + '<p style="text-align:right;margin:12px 0 0"><button class="ghost" data-close="1">Fechar</button></p>'; }

function loanBankModal() {
  return `<h2>🏦 Empréstimo do Banco</h2>
  <div class="field"><span>Valor: <b id="lbAmtV">300 Kz</b></span><input type="range" id="lbAmt" min="50" max="1000" step="50" value="300" data-loan="bank"></div>
  <div class="field"><span>Prazo (rondas = vezes que pagas): <b id="lbNV">5</b></span><input type="range" id="lbN" min="3" max="15" step="1" value="5" data-loan="bank"></div>
  <div class="field"><span>Se falhares ${E.LOAN_GRACE} prestações seguidas:</span><div class="seg"><label><input type="radio" name="lbPen" value="prop" checked data-loan="bank"><span>🏚️ Confiscar propriedade</span></label><label><input type="radio" name="lbPen" value="neg" data-loan="bank"><span>🔻 Saldo negativo</span></label></div></div>
  <div class="sum" id="lbSum"></div><div class="acts"><button class="alt" data-act="sendLoanBank">Receber dinheiro</button></div>`;
}
function loanAskModal() {
  const others = S.players.filter((p) => !p.bk && p.id !== pid);
  return `<h2>💸 Pedir empréstimo a um jogador</h2>
  <div class="field"><span>A quem?</span><select id="laTo">${others.map((p) => `<option value="${p.id}">${tokenOf(p)} ${esc(p.name)} (${kz(p.cash)})</option>`).join('')}</select></div>
  <div class="field"><span>Valor: <b id="laAmtV">300 Kz</b></span><input type="range" id="laAmt" min="10" max="2000" step="10" value="300" data-loan="ask"></div>
  <div class="field"><span>Juros totais: <b id="laRateV">20%</b></span><input type="range" id="laRate" min="0" max="100" step="1" value="20" data-loan="ask"></div>
  <div class="field"><span>Prazo (rondas): <b id="laNV">5</b></span><input type="range" id="laN" min="2" max="20" step="1" value="5" data-loan="ask"></div>
  <div class="field"><span>Se falhares ${E.LOAN_GRACE} prestações seguidas:</span><div class="seg"><label><input type="radio" name="laPen" value="prop" checked data-loan="ask"><span>🏚️ Confiscar propriedade</span></label><label><input type="radio" name="laPen" value="neg" data-loan="ask"><span>🔻 Saldo negativo</span></label></div></div>
  <div class="sum" id="laSum"></div><div class="acts"><button class="alt" data-act="sendLoanAsk">Enviar pedido</button></div>`;
}
function updLoanSum(kind) {
  if (kind === 'bank') {
    const a = +$('#lbAmt').value, n = +$('#lbN').value, r = E.bankRate(n), t = E.loanTotal(a, r);
    $('#lbAmtV').textContent = kz(a); $('#lbNV').textContent = n;
    $('#lbSum').innerHTML = `Taxa do banco para ${n} rondas: <b>${r}%</b><br>Recebes <b>${kz(a)}</b> e devolves <b>${kz(t)}</b> em ${n} prestações de <b>${kz(Math.ceil(t / n))}</b>.`;
  } else {
    const a = +$('#laAmt').value, r = +$('#laRate').value, n = +$('#laN').value, t = E.loanTotal(a, r);
    $('#laAmtV').textContent = kz(a); $('#laRateV').textContent = r + '%'; $('#laNV').textContent = n;
    $('#laSum').innerHTML = `Recebes <b>${kz(a)}</b> e devolves <b>${kz(t)}</b> em ${n} prestações de <b>${kz(Math.ceil(t / n))}</b>.<br><span class="hint">O outro jogador tem de aceitar.</span>`;
  }
}

/* ====================================================================== EVENTOS */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act],[data-sq],[data-open],[data-close],[data-trade-to],[data-tab]');
  if (!t) { if (ev.target.id === 'modal') closeModal(); if (ev.target.closest('#cardpop')) $('#cardpop').classList.add('hidden'); return; }
  if (t.dataset.close) { closeModal(); return; }
  if (t.dataset.tab) { ui.tab = t.dataset.tab; ui.tabJust = true; ui.lastSig = ''; render(); return; }
  if (t.dataset.open === 'rules') { openModal(rulesHtml()); return; }
  if (t.dataset.open === 'trade') { ui.trade = { to: null, give: { cash: 0, props: [], jc: 0 }, get: { cash: 0, props: [], jc: 0 } }; openModal(''); refreshTrade(); return; }
  if (t.dataset.open === 'loanBank') { if (me().bk) return; openModal(loanBankModal()); updLoanSum('bank'); return; }
  if (t.dataset.open === 'loanAsk') { if (me().bk) return; if (!S.players.some((p) => !p.bk && p.id !== pid)) return; openModal(loanAskModal()); updLoanSum('ask'); return; }
  if (t.dataset.tradeTo) { ui.trade.to = t.dataset.tradeTo; ui.trade.give = { cash: 0, props: [], jc: 0 }; ui.trade.get = { cash: 0, props: [], jc: 0 }; refreshTrade(); return; }
  if (!t.dataset.act) { if (t.dataset.sq != null && S) { ev.preventDefault(); openModal(deedHtml(+t.dataset.sq)); } return; }
  ev.preventDefault();
  if (t.dataset.confirm && !confirm(t.dataset.confirm)) return;
  const a = t.dataset.act;
  switch (a) {
    case 'copy': { const v = $('#lnk').value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Link copiado!'), () => { $('#lnk').select(); toast('Copia o link seleccionado.'); }); break; }
    case 'leave': if (!local && S.phase === 'play' && !confirm('Sair desta sala? Podes voltar a entrar com o mesmo código.')) break; leaveRoom(); break;
    case 'token': dispatch({ type: 'token', token: +t.dataset.token }); break;
    case 'kick': dispatch({ type: 'kick', pid: t.dataset.pid }); break;
    case 'start': dispatch({ type: 'settings', cash: +$('#setCash').value, pot: $('#setPot').checked, turnTime: +$('#setTime').value }); dispatch({ type: 'start' }); break;
    case 'bidrel': dispatch({ type: 'bid', amount: S.auction.bid + (+t.dataset.add) }); break;
    case 'bidcustom': dispatch({ type: 'bid', amount: +$('#bidAmt').value }); break;
    case 'chat': { const i = $('#chatIn'); if (i.value.trim()) { dispatch({ type: 'chat', text: i.value }); i.value = ''; } break; }
    case 'sendTrade': { const T = ui.trade; dispatch({ type: 'trade', to: T.to, give: T.give, get: T.get }); closeModal(); toast('Proposta enviada.'); break; }
    case 'sendLoanBank': dispatch({ type: 'loanBank', amount: +$('#lbAmt').value, n: +$('#lbN').value, pen: ($('input[name=lbPen]:checked') || {}).value }); closeModal(); break;
    case 'sendLoanAsk': dispatch({ type: 'loanAsk', to: $('#laTo').value, amount: +$('#laAmt').value, rate: +$('#laRate').value, n: +$('#laN').value, pen: ($('input[name=laPen]:checked') || {}).value }); closeModal(); toast('Pedido enviado.'); break;
    default: { const x = { type: a }; if (t.dataset.sq != null) x.sq = +t.dataset.sq; if (t.dataset.id != null) x.id = +t.dataset.id; dispatch(x); }
  }
});
document.addEventListener('input', (ev) => { if (ev.target.dataset && ev.target.dataset.loan) updLoanSum(ev.target.dataset.loan); });
document.addEventListener('change', (ev) => {
  const t = ev.target, T = ui.trade; if (!T) return;
  if (t.dataset.tprop) { const l = T[t.dataset.tprop].props, v = +t.value; if (t.checked) l.push(v); else l.splice(l.indexOf(v), 1); }
  else if (t.dataset.tcash) T[t.dataset.tcash].cash = Math.max(0, Math.floor(+t.value || 0));
  else if (t.dataset.tjc) T[t.dataset.tjc].jc = Math.max(0, Math.floor(+t.value || 0));
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  if (ev.target.id === 'chatIn' && ev.target.value.trim()) { dispatch({ type: 'chat', text: ev.target.value }); ev.target.value = ''; }
  else if (ev.target.id === 'bidAmt') dispatch({ type: 'bid', amount: +ev.target.value });
});

/* ---------- ecrã inicial ---------- */
$('#name').value = myName;
const urlRoom = (new URLSearchParams(location.search).get('sala') || '').toUpperCase();
if (urlRoom) $('#code').value = urlRoom;
function needName() { myName = $('#name').value.trim().slice(0, 16); if (!myName) { toast('Escreve o teu nome primeiro.'); $('#name').focus(); return false; } lsSet('imobl_name', myName); return true; }
$('#bCreate').onclick = () => { if (needName()) enter(true); };
$('#bJoin').onclick = () => { if (!needName()) return; const c = $('#code').value.trim().toUpperCase(); if (c.length !== 5) { toast('O código tem 5 letras/números.'); return; } roomCode = c; enter(false); };
$('#bResume').onclick = () => {
  if (!needName()) return;
  try { const r = JSON.parse(lsGet('imobl_last')); pid = r.pid; ssSet('imobl_pid', pid); roomCode = r.code; enter(false); } catch (e) { leaveRoom(); }
};
(function boot() {
  goHome();
  let s = null; try { s = JSON.parse(ssGet('imobl_sess') || 'null'); } catch (e) {}
  if (s && s.code && myName) { roomCode = s.code; enter(false); }
})();

/* modo demonstração offline (para testes visuais): ?demo=N&steps=M */
const demoN = +new URLSearchParams(location.search).get('demo');
if (demoN) {
  local = true; myName = 'Tu'; pid = 'p0'; S = E.newGame('DEMO1', 'p0');
  for (let i = 0; i < demoN; i++) E.join(S, 'p' + i, i ? 'Amigo ' + i : 'Tu', i);
  E.start(S);
  S.players.sort((a, b) => (a.id === 'p0' ? -1 : b.id === 'p0' ? 1 : 0)); S.cur = 0;
  let k = 0; const steps = +new URLSearchParams(location.search).get('steps') || 120;
  while (k++ < steps && S.phase === 'play') {
    const c = E.cur(S), T = S.turn;
    if (k === 30) E.act(S, 'p1', { type: 'loanBank', amount: 300, n: 6, pen: 'prop' });
    if (T.phase === 'roll') E.act(S, c.id, { type: 'roll' });
    else if (T.phase === 'buy') { E.act(S, c.id, { type: 'buy' }) && E.act(S, c.id, { type: 'decline' }); }
    else if (T.phase === 'auction') { S.players.forEach((p) => E.act(S, p.id, { type: 'pass' })); }
    else if (T.phase === 'debt') E.act(S, S.debts[0].pid, { type: 'bankrupt' });
    else if (T.phase === 'end') E.act(S, c.id, { type: 'endTurn' });
  }
  S.cur = 0; S.turn.phase = 'roll'; S.turn.doubles = 0; S.turn.extra = false;
  render();
}
{ const q = new URLSearchParams(location.search); if (demoN && q.get('tab')) { ui.tab = q.get('tab'); ui.lastSig = ''; render(); }
  if (demoN && q.get('modal') === 'loan') { openModal(loanBankModal()); updLoanSum('bank'); }
  if (demoN && q.get('modal') === 'ask') { openModal(loanAskModal()); updLoanSum('ask'); } }
