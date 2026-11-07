/* Imobiliário Luanda - chamada de voz entre todos os participantes (jogadores e espectadores).
   WebRTC em malha (cada um liga-se a cada um); o servidor WebSocket só faz a sinalização. window.Voice */
(function (root) {
  'use strict';
  function create() {
  let ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }], iceCandidatePoolSize: 2 };
  const V = { state: {}, joined: false, muted: false, list: [], error: '', blocked: false, send: null, selfId: '', onChange() {} };
  const peers = new Map(); // pid -> { pc, audio, queue, remote }
  let stream = null, box = null;
  const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

  function holder() {
    if (!box) { box = document.createElement('div'); box.id = 'voiceAudio'; box.style.display = 'none'; document.body.appendChild(box); }
    return box;
  }
  const sig = (to, d) => { if (V.send) V.send({ t: 'vsig', to, d }); };
  /* estado da ligação; navegadores antigos (Safari) não têm connectionState */
  function cstate(pc) {
    if (pc.connectionState) return pc.connectionState;
    const i = pc.iceConnectionState;
    return i === 'completed' ? 'connected' : i === 'checking' || i === 'new' ? 'connecting' : i;
  }
  function closePeer(id) {
    const p = peers.get(id); if (!p) return;
    p.closed = true;
    try { p.pc.close(); } catch (e) {}
    try { p.audio.srcObject = null; p.audio.remove(); } catch (e) {}
    peers.delete(id);
  }
  const initiatorOf = (id) => V.selfId < id; // o id "menor" inicia: evita duas ofertas em simultâneo

  function makePeer(id, initiator) {
    const pc = new RTCPeerConnection(ICE), audio = document.createElement('audio');
    audio.autoplay = true; audio.playsInline = true; holder().appendChild(audio);
    const p = { pc, audio, queue: [], remote: false, closed: false };
    peers.set(id, p);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => { if (e.candidate) sig(id, { c: e.candidate }); };
    pc.ontrack = (e) => {
      audio.srcObject = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      audio.play().then(() => { if (V.blocked) { V.blocked = false; V.onChange(); } }).catch(() => { V.blocked = true; V.onChange(); });
    };
    V.state[id] = 'a ligar';
    let dead = null;
    /* ligação falhou: quem inicia refaz; quem recebe pede ao outro para refazer */
    const fail = () => {
      if (p.closed || peers.get(id) !== p) return;
      closePeer(id); V.state[id] = 'falhou'; V.onChange();
      if (!initiatorOf(id)) sig(id, { retry: 1 });
      setTimeout(sync, 2500);
    };
    const onState = () => {
      if (p.closed) return;
      const st = cstate(pc); clearTimeout(dead);
      if (st === 'connected') { if (V.state[id] !== 'ligado') { V.state[id] = 'ligado'; V.onChange(); } }
      else if (st === 'failed' || st === 'closed') fail();
      else if (st === 'disconnected') { V.state[id] = 'instável'; V.onChange(); dead = setTimeout(() => { if (cstate(pc) !== 'connected') fail(); }, 6000); }
    };
    pc.onconnectionstatechange = onState;
    pc.oniceconnectionstatechange = onState;
    setTimeout(() => { if (!p.closed && cstate(pc) !== 'connected') fail(); }, 25000); // não ligou em 25 s: recomeça
    if (initiator) {
      pc.onnegotiationneeded = async () => {
        try { const o = await pc.createOffer(); await pc.setLocalDescription(o); sig(id, { sdp: pc.localDescription }); } catch (e) {}
      };
    }
    return p;
  }
  async function onSignal(from, d) {
    if (!V.joined || !stream) return;
    let p = peers.get(from);
    try {
      if (d.retry) { if (initiatorOf(from) && V.list.includes(from)) { closePeer(from); makePeer(from, true); } return; }
      if (d.sdp) {
        if (d.sdp.type === 'offer') { if (p) closePeer(from); p = makePeer(from, false); }
        if (!p) return;
        await p.pc.setRemoteDescription(d.sdp); p.remote = true;
        for (const c of p.queue.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
        if (d.sdp.type === 'offer') { const a = await p.pc.createAnswer(); await p.pc.setLocalDescription(a); sig(from, { sdp: p.pc.localDescription }); }
      } else if (d.c) {
        if (!p) return;
        if (p.remote) await p.pc.addIceCandidate(d.c).catch(() => {}); else p.queue.push(d.c);
      }
    } catch (e) {}
  }
  function sync() {
    if (!V.joined) return;
    const others = V.list.filter((id) => id !== V.selfId);
    for (const id of [...peers.keys()]) if (!others.includes(id)) { closePeer(id); delete V.state[id]; }
    for (const id of others) if (!peers.has(id) && initiatorOf(id)) makePeer(id, true);
  }

  /* o telemóvel pode retirar o microfone ao navegador (mudar de app, chamada, ecrã apagado): voltar a pedi-lo e trocar a pista */
  async function reacquire() {
    if (!V.joined || !stream) return;
    if (stream.getAudioTracks().some((t) => t.readyState === 'live')) return;
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: false });
      const nt = ns.getAudioTracks()[0]; nt.enabled = !V.muted;
      peers.forEach((p) => { const s = p.pc.getSenders().find((x) => x.track && x.track.kind === 'audio') || p.pc.getSenders().find((x) => !x.track); if (s) s.replaceTrack(nt).catch(() => {}); });
      stream = ns; watchTracks(); V.error = ''; V.onChange();
    } catch (e) { V.error = 'O microfone deixou de funcionar. Toca em “Sair da voz” e volta a entrar.'; V.onChange(); }
  }
  function watchTracks() { stream.getAudioTracks().forEach((t) => { t.onended = () => { V.error = 'O microfone foi interrompido pelo dispositivo. A tentar recuperar…'; V.onChange(); setTimeout(reacquire, 500); }; }); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { reacquire(); V.unlock(); } });

  /* o servidor avisa que este participante reconectou: refazer a ligação com ele */
  V.reset = (id) => { if (peers.has(id)) { closePeer(id); V.state[id] = 'a ligar'; } sync(); V.onChange(); };
  V.setList = (list) => { V.list = list || []; sync(); V.onChange(); };
  V.signal = onSignal;
  V.available = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.RTCPeerConnection);
  V.join = async () => {
    if (V.joined) return;
    V.error = '';
    if (!V.available()) { V.error = 'O teu navegador não suporta chamadas de voz (é preciso HTTPS).'; V.onChange(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: false });
    } catch (e) { V.error = 'Sem acesso ao microfone. Permite o microfone no navegador e tenta de novo.'; V.onChange(); return; }
    stream.getAudioTracks().forEach((t) => { t.enabled = !V.muted; });
    watchTracks();
    V.joined = true; if (V.send) V.send({ t: 'vjoin' }); V.onChange();
  };
  V.leave = () => {
    if (!V.joined) return;
    V.joined = false;
    for (const id of [...peers.keys()]) closePeer(id);
    V.state = {};
    if (stream) { stream.getTracks().forEach((t) => { t.onended = null; t.stop(); }); stream = null; }
    if (V.send) V.send({ t: 'vleave' });
    V.onChange();
  };
  V.toggleMute = () => { V.muted = !V.muted; if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = !V.muted; }); V.onChange(); };
  /* depois de reconectar ao servidor, renegociar tudo e voltar a anunciar que estamos na chamada */
  V.resume = () => {
    if (!V.joined || !V.send) return;
    for (const id of [...peers.keys()]) closePeer(id);
    V.send({ t: 'vjoin' });
  };
  V.setMode = (m) => { if (V.mode !== m) { V.mode = m; V.onChange(); } };
  V.setIce = (servers) => { if (Array.isArray(servers) && servers.length) ICE = { iceServers: servers, iceCandidatePoolSize: 2 }; };
  /* alguns navegadores (iOS) só tocam áudio depois de um toque: tenta de novo em qualquer toque */
  V.unlock = () => { peers.forEach((p) => { if (p.audio.paused && p.audio.srcObject) p.audio.play().then(() => { if (V.blocked) { V.blocked = false; V.onChange(); } }).catch(() => {}); }); };
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => root.addEventListener(ev, V.unlock, { passive: true }));
  /* diagnóstico: bytes de áudio recebidos de cada participante (para saber quem realmente se ouve) */
  V.stats = async () => {
    const out = {};
    for (const [id, p] of peers) {
      try {
        const rep = await p.pc.getStats(); let rx = 0, tx = 0, pair = '';
        rep.forEach((r) => {
          if (r.type === 'inbound-rtp' && r.kind === 'audio') rx += r.bytesReceived || 0;
          if (r.type === 'outbound-rtp' && r.kind === 'audio') tx += r.bytesSent || 0;
          if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) pair = r.currentRoundTripTime ? Math.round(r.currentRoundTripTime * 1000) + 'ms' : 'ok';
        });
        out[id] = { rx, tx, pair };
      } catch (e) {}
    }
    return out;
  };
  return V;
  }
  root.VoiceFactory = create; // permite várias instâncias (testes)
  root.Voice = create();
})(typeof window !== 'undefined' ? window : this);
