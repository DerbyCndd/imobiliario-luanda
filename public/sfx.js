/* Imobiliário Luanda - efeitos sonoros sintetizados (Web Audio, sem ficheiros). window.SFX */
(function (root) {
  'use strict';
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('imobl_mute') === '1'; } catch (e) {}

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }
  /* os navegadores só deixam tocar depois de um toque/clique do utilizador */
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => root.addEventListener(ev, ensure, { passive: true }));

  function tone(freq, t0, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + (o.atk || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noise(t0, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.playbackRate.value = o.rate || 1;
    f.type = o.ftype || 'bandpass'; f.frequency.value = o.freq || 2000; f.Q.value = o.q || 1;
    const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }
  const play = (fn) => () => { if (muted || !ensure()) return; try { fn(ctx.currentTime + 0.01); } catch (e) {} };

  const SFX = {
    /* dados a rolar e a bater na mesa */
    dice: play((t) => {
      let at = 0;
      for (let i = 0; i < 16; i++) {
        at += 0.035 + Math.random() * 0.05 + i * 0.006;
        noise(t + at, 0.05, { freq: 1500 + Math.random() * 2500, q: 2.5, vol: 0.28 * (1 - i / 22) });
        tone(300 + Math.random() * 500, t + at, 0.04, { type: 'triangle', vol: 0.06 });
      }
      tone(150, t + at + 0.04, 0.12, { type: 'sine', to: 70, vol: 0.28 });
      tone(180, t + at + 0.16, 0.09, { type: 'sine', to: 90, vol: 0.2 });
    }),
    /* passo da peça (madeira) */
    step: play((t) => {
      tone(520, t, 0.07, { type: 'triangle', to: 300, vol: 0.2 });
      noise(t, 0.03, { freq: 3500, q: 1, vol: 0.12 });
    }),
    gain: play((t) => { tone(1318, t, 0.14, { vol: 0.2 }); tone(1760, t + 0.07, 0.22, { vol: 0.2 }); }),
    pay: play((t) => { tone(740, t, 0.14, { vol: 0.2 }); tone(494, t + 0.09, 0.22, { vol: 0.2 }); }),
    buy: play((t) => { tone(523, t, 0.1, { type: 'triangle', vol: 0.22 }); tone(659, t + 0.08, 0.1, { type: 'triangle', vol: 0.22 }); tone(988, t + 0.16, 0.3, { type: 'triangle', vol: 0.25 }); noise(t + 0.16, 0.05, { freq: 6000, vol: 0.1 }); }),
    card: play((t) => { noise(t, 0.22, { ftype: 'highpass', freq: 1800, vol: 0.18, rate: 1.4 }); tone(660, t + 0.18, 0.18, { type: 'triangle', vol: 0.12 }); }),
    jail: play((t) => { tone(110, t, 0.5, { type: 'square', to: 80, vol: 0.14 }); tone(220, t + 0.05, 0.4, { type: 'triangle', vol: 0.16 }); noise(t, 0.15, { freq: 900, vol: 0.2 }); }),
    bell: play((t) => { tone(1046, t, 0.7, { type: 'triangle', vol: 0.22 }); tone(2093, t, 0.4, { vol: 0.08 }); }),
    turn: play((t) => { tone(880, t, 0.16, { vol: 0.2 }); tone(1175, t + 0.13, 0.3, { vol: 0.22 }); }),
    /* martelo do juiz */
    gavel: play((t) => { [0, 0.2, 0.4].forEach((d) => { tone(170, t + d, 0.1, { type: 'sine', to: 70, vol: 0.4 }); noise(t + d, 0.04, { freq: 1200, vol: 0.25 }); }); }),
    alert: play((t) => { tone(700, t, 0.12, { type: 'square', vol: 0.1 }); tone(520, t + 0.14, 0.18, { type: 'square', vol: 0.1 }); }),
    join: play((t) => { tone(587, t, 0.1, { vol: 0.18 }); tone(784, t + 0.09, 0.2, { vol: 0.18 }); }),
    leave: play((t) => { tone(784, t, 0.1, { vol: 0.15 }); tone(523, t + 0.09, 0.2, { vol: 0.15 }); }),
    win: play((t) => { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.13, 0.35, { type: 'triangle', vol: 0.22 })); }),
    isMuted: () => muted,
    setMuted(m) { muted = !!m; try { localStorage.setItem('imobl_mute', muted ? '1' : '0'); } catch (e) {} if (!muted) { ensure(); SFX.step(); } },
  };
  root.SFX = SFX;
})(typeof window !== 'undefined' ? window : this);
