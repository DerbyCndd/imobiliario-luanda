/* Imobiliário Luanda - chamada de voz entre todos os participantes (jogadores e espectadores).
   WebRTC em malha (cada um liga-se a cada um); o servidor WebSocket só faz a sinalização. window.Voice */
(function (root) {
  'use strict';
  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
  const V = { joined: false, muted: false, list: [], error: '', send: null, selfId: '', onChange() {} };
  const peers = new Map(); // pid -> { pc, audio, queue, remote }
  let stream = null, box = null;

  function holder() {
    if (!box) { box = document.createElement('div'); box.id = 'voiceAudio'; box.style.display = 'none'; document.body.appendChild(box); }
    return box;
  }
  function sig(to, d) { if (V.send) V.send({ t: 'vsig', to, d }); }

  function closePeer(id) {
    const p = peers.get(id); if (!p) return;
    try { p.pc.close(); } catch (e) {}
    try { p.audio.srcObject = null; p.audio.remove(); } catch (e) {}
    peers.delete(id);
  }
  function makePeer(id, initiator) {
    const pc = new RTCPeerConnection(ICE), audio = document.createElement('audio');
    audio.autoplay = true; audio.playsInline = true; holder().appendChild(audio);
    const p = { pc, audio, queue: [], remote: false };
    peers.set(id, p);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => { if (e.candidate) sig(id, { c: e.candidate }); };
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') { if (peers.get(id) === p) { closePeer(id); V.onChange(); } }
    };
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
  /* quem tem o id "menor" inicia a ligação: evita duas ofertas em simultâneo */
  function sync() {
    if (!V.joined) return;
    const others = V.list.filter((id) => id !== V.selfId);
    for (const id of [...peers.keys()]) if (!others.includes(id)) closePeer(id);
    for (const id of others) if (!peers.has(id) && V.selfId < id) makePeer(id, true);
  }

  V.setList = (list) => { V.list = list || []; sync(); V.onChange(); };
  V.signal = onSignal;
  V.available = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.RTCPeerConnection);
  V.join = async () => {
    if (V.joined) return;
    V.error = '';
    if (!V.available()) { V.error = 'O teu navegador não suporta chamadas de voz (é preciso HTTPS).'; V.onChange(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch (e) { V.error = 'Sem acesso ao microfone. Permite o microfone no navegador e tenta de novo.'; V.onChange(); return; }
    stream.getAudioTracks().forEach((t) => { t.enabled = !V.muted; });
    V.joined = true; if (V.send) V.send({ t: 'vjoin' }); V.onChange();
  };
  V.leave = () => {
    if (!V.joined) return;
    V.joined = false;
    for (const id of [...peers.keys()]) closePeer(id);
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (V.send) V.send({ t: 'vleave' });
    V.onChange();
  };
  V.toggleMute = () => { V.muted = !V.muted; if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = !V.muted; }); V.onChange(); };
  /* depois de reconectar ao servidor, voltar a anunciar que estamos na chamada */
  V.resume = () => { if (V.joined && V.send) V.send({ t: 'vjoin' }); };
  root.Voice = V;
})(typeof window !== 'undefined' ? window : this);
