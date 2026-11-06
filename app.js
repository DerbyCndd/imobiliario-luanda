'use strict';
/* Imobiliário Luanda - interface e ligação online (PeerJS, anfitrião autoritativo) */
const E = window.Engine, B = E.BOARD;
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kz = (n) => Number(n).toLocaleString('pt-PT') + ' Kz';
const FACES = '⚀⚁⚂⚃⚄⚅';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

let S = null, role = null, peer = null, hostConn = null, roomCode = '', conns = {}, retryT = null, leaving = false, hostTimer = null;
let pid = ssGet('imobl_pid') || (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4));
ssSet('imobl_pid', pid);
let myName = lsGet('imobl_name') || '';
let ui = { trade: null, lastSig: '', cardSeq: 0, diceSeq: -1, rolling: false, tab: 'log' };

/* ====================================================================== REDE */
function genCode() { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
function setNet(m) { const n = $('#net'); n.textContent = m || ''; n.classList.toggle('hidden', !m); }
function toast(m, ms) { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), ms || 3200); }
function sess() { ssSet('imobl_sess', JSON.stringify({ role, code: roomCode })); }

function startHost(code, state) {
  leaving = false; roomCode = code; setNet('A criar a sala…');
  try { peer && peer.destroy(); } catch (e) {}
  peer = new Peer('imobl-' + code);
  peer.on('open', () => {
    setNet('');
    role = 'host';
    if (state) { S = state; S.players.forEach((p) => { p.connected = p.id === pid; }); }
    else { S = E.newGame(code, pid); E.join(S, pid, myName, 0); }
    sess(); clearInterval(hostTimer);
    hostTimer = setInterval(() => { if (S && S.phase === 'play' && S.auction) { E.tick(S); broadcast(); } }, 1000);
    broadcast();
  });
  peer.on('connection', (c) => {
    c.on('data', (m) => hostMsg(c, m));
    c.on('close', () => hostLeft(c));
    c.on('error', () => hostLeft(c));
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      if (state) { setNet(''); toast('A sala anterior ainda está ocupada. Espera uns segundos e tenta de novo.', 5000); goHome(); }
      else startHost(genCode());
    } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') setNet('Problema de rede… a tentar reconectar');
    else toast('Erro de rede: ' + err.type);
  });
}
function hostMsg(c, m) {
  if (!S || !m) return;
  if (m.t === 'join') {
    const err = E.join(S, m.pid, m.name, m.token);
    if (err) { c.send({ t: 'err', m: err, fatal: true }); return; }
    c.pid = m.pid; conns[m.pid] = c; broadcast();
  } else if (m.t === 'act' && c.pid) {
    const err = E.act(S, c.pid, m.a || {});
    if (err) c.send({ t: 'err', m: err });
    broadcast();
  }
}
function hostLeft(c) {
  if (!c.pid || conns[c.pid] !== c) return;
  delete conns[c.pid];
  const p = E.byId(S, c.pid);
  if (p) { p.connected = false; if (S.phase === 'lobby') S.players = S.players.filter((x) => x.id !== c.pid); }
  broadcast();
}
function broadcast() {
  for (const k in conns) { try { if (conns[k].open) conns[k].send({ t: 's', s: S }); } catch (e) {} }
  lsSet('imobl_host', JSON.stringify({ code: S.code, pid, state: S }));
  render();
}
function startClient(code) {
  leaving = false; role = 'client'; roomCode = code; sess(); connectClient();
}
function connectClient() {
  clearTimeout(retryT);
  if (leaving) return;
  try { peer && peer.destroy(); } catch (e) {}
  setNet(S ? 'Ligação perdida. A reconectar…' : 'A ligar à sala…');
  peer = new Peer();
  peer.on('open', () => {
    const c = peer.connect('imobl-' + roomCode, { reliable: true });
    hostConn = c;
    const wd = setTimeout(() => { if (!c.open) retry(); }, 12000);
    c.on('open', () => { clearTimeout(wd); setNet(''); c.send({ t: 'join', pid, name: myName }); });
    c.on('data', (m) => {
      if (m.t === 's') { S = m.s; render(); }
      else if (m.t === 'err') { toast(m.m); if (m.fatal) { leaveRoom(); } }
    });
    c.on('close', () => retry());
    c.on('error', () => retry());
  });
  peer.on('error', (e) => {
    if (e.type === 'peer-unavailable') {
      if (!S) { setNet(''); toast('Sala não encontrada. Confirma o código (o anfitrião tem de ter a página aberta).', 5000); leaveRoom(); } else retry();
    } else retry();
  });
}
function retry() { if (leaving) return; setNet(S ? 'Ligação perdida. A reconectar…' : 'A ligar à sala…'); clearTimeout(retryT); retryT = setTimeout(connectClient, 2500); }
function dispatch(a) {
  if (role === 'host') { const err = E.act(S, pid, a); if (err) toast(err); broadcast(); }
  else if (hostConn && hostConn.open) hostConn.send({ t: 'act', a });
  else toast('Sem ligação ao anfitrião.');
}
function leaveRoom() {
  leaving = true; clearTimeout(retryT); clearInterval(hostTimer);
  try { peer && peer.destroy(); } catch (e) {}
  peer = null; hostConn = null; conns = {}; S = null; role = null;
  ssSet('imobl_sess', ''); setNet(''); goHome();
}
function goHome() {
  S = null; ui.lastSig = '';
  ['lobby', 'game', 'modal', 'cardpop'].forEach((i) => $('#' + i).classList.add('hidden'));
  $('#home').classList.remove('hidden');
  const saved = lsGet('imobl_host');
  $('#bResume').classList.toggle('hidden', !saved);
}

/* ====================================================================== HELPERS */
const pcol = (p) => E.PCOL[p.token];
const tokenOf = (p) => E.TOKENS[p.token];
const me = () => S && E.byId(S, pid);
const sqPos = (i) => (i <= 10 ? { r: 11, c: 11 - i } : i <= 20 ? { r: 21 - i, c: 1 } : i <= 30 ? { r: 1, c: i - 19 } : { r: i - 29, c: 11 });
const sideOf = (i) => (i > 0 && i < 10 ? 'b' : i > 10 && i < 20 ? 'l' : i > 20 && i < 30 ? 't' : i > 30 ? 'r' : 'c');
const icon = (s) => ({ go: '⬅️', chance: '❓', cc: '📦', tax: '💰', rail: '🚂', util: s.n.startsWith('ENDE') ? '💡' : '🚰', jail: '🔒', park: '🅿️', gojail: '👮' }[s.t] || '');
const sideDesc = (s) => {
  const parts = [];
  if (s.cash) parts.push(kz(s.cash));
  s.props.forEach((i) => parts.push(B[i].n));
  if (s.jc) parts.push(s.jc + '× carta Sai da Cadeia');
  return parts.join(', ') || 'nada';
};

/* ====================================================================== RENDER */
function render() {
  if (!S) return;
  $('#home').classList.add('hidden');
  const sig = JSON.stringify(S, (k, v) => (k === 'left' ? undefined : v)) + '|' + pid;
  if (sig === ui.lastSig) { const el = $('#aucLeft'); if (el && S.auction) el.textContent = S.auction.left + 's'; return; }
  ui.lastSig = sig;
  if (S.phase === 'lobby') { $('#game').classList.add('hidden'); $('#lobby').classList.remove('hidden'); renderLobby(); }
  else { $('#lobby').classList.add('hidden'); $('#game').classList.remove('hidden'); renderGame(); }
}

function renderLobby() {
  const isHost = pid === S.hostPid, m = me();
  const link = location.origin + location.pathname + '?sala=' + S.code;
  const tk = E.TOKENS.map((t, i) => {
    const takenBy = S.players.find((p) => p.token === i);
    const mine = takenBy && takenBy.id === pid;
    return `<button class="${mine ? 'sel' : ''}" data-act="token" data-token="${i}" ${takenBy && !mine ? 'disabled' : ''}>${t}</button>`;
  }).join('');
  const pl = S.players.map((p) => `<div class="pl"><span class="tk">${tokenOf(p)}</span><b style="flex:1">${esc(p.name)}${p.id === S.hostPid ? ' 👑' : ''}${p.id === pid ? ' (tu)' : ''}</b><span class="dot" style="background:${p.connected ? '#1fb25a' : '#bbb'}"></span>${isHost && p.id !== pid ? `<button class="sm ghost" data-act="kick" data-pid="${p.id}">Expulsar</button>` : ''}</div>`).join('');
  $('#lobby').innerHTML = `
  <div class="hero"><div class="logo">🏠🎩</div><h1>SALA DE ESPERA</h1></div>
  <div class="card"><h2>Código da sala</h2><div class="code">${S.code}</div>
    <p class="hint">Os amigos entram em <b>${esc(location.host + location.pathname)}</b> com este código, ou abrem directamente o link:</p>
    <div class="row"><input readonly value="${esc(link)}" id="lnk" onclick="this.select()"><button class="alt" data-act="copy">Copiar link</button></div></div>
  <div class="card"><h2>Jogadores (${S.players.length}/12)</h2><div class="plist">${pl}</div></div>
  <div class="card"><h2>A tua peça</h2><div class="tokens">${tk}</div></div>
  ${isHost ? `<div class="card"><h2>Regras da casa</h2>
    <div class="row"><label>Dinheiro inicial <input type="number" id="setCash" value="${S.settings.cash}" min="500" max="10000" step="100" style="width:110px"></label>
    <label><input type="checkbox" id="setPot" ${S.settings.pot ? 'checked' : ''}> Multas e impostos acumulam no Parque Gratuito</label></div>
    <p class="hint">Por defeito segue as regras oficiais: 1500 Kz iniciais e o Parque Gratuito não paga nada.</p></div>
    <button class="bigbtn" style="width:100%" data-act="start" ${S.players.length < 2 ? 'disabled' : ''}>▶ Começar o jogo</button>
    ${S.players.length < 2 ? '<p class="hint" style="color:#e8dcc0;text-align:center">Faltam jogadores (mínimo 2).</p>' : ''}`
  : '<p class="hint" style="color:#e8dcc0;text-align:center;font-size:16px">A aguardar que o anfitrião comece o jogo…</p>'}
  <p style="text-align:center"><button class="ghost sm" data-act="leave">Sair da sala</button></p>`;
}

function housesHtml(st) {
  if (!st || !st.houses) return '';
  return st.houses === 5 ? '<i class="hs ho"></i>' : '<i class="hs"></i>'.repeat(st.houses);
}
function boardHtml() {
  const c = E.cur(S);
  let h = '';
  for (let i = 0; i < 40; i++) {
    const s = B[i], pos = sqPos(i), side = sideOf(i), st = S.props[i];
    const owner = st && st.owner ? E.byId(S, st.owner) : null;
    const price = s.p ? s.p : s.amt ? s.amt : '';
    const here = S.players.filter((p) => !p.bk && p.pos === i);
    h += `<div class="sq ${side === 'c' ? 'corner sb' : 's' + side} ${st && st.mort ? 'mort' : ''}" data-sq="${i}" style="grid-row:${pos.r};grid-column:${pos.c}">
      ${s.t === 'prop' ? `<div class="bar" style="background:${E.GC[s.g]}">${housesHtml(st)}</div>` : ''}
      <div class="body"><div class="nm"><i>${icon(s)}</i>${esc(s.n)}</div>${price ? `<div class="pr">${price}</div>` : ''}</div>
      ${owner ? `<div class="own" style="background:${pcol(owner)}" title="${esc(owner.name)}"></div>` : ''}
      <div class="tkw">${here.map((p) => `<span class="tok ${p.id === c.id && S.phase === 'play' ? 'turn' : ''}" style="background:${pcol(p)}" title="${esc(p.name)}">${tokenOf(p)}</span>`).join('')}</div>
    </div>`;
  }
  const d = S.turn.dice;
  h += `<div class="center"><div class="tt">IMOBILIÁRIO<br>LUANDA</div>
    <div class="dice" id="dice"><span id="d1">${FACES[d[0] - 1]}</span><span id="d2">${FACES[d[1] - 1]}</span></div>
    <div class="evt">${esc(lastEvent())}</div>
    ${S.settings.pot ? `<div class="potv">🅿️ Parque: ${kz(S.pot)}</div>` : ''}</div>`;
  return h;
}
function lastEvent() { for (let i = S.log.length - 1; i >= 0; i--) if (typeof S.log[i] === 'string') return S.log[i]; return ''; }

function deedHtml(i) {
  const s = B[i], st = S.props[i], owner = st && st.owner ? E.byId(S, st.owner) : null;
  let body = '';
  if (s.t === 'prop') {
    body = `<table><tr><td>Renda</td><td>${kz(s.r[0])}</td></tr><tr><td>Grupo completo (sem casas)</td><td>${kz(s.r[0] * 2)}</td></tr>
    ${[1, 2, 3, 4].map((n) => `<tr><td>Com ${n} casa${n > 1 ? 's' : ''}</td><td>${kz(s.r[n])}</td></tr>`).join('')}
    <tr><td>Com hotel</td><td>${kz(s.r[5])}</td></tr></table><hr><table><tr><td>Custo de cada casa</td><td>${kz(s.h)}</td></tr><tr><td>Custo do hotel</td><td>${kz(s.h)} + 4 casas</td></tr></table>`;
  } else if (s.t === 'rail') body = '<table><tr><td>Renda (1 linha)</td><td>25 Kz</td></tr><tr><td>2 linhas</td><td>50 Kz</td></tr><tr><td>3 linhas</td><td>100 Kz</td></tr><tr><td>4 linhas</td><td>200 Kz</td></tr></table>';
  else if (s.t === 'util') body = '<p>Com 1 companhia de serviços: renda = <b>4×</b> o valor dos dados.<br>Com as 2: <b>10×</b> o valor dos dados.</p>';
  else body = `<p>${s.t === 'tax' ? 'Paga ' + kz(s.amt) + ' ao banco.' : s.t === 'go' ? 'Recebe 200 Kz de cada vez que passas por aqui.' : s.t === 'jail' ? 'Só de visita... ou preso.' : s.t === 'park' ? 'Descansa (nada acontece).' : s.t === 'gojail' ? 'Vais directamente para a Cadeia.' : 'Tira uma carta.'}</p>`;
  const col = s.g ? E.GC[s.g] : '#eee';
  return `<div class="deed"><div class="dh" style="background:${col};${s.g === 'dblue' || s.g === 'brown' || s.g === 'red' || s.g === 'pink' || s.g === 'green' ? 'color:#fff' : ''}">${icon(s)} ${esc(s.n)}</div><div class="db">
    ${s.p ? `<p><b>Preço: ${kz(s.p)}</b> · Hipoteca: ${kz(s.p / 2)}</p>` : ''}${body}
    ${st ? `<p>${owner ? '👤 Dono: <b>' + esc(owner.name) + '</b>' : '🏦 Sem dono'}${st.mort ? ' · <b>HIPOTECADA</b>' : ''}${st.houses ? ' · ' + (st.houses === 5 ? '1 hotel' : st.houses + ' casa(s)') : ''}</p>` : ''}</div></div>`;
}

function actionsHtml() {
  const T = S.turn, c = E.cur(S), m = me(), mine = c.id === pid;
  if (S.phase === 'over') {
    const w = E.byId(S, S.winner);
    return `<div class="win"><div class="big">🏆</div><b>${esc(w.name)}</b> ${tokenOf(w)} venceu o jogo!<p><button data-act="leave">Voltar ao início</button></p></div>`;
  }
  let h = `<div class="who"><span class="big">${tokenOf(c)}</span><span>Vez de <b>${esc(c.name)}</b>${mine ? ' (tu)' : ''}</span></div>`;
  if (m.bk) return h + '<p class="hint">Foste eliminado. Podes continuar a acompanhar o jogo e a conversar.</p>';
  if (T.phase === 'auction' && S.auction) h += auctionHtml(m);
  else if (T.phase === 'debt' && S.debts.length) {
    const d = S.debts[0], dp = E.byId(S, d.pid), to = d.to === 'bank' ? 'o Banco' : E.byId(S, d.to).name;
    if (d.pid === pid) h += `<p><b>Deves ${kz(d.amt)} a ${esc(to)}</b> (${esc(d.why)}).<br>Tens ${kz(m.cash)}. Vende construções, hipoteca propriedades ou negoceia para arranjar dinheiro — o pagamento é automático.</p><div class="acts"><button class="alt" data-act="bankrupt" data-confirm="Declarar falência? Perdes tudo e sais do jogo.">🏳️ Declarar falência</button></div>`;
    else h += `<p>⏳ <b>${esc(dp.name)}</b> deve ${kz(d.amt)} a ${esc(to)} e está a tentar arranjar dinheiro…</p>`;
  } else if (mine) {
    if (T.phase === 'roll') {
      if (m.jail) h += `<p>🔒 Estás na Cadeia (tentativa ${m.jt + 1}/3). Tira um duplo, paga 50 Kz${m.jc.length ? ' ou usa a carta' : ''}.</p><div class="acts"><button class="alt" data-act="payJail" ${m.cash < 50 ? 'disabled' : ''}>Pagar 50 Kz</button>${m.jc.length ? '<button class="alt" data-act="useJail">Usar carta</button>' : ''}</div>`;
      h += `<div class="acts"><button class="bigbtn" data-act="roll">🎲 ${m.jail ? 'Tentar duplo' : T.doubles ? 'Lançar outra vez' : 'Lançar dados'}</button></div>`;
    } else if (T.phase === 'buy') {
      h += deedHtml(m.pos) + `<div class="acts"><button class="good" data-act="buy" ${m.cash < B[m.pos].p ? 'disabled' : ''}>Comprar por ${kz(B[m.pos].p)}</button><button class="alt" data-act="decline">Leilão</button></div>`;
    } else if (T.phase === 'end') h += `<p class="hint">Podes construir, negociar ou gerir propriedades antes de terminar.</p><div class="acts"><button class="bigbtn" data-act="endTurn">✅ Terminar a vez</button></div>`;
  } else h += `<p class="hint">⏳ A aguardar ${esc(c.name)}…</p>`;
  return h;
}
function auctionHtml(m) {
  const A = S.auction, s = B[A.sq], bd = A.bidder ? E.byId(S, A.bidder) : null, passed = A.pass.includes(pid);
  let h = `<div class="card" style="background:#fff8dc;margin:0"><b>🔨 Leilão: ${esc(s.n)}</b> <span style="float:right;font-weight:800;color:var(--red)" id="aucLeft">${A.left}s</span>
    <p style="margin:6px 0">Preço de tabela: ${kz(s.p)}<br>Licitação actual: <b>${A.bid ? kz(A.bid) : '—'}</b>${bd ? ' de ' + esc(bd.name) : ''}</p>`;
  if (passed) h += '<p class="hint">Desististe deste leilão.</p>';
  else {
    h += `<div class="acts">${[10, 50, 100, 500].map((n) => `<button class="alt" data-act="bidrel" data-add="${n}" ${A.bid + n > m.cash ? 'disabled' : ''}>+${n}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><input type="number" id="bidAmt" min="${A.bid + 1}" placeholder="valor" style="width:110px"><button data-act="bidcustom">Licitar</button><button class="ghost" data-act="pass" ${A.bidder === pid ? 'disabled' : ''}>Desistir</button></div>
    <p class="hint">Tens ${kz(m.cash)}. Cada licitação reinicia o relógio.</p>`;
  }
  return h + '</div>';
}

function playersHtml() {
  const isHost = pid === S.hostPid, c = E.cur(S);
  return S.players.map((p) => {
    const owned = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === p.id);
    const chips = owned.map((i) => `<span class="chip ${S.props[i].mort ? 'm' : ''}" data-sq="${i}" title="${esc(B[i].n)}" style="background:${B[i].g ? E.GC[B[i].g] : B[i].t === 'rail' ? '#555' : '#fff'}"></span>`).join('');
    return `<div class="pcard ${p.id === c.id && S.phase === 'play' ? 'turn' : ''} ${p.bk ? 'bk' : ''}">
      <div class="tkb" style="background:${pcol(p)}">${tokenOf(p)}</div>
      <div class="info"><b>${esc(p.name)}${p.id === pid ? ' (tu)' : ''}${p.id === S.hostPid ? ' 👑' : ''} ${p.jail ? '🔒' : ''}${p.jc.length ? '🎫'.repeat(p.jc.length) : ''}${!p.connected && !p.bk ? ' 📴' : ''}</b><span class="cash">${p.bk ? 'Falido' : kz(p.cash)}</span><div class="chips">${chips}</div></div>
      ${isHost && p.id !== pid && !p.bk ? `<button class="sm ghost" data-act="kick" data-pid="${p.id}" data-confirm="Remover ${esc(p.name)} do jogo?">✖</button>` : ''}</div>`;
  }).join('');
}

function myPropsHtml() {
  const m = me();
  const mine = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === pid);
  if (!mine.length) return '<p class="hint">Ainda não tens propriedades.</p>';
  return mine.map((i) => {
    const s = B[i], st = S.props[i];
    const cb = s.t === 'prop' ? E.canBuild(S, m, i) : 'x', cs = s.t === 'prop' ? E.canSell(S, m, i) : 'x';
    const status = (st.mort ? 'Hipotecada' : '') + (st.houses ? (st.mort ? ' · ' : '') + (st.houses === 5 ? '🏨 hotel' : '🏠'.repeat(st.houses)) : '');
    return `<div class="prow"><span class="pc" style="background:${s.g ? E.GC[s.g] : s.t === 'rail' ? '#555' : '#fff'}"></span>
      <div class="pn"><a href="#" data-sq="${i}" style="color:inherit"><b>${esc(s.n)}</b></a><small>${status || '&nbsp;'}</small></div>
      ${s.t === 'prop' ? `<button class="good" data-act="build" data-sq="${i}" ${cb ? 'disabled' : ''} title="${esc(cb || 'Construir por ' + kz(s.h))}">＋🏠 ${s.h}</button><button class="ghost" data-act="sell" data-sq="${i}" ${cs ? 'disabled' : ''} title="${esc(cs || 'Vender por ' + kz(s.h / 2))}">－🏠</button>` : ''}
      ${st.mort ? `<button class="alt" data-act="unmortgage" data-sq="${i}" ${m.cash < E.unmortCost(i) ? 'disabled' : ''}>Resgatar ${E.unmortCost(i)}</button>` : `<button class="ghost" data-act="mortgage" data-sq="${i}" ${s.g && E.groupBuilt(S, s.g) ? 'disabled' : ''}>Hipotecar +${E.mortVal(i)}</button>`}</div>`;
  }).join('');
}

function tradesHtml() {
  if (!S.trades.length) return '';
  const mineT = S.trades.filter((t) => t.from === pid || t.to === pid);
  if (!mineT.length) return '';
  return `<div class="card"><h2>Trocas pendentes</h2>${mineT.map((t) => {
    const a = E.byId(S, t.from), b = E.byId(S, t.to), incoming = t.to === pid;
    return `<div class="trade"><b>${esc(a.name)}</b> dá: ${esc(sideDesc(t.give))}<br><b>${esc(b.name)}</b> dá: ${esc(sideDesc(t.get))}
      <div class="acts" style="margin-top:6px">${incoming ? `<button class="good" data-act="tradeYes" data-id="${t.id}">Aceitar</button><button class="ghost" data-act="tradeNo" data-id="${t.id}">Recusar</button>` : `<button class="ghost" data-act="tradeNo" data-id="${t.id}">Cancelar proposta</button>`}</div></div>`;
  }).join('')}</div>`;
}
function logHtml() {
  return S.log.slice(-60).map((l) => typeof l === 'string' ? `<div>${esc(l)}</div>` : `<div class="ch">${E.TOKENS[l.c] || ''} <b>${esc(l.n)}:</b> ${esc(l.t)}</div>`).join('');
}

function renderGame() {
  const g = $('#game');
  const logEl = $('#logbox'), keepScroll = logEl ? logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 30 : true;
  const chatVal = $('#chatIn') ? $('#chatIn').value : '';
  g.innerHTML = `<div class="boardwrap"><div id="board">${boardHtml()}</div></div>
  <div class="side">
    <div class="card" id="actions"><h2>Jogada</h2>${actionsHtml()}<div class="acts"><button class="ghost" data-open="trade">🤝 Propor troca</button><button class="ghost" data-open="rules">📖 Regras</button></div></div>
    ${tradesHtml()}
    <div class="card"><h2>Jogadores</h2>${playersHtml()}</div>
    <div class="card"><h2>As minhas propriedades — ${kz(me().cash)}</h2>${myPropsHtml()}</div>
    <div class="card"><h2>Registo e chat</h2><div class="log" id="logbox">${logHtml()}</div>
      <div class="row" style="margin-top:6px"><input id="chatIn" maxlength="200" placeholder="Escreve uma mensagem…"><button class="alt" data-act="chat">Enviar</button></div>
      <p style="text-align:center;margin:8px 0 0"><button class="ghost sm" data-act="leave" data-confirm="Sair do jogo?">Sair</button></p></div>
  </div>`;
  const nl = $('#logbox'); if (keepScroll) nl.scrollTop = nl.scrollHeight;
  $('#chatIn').value = chatVal;
  // dados
  if (S.turn.seq !== ui.diceSeq) {
    if (ui.diceSeq !== -1 && S.turn.seq > ui.diceSeq) animateDice();
    ui.diceSeq = S.turn.seq;
  }
  // carta
  if (S.card && S.card.seq > ui.cardSeq) {
    if (ui.cardSeq !== 0 || S.card.seq === 1) showCard();
    ui.cardSeq = S.card.seq;
  }
  if (S.phase === 'over' && !ui.overShown) { ui.overShown = true; }
}
function animateDice() {
  const d = $('#dice'); if (!d) return;
  const final = S.turn.dice; let n = 0; d.classList.add('roll');
  const iv = setInterval(() => {
    const e1 = $('#d1'), e2 = $('#d2'); if (!e1) { clearInterval(iv); return; }
    if (++n > 7) { clearInterval(iv); d.classList.remove('roll'); e1.textContent = FACES[final[0] - 1]; e2.textContent = FACES[final[1] - 1]; return; }
    e1.textContent = FACES[Math.floor(Math.random() * 6)]; e2.textContent = FACES[Math.floor(Math.random() * 6)];
  }, 80);
}
function showCard() {
  const c = S.card, p = E.byId(S, c.pid), el = $('#cardpop');
  el.className = c.deck; el.innerHTML = `<h3>${c.deck === 'chance' ? '❓ Sorte' : '📦 Caixa Comunitária'}</h3>${esc(c.text)}<p class="hint">${esc(p ? p.name : '')}</p>`;
  clearTimeout(showCard.t); showCard.t = setTimeout(() => el.classList.add('hidden'), 5000);
}

/* ====================================================================== MODAIS */
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}<p style="text-align:right;margin:10px 0 0"><button class="ghost" data-close="1">Fechar</button></p></div>`; m.classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); ui.trade = null; }
function rulesHtml() {
  return `<h2 style="margin-bottom:8px">📖 Regras (as do tabuleiro clássico)</h2><div style="font-size:14px;line-height:1.45">
  <p><b>Objectivo:</b> ficar como o único jogador com dinheiro. Cada jogador começa com 1500 Kz.</p>
  <p><b>Vez:</b> lança os dados e avança. Passar pela <b>Partida</b> dá 200 Kz. Tirar <b>duplo</b> permite jogar outra vez; <b>3 duplos</b> seguidos mandam-te para a Cadeia.</p>
  <p><b>Comprar:</b> se caíres numa propriedade sem dono podes comprá-la; se não quiseres, vai a <b>leilão</b> para todos. Se caíres numa com dono, pagas a renda.</p>
  <p><b>Cores:</b> quem tem todas as ruas de uma cor cobra o dobro da renda (sem casas) e pode construir. Constrói de forma uniforme (máx. 4 casas por rua, depois hotel). O banco tem 32 casas e 12 hotéis.</p>
  <p><b>Linhas e serviços:</b> a renda das linhas é 25/50/100/200 Kz conforme quantas tens. Serviços: 4× (ou 10× com os dois) o valor dos dados.</p>
  <p><b>Cadeia:</b> vais por "Vá para a Cadeia", pela carta ou com 3 duplos. Sais com um duplo, pagando 50 Kz ou usando a carta. À 3.ª tentativa falhada pagas 50 Kz e avanças. Mesmo preso podes cobrar rendas.</p>
  <p><b>Hipotecas:</b> recebes metade do preço; resgatar custa o valor + 10%. Não cobras renda de propriedades hipotecadas e só podes hipotecar se não houver construções no grupo.</p>
  <p><b>Trocas:</b> podes negociar propriedades, dinheiro e cartas a qualquer momento (sem construções no grupo). Propriedades hipotecadas pagam 10% ao receber.</p>
  <p><b>Falência:</b> se não consegues pagar uma dívida, declaras falência: se deves a um jogador, ele fica com tudo; se deves ao banco, as propriedades vão a leilão.</p></div>`;
}
function tradeModal() {
  const T = ui.trade, others = S.players.filter((p) => !p.bk && p.id !== pid);
  const m = me();
  let h = `<h2 style="margin-bottom:8px">🤝 Propor troca</h2><div class="row" style="margin-bottom:8px">`;
  h += others.map((p) => `<button class="${T.to === p.id ? '' : 'ghost'}" data-trade-to="${p.id}">${tokenOf(p)} ${esc(p.name)}</button>`).join('');
  h += '</div>';
  if (!T.to) return h + '<p class="hint">Escolhe com quem queres negociar.</p>';
  const o = E.byId(S, T.to);
  const side = (who, key) => {
    const props = Object.keys(S.props).map(Number).filter((i) => S.props[i].owner === who.id);
    return `<div class="c"><b>${key === 'give' ? 'Tu dás' : esc(o.name) + ' dá'}</b>
      <label>Dinheiro: <input type="number" min="0" max="${who.cash}" value="${T[key].cash}" data-tcash="${key}" style="width:100px"></label>
      ${props.map((i) => `<label><input type="checkbox" data-tprop="${key}" value="${i}" ${T[key].props.includes(i) ? 'checked' : ''}><span class="pc" style="display:inline-block;width:10px;height:14px;border:1px solid #000;background:${B[i].g ? E.GC[B[i].g] : '#555'}"></span>${esc(B[i].n)}${S.props[i].mort ? ' (hip.)' : ''}</label>`).join('') || '<p class="hint">Sem propriedades</p>'}
      ${who.jc.length ? `<label>Cartas Sai da Cadeia: <input type="number" min="0" max="${who.jc.length}" value="${T[key].jc}" data-tjc="${key}" style="width:60px"></label>` : ''}</div>`;
  };
  h += `<div class="cols">${side(m, 'give')}${side(o, 'get')}</div><div class="acts"><button class="good" data-act="sendTrade">Enviar proposta</button></div>`;
  return h;
}
function refreshTrade() { $('#modal .box').innerHTML = tradeModal() + '<p style="text-align:right;margin:10px 0 0"><button class="ghost" data-close="1">Fechar</button></p>'; }

/* ====================================================================== EVENTOS */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act],[data-sq],[data-open],[data-close],[data-trade-to]');
  if (!t) { if (ev.target.id === 'modal') closeModal(); if (ev.target.closest('#cardpop')) $('#cardpop').classList.add('hidden'); return; }
  if (t.dataset.close) { closeModal(); return; }
  if (t.dataset.open === 'rules') { openModal(rulesHtml()); return; }
  if (t.dataset.open === 'trade') { ui.trade = { to: null, give: { cash: 0, props: [], jc: 0 }, get: { cash: 0, props: [], jc: 0 } }; openModal(''); refreshTrade(); return; }
  if (t.dataset.tradeTo) { ui.trade.to = t.dataset.tradeTo; ui.trade.give = { cash: 0, props: [], jc: 0 }; ui.trade.get = { cash: 0, props: [], jc: 0 }; refreshTrade(); return; }
  if (!t.dataset.act) { if (t.dataset.sq != null && S) { ev.preventDefault(); openModal(deedHtml(+t.dataset.sq)); } return; }
  ev.preventDefault();
  if (t.dataset.confirm && !confirm(t.dataset.confirm)) return;
  const a = t.dataset.act;
  switch (a) {
    case 'copy': { const v = $('#lnk').value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Link copiado!'), () => { $('#lnk').select(); toast('Copia o link seleccionado.'); }); break; }
    case 'leave': if (role === 'host' && S.phase === 'play' && !confirm('És o anfitrião: se saíres o jogo termina para todos. Sair?')) break; leaveRoom(); break;
    case 'token': dispatch({ type: 'token', token: +t.dataset.token }); break;
    case 'kick': dispatch({ type: 'kick', pid: t.dataset.pid }); break;
    case 'start': dispatch({ type: 'settings', cash: +$('#setCash').value, pot: $('#setPot').checked }); dispatch({ type: 'start' }); break;
    case 'bidrel': dispatch({ type: 'bid', amount: S.auction.bid + (+t.dataset.add) }); break;
    case 'bidcustom': dispatch({ type: 'bid', amount: +$('#bidAmt').value }); break;
    case 'chat': { const i = $('#chatIn'); if (i.value.trim()) { dispatch({ type: 'chat', text: i.value }); i.value = ''; } break; }
    case 'sendTrade': { const T = ui.trade; dispatch({ type: 'trade', to: T.to, give: T.give, get: T.get }); closeModal(); toast('Proposta enviada.'); break; }
    default: { const x = { type: a }; if (t.dataset.sq != null) x.sq = +t.dataset.sq; if (t.dataset.id != null) x.id = +t.dataset.id; dispatch(x); }
  }
});
document.addEventListener('change', (ev) => {
  const t = ev.target, T = ui.trade; if (!T) return;
  if (t.dataset.tprop) { const l = T[t.dataset.tprop].props, v = +t.value; if (t.checked) l.push(v); else l.splice(l.indexOf(v), 1); }
  else if (t.dataset.tcash) T[t.dataset.tcash].cash = Math.max(0, Math.floor(+t.value || 0));
  else if (t.dataset.tjc) T[t.dataset.tjc].jc = Math.max(0, Math.floor(+t.value || 0));
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    if (ev.target.id === 'chatIn' && ev.target.value.trim()) { dispatch({ type: 'chat', text: ev.target.value }); ev.target.value = ''; }
    else if (ev.target.id === 'bidAmt') dispatch({ type: 'bid', amount: +ev.target.value });
  }
});

/* ---------- ecrã inicial ---------- */
$('#name').value = myName;
const urlRoom = (new URLSearchParams(location.search).get('sala') || '').toUpperCase();
if (urlRoom) $('#code').value = urlRoom;
function needName() { myName = $('#name').value.trim().slice(0, 16); if (!myName) { toast('Escreve o teu nome primeiro.'); $('#name').focus(); return false; } lsSet('imobl_name', myName); return true; }
$('#bCreate').onclick = () => { if (needName()) startHost(genCode()); };
$('#bJoin').onclick = () => { if (!needName()) return; const c = $('#code').value.trim().toUpperCase(); if (c.length !== 5) { toast('O código tem 5 letras/números.'); return; } startClient(c); };
$('#bResume').onclick = () => {
  if (!needName()) return;
  try { const r = JSON.parse(lsGet('imobl_host')); pid = r.pid; ssSet('imobl_pid', pid); startHost(r.code, r.state); } catch (e) { toast('Não foi possível retomar.'); lsSet('imobl_host', ''); goHome(); }
};
(function boot() {
  goHome();
  let s = null; try { s = JSON.parse(ssGet('imobl_sess') || 'null'); } catch (e) {}
  if (s && s.code && myName) {
    if (s.role === 'host') { try { const r = JSON.parse(lsGet('imobl_host')); if (r && r.code === s.code) { pid = r.pid; startHost(r.code, r.state); return; } } catch (e) {} }
    else if (s.role === 'client') { startClient(s.code); return; }
  }
  if (urlRoom && myName) { /* o utilizador só tem de carregar em Entrar */ }
})();

/* modo demonstração offline (para testes visuais): ?demo=N */
const demoN = +new URLSearchParams(location.search).get('demo');
if (demoN) {
  myName = 'Tu'; pid = 'p0'; role = 'host'; S = E.newGame('DEMO1', 'p0');
  for (let i = 0; i < demoN; i++) E.join(S, 'p' + i, i ? 'Amigo ' + i : 'Tu', i);
  E.start(S);
  S.players.sort((a, b) => (a.id === 'p0' ? -1 : b.id === 'p0' ? 1 : 0)); S.cur = 0;
  let k = 0; const steps = +new URLSearchParams(location.search).get('steps') || 120;
  while (k++ < steps && S.phase === 'play') {
    const c = E.cur(S), T = S.turn;
    if (T.phase === 'roll') E.act(S, c.id, { type: 'roll' });
    else if (T.phase === 'buy') { E.act(S, c.id, { type: 'buy' }) && E.act(S, c.id, { type: 'decline' }); }
    else if (T.phase === 'auction') { E.act(S, S.players.find((p) => !p.bk).id, { type: 'pass' }); S.players.forEach((p) => E.act(S, p.id, { type: 'pass' })); }
    else if (T.phase === 'debt') E.act(S, S.debts[0].pid, { type: 'bankrupt' });
    else if (T.phase === 'end') E.act(S, c.id, { type: 'endTurn' });
  }
  S.cur = 0; if (S.turn.phase === 'end' || S.turn.phase === 'roll') { /* manter */ }
  render();
}
