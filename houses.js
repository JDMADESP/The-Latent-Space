// The 25 buildings your pets can live in. Each house draws itself in local coordinates:
// x = 0 is the centre, y = 0 is the ground line, and the building extends upward (negative y).
//   hw      half-width (for click detection)
//   height  how tall it is; the pet column starts just above this
//   emit    ambient particles: { type, x, y, rate (per sec), when: 'home' | 'always' }
//   draw(st) st = { t, home: [skins of pets inside], out, hot (hovered), open (door open) }
(function () {
  'use strict';
  const { R, box, circle, text, line, alpha, star } = window.Sprites;
  const TITLE = 'THE LATENT SPACE';
  const NEON = ['#ff3fd0', '#4ff6ff', '#ffe14d', '#8d5bff', '#5dff9b'];

  // ───────────── shared parts ─────────────
  function sign(y, o, st) {
    const x = -35, w = 70, h = 9;
    if (o.glow) alpha(st.hot ? 0.4 : 0.22, () => R(x - 2, y - 2, w + 4, h + 4, o.glow));
    if (o.notch) {
      for (const sx of [x - 5, x + w]) { R(sx, y + 2, 5, h - 2, o.border); R(sx + 1, y + 3, 3, h - 4, o.bg); }
    }
    R(x, y, w, h, o.border);
    R(x + 1, y + 1, w - 2, h - 2, o.bg);
    if (o.bulbs) {
      for (let i = 0, bx = x + 1; bx < x + w - 1; bx += 3, i++) {
        const on = (((i - Math.floor(st.t * 8)) % 3) + 3) % 3 === 0;
        const c = on ? '#fff6b0' : '#9a7a28';
        R(bx, y, 1, 1, c); R(bx, y + h - 1, 1, 1, c);
      }
    }
    const shine = o.shimmer === false ? -9 : Math.floor(st.t * 8) % (TITLE.length + 10);
    for (let i = 0; i < TITLE.length; i++) {
      const c = i === shine || i === shine - 1 ? (o.hi || '#ffffff') : st.hot ? (o.hot || o.hi || '#ffffff') : o.text;
      text(TITLE[i], -31 + i * 4, y + 2, c);
    }
  }

  function peek(x, y, w, h, st, k) {
    const list = st.home.filter((_, j) => j % 2 === k).slice(0, w >= 10 ? 2 : 1);
    list.forEach((skin, j) => {
      const b = Math.floor(st.t * 2 + j + k) % 2;
      const sw = Math.max(2, Math.min(4, Math.floor(w / list.length) - 1));
      const sx = x + 1 + j * (sw + 1);
      const sh = Math.min(h - 1, 5);
      R(sx, y + h - sh + b, sw, sh - b, skin.pal.dark);
      if (sw >= 3 && sh >= 4) { R(sx + 1, y + h - sh + b + 1, 1, 1, '#fff6d0'); R(sx + sw - 1, y + h - sh + b + 1, 1, 1, '#fff6d0'); }
    });
  }

  function win(x, y, w, h, st, k, o = {}) {
    const ol = o.ol || '#2a1a14';
    R(x - 1, y - 1, w + 2, h + 2, ol);
    const lit = o.always || st.home.length > 0;
    R(x, y, w, h, lit ? (o.lit || '#ffd36b') : (o.dark || '#2c3e6b'));
    if (lit) { R(x, y, w, Math.min(2, h), o.lit2 || '#ffe9a8'); if (st.home.length) peek(x, y, w, h, st, k); }
    else R(x + 1, y + 1, Math.min(2, w - 2), 1, o.glint || '#4d6aa8');
    if (o.mullion !== false && w >= 6) { R(x + Math.floor(w / 2), y, 1, h, ol); if (h >= 6) R(x, y + Math.floor(h / 2), w, 1, ol); }
  }

  function door(x, y, w, h, col, st, o = {}) {
    const ol = o.ol || '#2a1a14';
    R(x - 1, y - 1, w + 2, h + 1, ol);
    if (st.open) { R(x, y, w, h, '#1d1228'); R(x, y + h - 2, w, 2, o.light || '#ffcf6b'); return; }
    R(x, y, w, h, col);
    if (o.panels !== false && w >= 8 && h >= 10) {
      const d = o.panel || 'rgba(255,255,255,0.12)';
      R(x + 1, y + 1, Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, d);
      R(x + Math.ceil(w / 2), y + 1, Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, d);
    }
    R(x + w - 3, y + Math.floor(h / 2) + 1, 1, 1, o.knob || '#ffd36b');
  }

  function grass(hw) { R(-hw - 2, 0, hw * 2 + 4, 2, '#3f7d3a'); R(-hw, 0, hw * 2, 1, '#62b34f'); }
  function pavement(hw, c = '#3b3b44', e = '#6a6a75') { R(-hw - 2, 0, hw * 2 + 4, 2, c); R(-hw, 0, hw * 2, 1, e); }
  function bricks(x, y, w, h, c, step = 3) {
    for (let yy = y + step - 1, row = 0; yy < y + h; yy += step, row++) {
      R(x, yy, w, 1, c);
      for (let xx = x + (row % 2) * 3; xx < x + w; xx += 6) R(xx, yy - step + 1, 1, step - 1, c);
    }
  }
  // triangle/trapezoid roof, row by row; hwAt(r) gives half-width at row r
  function roof(y0, rows, hwAt, colorAt, ol) {
    for (let r = 0; r < rows; r++) {
      const hw = hwAt(r), y = y0 + r;
      R(-hw - 1, y, hw * 2 + 2, 1, ol);
      R(-hw, y, hw * 2, 1, colorAt(r));
    }
  }
  function dome(cx, cy, r, fill, ol) {
    for (let dy = -r; dy <= 0; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      R(cx - w - 1, cy + dy, w * 2 + 3, 1, ol);
    }
    for (let dy = -r + 1; dy <= 0; dy++) {
      const w = Math.floor(Math.sqrt((r - 1) * (r - 1) - dy * dy));
      R(cx - w, cy + dy, w * 2 + 1, 1, fill);
    }
  }
  function flag(x, y, c, t) {
    R(x, y, 1, 7, '#2a2a30');
    const f = Math.floor(t * 4) % 2;
    R(x + 1, y, 4, 2, c); R(x + 5, y + f, 1, 2, c);
  }
  function waves(hw, t, y = -2) {
    R(-hw - 2, y, hw * 2 + 4, 4, '#2a6fb0');
    R(-hw - 2, y + 2, hw * 2 + 4, 2, '#1f5a94');
    for (let x = -hw - 2; x < hw + 2; x += 6) R(x + Math.floor(t * 6) % 6, y, 2, 1, '#cfe9ff');
  }

  function roofAt(cx, y0, rows, hwAt, colorAt, ol) {
    for (let r = 0; r < rows; r++) {
      const hw = hwAt(r), y = y0 + r;
      R(cx - hw - 1, y, hw * 2 + 2, 1, ol);
      R(cx - hw, y, hw * 2, 1, colorAt(r));
    }
  }

  let flickerIdx = -1, flickerUntil = 0;

  // ───────────── the 25 houses ─────────────
  const HOUSES = [
    // 1 ─ Nightclub
    { id: 'nightclub', name: 'Nightclub', hw: 46, height: 46,
      emit: [{ type: 'note', x: [-40, 40], y: -46, rate: 1.4, when: 'home' }],
      draw(st) {
        const ol = '#07040d', t = st.t, thump = (t * 2) % 1 < 0.15;
        R(-54, 0, 108, 2, '#1c1729');
        alpha(0.5, () => { R(-32, 1, 8, 1, '#ff3fd0'); R(24, 1, 8, 1, '#4ff6ff'); R(-6, 1, 12, 1, '#c0213c'); });
        R(-43, -41, 86, 41, ol); R(-42, -40, 84, 40, '#1d1733');
        bricks(-42, -38, 84, 37, '#16112a');
        R(-46, -44, 92, 4, ol); R(-45, -43, 90, 2, '#2d2450');
        for (let i = 0, x = -44; x < 44; x += 4, i++) {
          const on = (((i - Math.floor(t * 10)) % 4) + 4) % 4 === 0;
          R(x, -43, 2, 1, on ? NEON[i % NEON.length] : '#4a3c70');
        }
        R(-11, -46, 22, 2, ol); R(-10, -46, 20, 1, st.out ? (thump ? '#ffffff' : '#e7c8ff') : '#3a3060');
        // neon sign
        alpha(st.hot ? 0.35 : 0.2, () => R(-36, -39, 72, 15, '#4ff6ff'));
        R(-35, -38, 70, 13, '#4ff6ff'); R(-34, -37, 68, 11, '#0d0820');
        if (t > flickerUntil && Math.random() < 0.01) { flickerIdx = Math.floor(Math.random() * TITLE.length); flickerUntil = t + 0.1 + Math.random() * 0.4; }
        if (t > flickerUntil) flickerIdx = -1;
        const pink = st.hot ? '#ffd0f6' : thump ? '#ff9cec' : '#ff5fdc';
        alpha(0.18, () => { for (let i = 0; i < TITLE.length; i++) if (i !== flickerIdx) { text(TITLE[i], -32 + i * 4, -34, '#ff3fd0'); text(TITLE[i], -30 + i * 4, -34, '#ff3fd0'); } });
        for (let i = 0; i < TITLE.length; i++) text(TITLE[i], -31 + i * 4, -34, i === flickerIdx ? '#4a2546' : pink);
        text('VIP', -5, -24, thump ? '#fff6b0' : '#ffd34d');
        // porthole windows
        [[-28, 0], [28, 1]].forEach(([wx, k]) => {
          const wy = -15;
          circle(wx, wy, 6, ol);
          circle(wx, wy, 5, NEON[(Math.floor(t * 2) + k * 2) % NEON.length]);
          alpha(0.35, () => circle(wx, wy, 3, '#ffffff'));
          st.home.filter((_, j) => j % 2 === k).slice(0, 2).forEach((s, j) => {
            const hop = Math.floor(t * 4 + j) % 2;
            R(wx - 3 + j * 4, wy - 1 + hop, 3, 6 - hop, s.pal.dark);
          });
          R(wx - 6, wy - 1, 13, 1, ol); R(wx - 1, wy - 6, 1, 13, ol);
        });
        // door
        R(-10, -19, 20, 19, thump && st.home.length ? '#c08bff' : '#8d5bff');
        R(-9, -18, 18, 18, '#0b0716');
        if (st.home.length || st.open) {
          alpha(0.6 + (thump ? 0.3 : 0), () => R(-7, -16, 14, 14, NEON[Math.floor(t * 4) % NEON.length]));
          R(-5, -14, 10, 12, '#0b0716');
        } else R(-1, -18, 2, 18, '#1a1130');
        R(-3, -9, 1, 2, '#ffd34d'); R(2, -9, 1, 2, '#ffd34d');
        // velvet rope + carpet
        R(-8, 0, 16, 2, '#c0213c');
        for (const px of [-19, 18]) { R(px, -7, 2, 7, '#ffd34d'); R(px - 1, -8, 4, 1, '#fff0a0'); }
        for (const [x0, x1] of [[-17, -10], [10, 18]]) for (let x = x0; x < x1; x++) R(x, -6 + Math.round(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 2), 1, 1, '#d0213c');
      } },

    // 2 ─ Cottage
    { id: 'cottage', name: 'Cottage', hw: 46, height: 48,
      emit: [{ type: 'smoke', x: 25, y: -55, rate: 2.5, when: 'always' }],
      draw(st) {
        const ol = '#2a1a14';
        grass(46);
        R(-37, -31, 74, 31, ol); R(-36, -30, 72, 30, '#f3e4c8');
        for (let x = -30; x < 36; x += 6) R(x, -19, 1, 14, '#e5d2ae');
        R(-36, -5, 72, 5, '#b9a58a'); for (let x = -34; x < 34; x += 7) R(x, -3, 4, 1, '#9e8b72');
        box(21, -54, 9, 14, '#a5543b', ol); R(21, -55, 9, 2, ol);
        roof(-46, 16, r => 42 + Math.floor(r / 4), r => (Math.floor(r / 3) % 2 ? '#b5523b' : '#c4644a'), ol);
        for (let r = 2; r < 16; r += 3) for (let x = -40 + (r % 2) * 3; x < 40; x += 7) R(x, -46 + r, 1, 1, '#8a3a28');
        R(-46, -31, 92, 1, ol);
        R(-43, -48, 86, 3, ol); R(-42, -47, 84, 1, '#b07a52'); R(-42, -46, 84, 1, '#8a5a3b');
        const LC = ['#ff5d73', '#ffd34d', '#5dd4ff', '#8dff6b'];
        for (let i = 0, x = -43; x < 44; x += 5, i++) R(x, -30, 1, 1, (i + Math.floor(st.t * 3)) % 3 ? LC[i % 4] : '#5a4a50');
        sign(-28, { bg: '#6b4a2f', border: ol, text: '#ffe39a' }, st);
        win(-29, -17, 12, 10, st, 0); win(17, -17, 12, 10, st, 1);
        R(-31, -7, 16, 2, '#8a5a3b'); R(15, -7, 16, 2, '#8a5a3b');
        door(-6, -16, 12, 16, '#8f5530', st);
        R(-16, -5, 6, 5, ol); R(-15, -5, 4, 4, '#c0613a'); R(-14, -10, 1, 5, '#3f9a45'); R(-16, -9, 2, 1, '#55c25b'); R(-13, -8, 2, 1, '#55c25b');
        R(13, -8, 1, 8, ol); box(10, -12, 8, 5, '#e2483d', ol); R(17, -14, 1, 3, '#ffd34d');
      } },

    // 3 ─ Stadium
    { id: 'stadium', name: 'Stadium', hw: 64, height: 50,
      emit: [{ type: 'confetti', x: [-50, 50], y: -50, rate: 4, when: 'home' }],
      draw(st) {
        const ol = '#1a1d26', t = st.t;
        R(-66, 0, 132, 2, '#2f6b2f');
        // floodlights
        for (const x of [-61, 59]) {
          R(x, -50, 2, 50, '#3a3f4d');
          R(x - 3, -54, 8, 5, ol); R(x - 2, -53, 6, 3, '#fffbe0');
          alpha(0.18, () => circle(x + 1, -52, 6, '#fffbe0'));
        }
        // upper tier with the crowd doing the wave
        const CROWD = ['#ff5d73', '#ffd34d', '#5dd4ff', '#ffffff', '#8dff6b'];
        for (let r = 0; r < 10; r++) {
          const y = -36 + r, hw = 48 + r;
          R(-hw - 1, y, hw * 2 + 2, 1, ol); R(-hw, y, hw * 2, 1, '#5a6275');
          if (r % 2 === 0) for (let x = -hw + 1; x < hw - 1; x += 2) {
            const up = Math.sin(x / 9 - t * 5) > 0.85 ? -1 : 0;
            R(x, y + up, 1, 1, CROWD[Math.abs(x * 7 + r * 13) % CROWD.length]);
          }
        }
        R(-50, -38, 100, 2, '#e6e9f0'); R(-51, -39, 102, 1, ol);
        // lower bowl
        R(-58, -26, 116, 26, ol); R(-57, -25, 114, 25, '#8d94a6'); R(-57, -26, 114, 2, '#c9ced9');
        for (let x = -52; x < 52; x += 10) { if (Math.abs(x + 3) < 8) continue; R(x, -14, 6, 14, '#3a3f4d'); R(x + 1, -15, 4, 1, '#3a3f4d'); }
        R(-7, -15, 14, 15, ol); R(-6, -14, 12, 14, st.open || st.home.length ? '#ffcf6b' : '#1c1f28');
        if (st.home.length) peek(-6, -14, 12, 14, st, 0);
        R(-57, -20, 114, 1, '#5dd4ff');
        // scoreboard
        R(-2, -40, 4, 2, ol);
        sign(-48, { bg: '#05070a', border: '#2b2f3a', text: '#ffd34d', hi: '#ffffff' }, st);
      } },

    // 4 ─ Apartments
    { id: 'apartments', name: 'Apartments', hw: 40, height: 58,
      emit: [{ type: 'z', x: [-30, 30], y: -45, rate: 0.6, when: 'home' }],
      draw(st) {
        const ol = '#1f1414', t = st.t;
        pavement(42);
        box(18, -67, 11, 8, '#7a5230', ol); R(19, -59, 1, 2, ol); R(27, -59, 1, 2, ol); R(18, -68, 11, 1, '#5a3a20');
        R(-37, -57, 74, 57, ol); R(-36, -56, 72, 56, '#a34a3a');
        bricks(-36, -54, 72, 52, '#8f3f31');
        R(-38, -58, 76, 3, '#d8c8b0'); R(-38, -59, 76, 1, ol);
        for (const [f, y] of [[0, -52], [1, -42]]) for (let c = 0; c < 5; c++) {
          const x = -31 + c * 13;
          const seed = (c * 31 + f * 17) % 7;
          const lit = st.home.length ? seed < 5 : seed < 2 || Math.floor(t / 2 + seed) % 5 === 0;
          win(x, y, 8, 7, st, (c + f) % 2, { ol, always: lit, mullion: false });
          R(x - 2, y + 8, 12, 1, '#d8c8b0');
        }
        sign(-31, { bg: '#1a2a2a', border: '#d8c8b0', text: '#ffe39a' }, st);
        win(-31, -17, 9, 8, st, 0, { ol }); win(22, -17, 9, 8, st, 1, { ol });
        box(-11, -19, 22, 4, '#2e7d5b', ol); for (let x = -9; x < 10; x += 4) R(x, -18, 2, 2, '#f5efe6');
        door(-5, -14, 10, 14, '#3a2a20', st, { ol });
        // fire escape
        for (const y of [-45, -35, -24]) { R(28, y, 9, 1, '#2a2a30'); R(28, y - 3, 1, 3, '#2a2a30'); R(36, y - 3, 1, 3, '#2a2a30'); }
      } },

    // 5 ─ Skyscraper
    { id: 'skyscraper', name: 'Skyscraper', hw: 38, height: 72,
      emit: [],
      draw(st) {
        const ol = '#0d1420', t = st.t;
        pavement(40);
        R(-21, -68, 42, 52, ol); R(-20, -67, 40, 51, '#2b4a73');
        for (let y = -65, row = 0; y < -18; y += 4, row++) for (let x = -18, col = 0; x < 18; x += 4, col++) {
          const lit = ((row * 7 + col * 3 + Math.floor(t / 4)) % 6 === 0) || (st.home.length && (row * 5 + col) % 3 === 0);
          R(x, y, 3, 2, lit ? '#ffe9a0' : (row + col) % 5 === 0 ? '#7ea8d6' : '#5a86b8');
        }
        for (let i = 0; i < 12; i++) R(-16 + i, -60 + i * 3, 1, 2, 'rgba(255,255,255,0.25)');
        R(-15, -72, 30, 5, ol); R(-14, -71, 28, 3, '#9fb6d1');
        R(12, -82, 1, 10, '#9fb6d1'); R(12, -83, 1, 1, Math.floor(t * 1.5) % 2 ? '#ff3b3b' : '#5a1010');
        // lobby
        R(-37, -17, 74, 17, ol); R(-36, -16, 72, 16, '#1b2233');
        sign(-16, { bg: '#05070a', border: '#3a4a66', text: '#4ff6ff', hi: '#ffffff' }, st);
        const o = st.open ? 5 : 0;
        R(-9, -6, 18, 6, ol); R(-8, -5, 16, 5, st.open ? '#ffcf6b' : '#7fb4e0');
        R(-8 - o, -5, 8, 5, 'rgba(160,210,240,0.9)'); R(o, -5, 8, 5, 'rgba(160,210,240,0.9)');
        R(-1 - o, -5, 1, 5, ol); R(o, -5, 1, 5, ol);
        for (const x of [-30, 22]) win(x, -6, 8, 5, st, x > 0 ? 1 : 0, { ol, lit: '#ffe9a0', mullion: false });
      } },

    // 6 ─ Castle
    { id: 'castle', name: 'Castle', hw: 52, height: 62,
      emit: [],
      draw(st) {
        const ol = '#1e1e24', stone = '#9a9aa6', t = st.t;
        grass(52);
        for (const tx of [-50, 36]) {
          R(tx, -48, 14, 48, ol); R(tx + 1, -47, 12, 47, stone);
          bricks(tx + 1, -46, 12, 46, '#7c7c88', 4);
          roofAt(tx + 7, -60, 12, r => 1 + Math.round(r * 7 / 11), r => (r % 3 ? '#3c5ccf' : '#2e48aa'), ol);
          flag(tx + 7, -67, tx < 0 ? '#e0343c' : '#ffd34d', t);
          win(tx + 5, -38, 3, 6, st, tx < 0 ? 0 : 1, { ol, mullion: false });
        }
        R(-36, -34, 72, 34, ol); R(-35, -33, 70, 33, stone);
        bricks(-35, -32, 70, 32, '#7c7c88', 4);
        for (let x = -35; x < 35; x += 6) { R(x, -38, 4, 4, ol); R(x + 1, -37, 2, 3, stone); }
        sign(-31, { bg: '#7a1a2a', border: '#3a0a12', text: '#ffd34d', notch: true }, st);
        R(-10, -20, 20, 20, ol); R(-8, -21, 16, 1, ol);
        R(-9, -19, 18, 19, st.open ? '#1d1228' : '#2a1c14');
        if (st.open) R(-9, -2, 18, 2, '#ffcf6b');
        else { for (let x = -8; x < 9; x += 3) R(x, -19, 1, 19, '#5a5a66'); for (let y = -17; y < 0; y += 4) R(-9, y, 18, 1, '#5a5a66'); }
        for (const x of [-26, 20]) win(x, -16, 5, 7, st, x > 0 ? 1 : 0, { ol, mullion: false });
      } },
    // 7 ─ Treehouse
    { id: 'treehouse', name: 'Treehouse', hw: 48, height: 60,
      emit: [{ type: 'leaf', x: [-44, 44], y: -50, rate: 0.8, when: 'always' }],
      draw(st) {
        const ol = '#2a1a10';
        grass(48);
        for (const [x, y, r] of [[-34, -50, 13], [34, -52, 14], [-22, -62, 10], [22, -63, 10]]) circle(x, y, r + 1, '#163d1f');
        for (const [x, y, r] of [[-34, -50, 13], [34, -52, 14], [-22, -62, 10], [22, -63, 10]]) { circle(x, y, r, '#2f7a3a'); circle(x - 3, y - 3, r - 5, '#3f9a45'); }
        R(-7, -34, 14, 34, ol); R(-6, -34, 12, 34, '#7a4a2a');
        for (let y = -30; y < 0; y += 5) R(-4 + (y % 2 ? 0 : 5), y, 1, 3, '#5a3418');
        R(-10, -2, 4, 2, '#7a4a2a'); R(6, -2, 4, 2, '#7a4a2a');
        R(9, -32, 1, 32, '#a0703f'); R(14, -32, 1, 32, '#a0703f'); for (let y = -30; y < 0; y += 4) R(9, y, 6, 1, '#a0703f');
        R(-26, -50, 52, 16, ol); R(-25, -49, 50, 15, '#c08a52');
        for (let y = -46; y < -34; y += 3) R(-25, y, 50, 1, '#a0703f');
        roof(-60, 11, r => 6 + Math.floor(r * 2.4), r => (r % 3 ? '#b5523b' : '#9a4230'), ol);
        R(-36, -34, 72, 3, ol); R(-35, -33, 70, 1, '#a0703f');
        win(-20, -46, 8, 7, st, 0, { ol }); win(12, -46, 8, 7, st, 1, { ol });
        door(-4, -46, 8, 12, '#7a4a2a', st, { ol, panels: false });
        R(-30, -31, 1, 2, '#d0b080'); R(29, -31, 1, 2, '#d0b080');
        sign(-29, { bg: '#8a5a2b', border: ol, text: '#ffe39a' }, st);
      } },

    // 8 ─ Lighthouse
    { id: 'lighthouse', name: 'Lighthouse', hw: 44, height: 72,
      emit: [],
      draw(st) {
        const ol = '#1a1a22', t = st.t;
        // rotating beam
        const a = Math.sin(t * 1.2);
        alpha(0.22, () => {
          const c = window.Sprites.getCtx(); c.fillStyle = '#fff3a0';
          c.beginPath(); c.moveTo(0, -62); c.lineTo(a * 80, -70); c.lineTo(a * 80, -54); c.closePath(); c.fill();
        });
        waves(46, t, -2);
        for (const [x, r] of [[-34, 5], [32, 6], [-20, 4], [20, 4]]) { circle(x, -2, r + 1, ol); circle(x, -2, r, '#6a6a75'); }
        for (let r = 0; r < 36; r++) {
          const y = -21 - r, hw = 10 - Math.floor(r * 3 / 35);
          R(-hw - 1, y, hw * 2 + 2, 1, ol);
          R(-hw, y, hw * 2, 1, Math.floor(r / 6) % 2 ? '#e8e8ee' : '#d23b3b');
        }
        win(-2, -44, 4, 6, st, 0, { ol, mullion: false });
        R(-11, -58, 22, 2, ol); for (let x = -10; x <= 10; x += 3) R(x, -61, 1, 3, ol); R(-10, -61, 21, 1, ol);
        R(-6, -66, 12, 8, ol); R(-5, -65, 10, 6, Math.floor(t * 2) % 2 ? '#fff3b0' : '#ffe066');
        roofAt(0, -71, 5, r => 1 + r, () => '#d23b3b', ol);
        R(-38, -20, 76, 20, ol); R(-37, -19, 74, 19, '#e8e2d4');
        sign(-19, { bg: '#1f3a5a', border: ol, text: '#ffffff', hi: '#9fe0ff', hot: '#cfefff' }, st);
        win(-30, -8, 8, 6, st, 0, { ol }); win(22, -8, 8, 6, st, 1, { ol });
        door(-4, -9, 8, 9, '#1f3a5a', st, { ol, panels: false });
        waves(46, t + 0.5, 0);
      } },

    // 9 ─ UFO
    { id: 'ufo', name: 'UFO', hw: 48, height: 46,
      emit: [{ type: 'spark', x: [-20, 20], y: -6, rate: 5, when: 'always' }],
      draw(st) {
        const ol = '#141826', t = st.t;
        const b = Math.round(Math.sin(t * 2) * 2);
        R(-40, 0, 80, 2, '#2a2438'); R(-24, 0, 48, 1, '#3a3450');
        alpha(0.18, () => { for (let y = -12 + b; y < 0; y++) { const hw = 10 + Math.floor((y + 12 - b) * 1.3); R(-hw, y, hw * 2, 1, '#7dff9b'); } });
        circle(0, -27 + b, 14, ol); circle(0, -27 + b, 13, '#9fe8ff');
        alpha(0.5, () => circle(-4, -32 + b, 4, '#ffffff'));
        st.home.slice(0, 4).forEach((s, j) => {
          const hop = Math.floor(t * 3 + j) % 2;
          R(-9 + j * 5, -30 + b + hop, 4, 7 - hop, s.pal.main); R(-8 + j * 5, -28 + b + hop, 1, 1, '#fff'); R(-6 + j * 5, -28 + b + hop, 1, 1, '#fff');
        });
        R(-44, -24 + b, 88, 10, ol); R(-46, -22 + b, 92, 6, ol);
        R(-45, -21 + b, 90, 4, '#b8bfcc'); R(-43, -23 + b, 86, 2, '#e3e7ef');
        R(-36, -21 + b, 72, 7, '#1b2233');
        for (let i = 0; i < TITLE.length; i++) text(TITLE[i], -31 + i * 4, -20 + b, st.hot ? '#d6ffe2' : '#7dff9b');
        for (const [i, x] of [[0, -42], [1, -39], [2, 38], [3, 41]]) R(x, -19 + b, 2, 1, Math.floor(t * 4 + i) % 2 ? '#ffe14d' : '#ff3fd0');
        R(-30, -14 + b, 60, 3, ol); R(-29, -14 + b, 58, 2, '#7d8597');
        R(-8, -12 + b, 16, 2, st.open ? '#ffffff' : '#7dff9b');
      } },

    // 10 ─ Igloo
    { id: 'igloo', name: 'Igloo', hw: 44, height: 38,
      emit: [{ type: 'snow', x: [-60, 60], y: -80, rate: 8, when: 'always' }],
      draw(st) {
        const ol = '#5a7a99', t = st.t;
        R(-48, 0, 96, 2, '#e8f4ff');
        dome(0, 0, 36, '#eaf6ff', ol);
        for (let y = -6, row = 0; y > -34; y -= 6, row++) {
          const w = Math.floor(Math.sqrt(35 * 35 - y * y));
          R(-w, y, w * 2, 1, '#b8d4ea');
          for (let x = -w + (row % 2) * 5; x < w; x += 10) R(x, y, 1, 6, '#b8d4ea');
        }
        for (let y = -34; y < 0; y++) { const w = Math.floor(Math.sqrt(35 * 35 - y * y)); R(w - 6, y, 6, 1, 'rgba(160,200,230,0.35)'); }
        sign(-22, { bg: '#bfe3ff', border: ol, text: '#1d3a5a', hi: '#3a8ad8', hot: '#0d2440', notch: true }, st);
        dome(0, 0, 10, '#dff0fb', ol);
        dome(0, 0, 6, st.home.length || st.open ? '#ffcf6b' : '#1d2a3a', ol);
        if (st.home.length) peek(-5, -5, 10, 5, st, 0);
        const w = Math.floor(t * 3) % 2;
        R(36, -9 + w, 5, 9 - w, '#1a1a2a'); R(37, -7 + w, 3, 6 - w, '#ffffff'); R(38, -8 + w, 1, 1, '#ffffff'); R(41, -7 + w, 2, 1, '#ff9a2e'); R(37, 0, 2, 1, '#ff9a2e');
      } },

    // 11 ─ Barn
    { id: 'barn', name: 'Barn', hw: 48, height: 60,
      emit: [],
      draw(st) {
        const ol = '#2a0e0c', t = st.t;
        grass(48);
        R(-1, -60, 1, 8, ol); R(-3, -61, 5, 2, ol); R(1, -63, 2, 2, ol); R(-3, -60, 1, 1, '#d23b3b');
        roof(-52, 22, r => Math.min(38, r < 8 ? 14 + r * 3 : 38), r => (r % 3 === 0 ? '#5a5a64' : '#6e6e7a'), ol);
        R(-34, -30, 68, 30, ol); R(-33, -29, 66, 29, '#b8352f');
        for (let x = -31; x < 33; x += 4) R(x, -29, 1, 29, '#9e2c27');
        R(-6, -47, 12, 11, '#f2efe6'); R(-5, -46, 10, 9, st.home.length ? '#ffd36b' : '#7a2420');
        if (st.home.length) peek(-5, -46, 10, 9, st, 0);
        sign(-29, { bg: '#f2efe6', border: ol, text: '#b8352f', hi: '#2a0e0c', hot: '#7a2420' }, st);
        R(-13, -19, 26, 19, '#f2efe6');
        if (st.open) { R(-12, -18, 24, 18, '#2a1a10'); R(-12, -4, 24, 4, '#e2c25a'); }
        else {
          for (const dx of [-12, 1]) {
            R(dx, -18, 11, 18, '#b8352f');
            line(dx, -18, dx + 10, -1, '#f2efe6'); line(dx + 10, -18, dx, -1, '#f2efe6');
          }
          R(-1, -18, 2, 18, '#f2efe6');
        }
        win(-28, -16, 7, 7, st, 0, { ol, lit2: '#ffe9a8' }); win(21, -16, 7, 7, st, 1, { ol });
        box(36, -8, 11, 8, '#e2c25a', '#7a6020'); R(37, -5, 9, 1, '#c9a540');
      } },

    // 12 ─ Diner
    { id: 'diner', name: 'Diner', hw: 50, height: 42,
      emit: [],
      draw(st) {
        const ol = '#1a2a2a', t = st.t;
        pavement(50);
        R(-26, -32, 1, 4, ol); R(25, -32, 1, 4, ol);
        sign(-41, { bg: '#1b1020', border: '#d23b3b', text: '#ff5d73', glow: '#ff3b5c', hi: '#ffd0d8' }, st);
        box(-47, -28, 94, 28, '#cfe6e6', ol);
        R(-45, -27, 90, 1, '#ffffff');
        for (let x = -46; x < 46; x += 2) R(x, -5 + ((x / 2) % 2 ? 0 : 1), 2, 1, '#1a1a22');
        R(-46, -5, 92, 1, '#1a1a22'); R(-46, -3, 92, 1, '#f5efe6');
        R(-46, -9, 92, 2, '#d23b3b');
        [-42, -29, 19, 32].forEach((x, i) => {
          win(x, -23, 10, 10, st, i % 2, { ol, always: true, lit: '#fff0c4', lit2: '#ffffff', mullion: false });
          if (!st.home.length) { R(x + 2, -16, 2, 3, '#d23b3b'); R(x + 6, -16, 2, 3, '#d23b3b'); }
        });
        door(-6, -24, 12, 20, '#9fd8d8', st, { ol, panels: false, knob: '#d23b3b' });
        R(-4, -22, 8, 6, st.open ? '#1d1228' : '#e8f8f8');
      } },

    // 13 ─ Arcade
    { id: 'arcade', name: 'Arcade', hw: 46, height: 46,
      emit: [{ type: 'spark', x: [-20, 20], y: -10, rate: 2, when: 'home' }],
      draw(st) {
        const ol = '#0a0614', t = st.t;
        R(-48, 0, 96, 2, '#1c1729');
        R(-42, -45, 84, 45, ol); R(-41, -44, 82, 44, '#241a3d');
        bricks(-41, -43, 82, 42, '#1d1533', 4);
        sign(-41, { bg: '#3a0f5a', border: '#ffd34d', text: '#fff6b0', hi: '#ffffff', bulbs: true }, st);
        const INV = ['01000010', '00111100', '01111110', '11011011', '11111111', '10100101'];
        [[-38, 0], [30, 2]].forEach(([ix, k]) => {
          const c = NEON[(Math.floor(t * 2) + k) % NEON.length];
          const f = Math.floor(t * 2) % 2;
          INV.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1' && !(f && y === 5)) R(ix + x, -28 + y, 1, 1, c); }));
          if (f) { R(ix, -23, 1, 1, c); R(ix + 7, -23, 1, 1, c); }
        });
        R(-25, -24, 50, 24, ol); R(-24, -23, 48, 23, '#120a22');
        for (let i = 0; i < 4; i++) {
          const x = -21 + i * 11;
          R(x, -17, 8, 17, '#3a2a5a'); R(x + 1, -15, 6, 4, NEON[(i + Math.floor(t * 6)) % NEON.length]);
          R(x + 1, -9, 6, 1, '#5a4a7a'); R(x + 2, -10, 1, 1, '#ff3b3b'); R(x + 5, -10, 1, 1, '#4ff6ff');
          const s = st.home[i];
          if (s) { const hop = Math.floor(t * 4 + i) % 2; R(x + 2, -6 - hop, 4, 6 + hop, s.pal.main); R(x + 3, -5 - hop, 2, 1, s.pal.dark); }
        }
        alpha(0.25, () => R(-24, -23, 48, 3, '#ffffff'));
        if (st.open) R(-24, -2, 48, 2, '#ffcf6b');
        R(-42, -46, 84, 1, NEON[Math.floor(t * 3) % NEON.length]);
      } },

    // 14 ─ Pagoda
    { id: 'pagoda', name: 'Pagoda', hw: 46, height: 64,
      emit: [{ type: 'leaf', x: [-44, 44], y: -60, rate: 1, when: 'always', color: '#ffb7c8' }],
      draw(st) {
        const ol = '#1a0a08', t = st.t;
        grass(46);
        const eave = (y, hw) => {
          R(-hw + 5, y - 4, hw * 2 - 10, 2, '#3a3a46'); R(-hw + 2, y - 2, hw * 2 - 4, 2, '#3a3a46');
          R(-hw, y, hw * 2, 2, '#2a2a32'); R(-hw - 2, y - 2, 2, 2, '#3a3a46'); R(hw, y - 2, 2, 2, '#3a3a46');
          R(-hw, y + 1, hw * 2, 1, '#d4a52a');
        };
        R(-1, -64, 2, 10, '#d4a52a'); R(-2, -60, 4, 1, '#d4a52a'); R(-2, -57, 4, 1, '#d4a52a');
        R(-11, -52, 22, 6, ol); R(-10, -51, 20, 5, '#b8302a'); win(-3, -51, 6, 4, st, 0, { ol, mullion: false }); eave(-54, 18);
        R(-17, -41, 34, 11, ol); R(-16, -40, 32, 10, '#b8302a'); win(-12, -38, 6, 6, st, 0, { ol }); win(6, -38, 6, 6, st, 1, { ol }); eave(-43, 26);
        R(-23, -27, 46, 17, ol); R(-22, -26, 44, 16, '#b8302a');
        for (let x = -20; x < 22; x += 8) R(x, -26, 2, 16, '#8a2018');
        door(-5, -24, 10, 14, '#5a1a14', st, { ol });
        eave(-29, 33);
        R(-42, -10, 84, 10, ol); R(-41, -9, 82, 9, '#8a8a92'); R(-44, -1, 88, 1, '#6a6a75');
        sign(-10, { bg: '#7a1a14', border: ol, text: '#ffd34d', hi: '#ffffff' }, st);
        for (const x of [-30, 30]) {
          const sw = Math.round(Math.sin(t * 2 + x) * 1);
          R(x, -28, 1, 3, ol); box(x - 2 + sw, -25, 5, 5, '#ff5d3b', ol); R(x + sw, -24, 1, 3, '#ffd36b');
        }
      } },

    // 15 ─ Haunted House
    { id: 'haunted', name: 'Haunted', hw: 48, height: 66,
      emit: [{ type: 'z', x: [-20, 20], y: -30, rate: 0.5, when: 'home' }],
      draw(st) {
        const ol = '#0c0a12', t = st.t;
        circle(-40, -58, 6, '#fff6c8'); R(-42, -60, 2, 2, '#e6dca8'); R(-38, -56, 1, 1, '#e6dca8');
        R(-50, 0, 100, 2, '#4a4a3a'); R(-48, 0, 96, 1, '#5a5a44');
        for (const [x, h] of [[-46, 8], [40, 7]]) { box(x, -h, 6, h, '#7a7a86', ol); R(x + 2, -h + 2, 2, 1, ol); R(x + 2, -h + 1, 1, 3, ol); }
        roofAt(-23, -66, 10, r => Math.round(r * 0.8), () => '#2a2633', ol);
        R(-31, -56, 16, 20, ol); R(-30, -55, 14, 19, '#4a4458');
        for (let r = 0; r < 14; r++) {
          const y = -50 + r, hw = 8 + Math.floor(r * 2.4), sh = Math.floor(r / 5);
          R(-hw - 1 + sh + 6, y, hw * 2 + 2, 1, ol); R(-hw + sh + 6, y, hw * 2, 1, r % 4 ? '#2a2633' : '#3a3445');
        }
        R(-30, -36, 62, 36, ol); R(-29, -35, 60, 35, '#4a4458');
        for (let x = -27; x < 31; x += 4) R(x, -35, 1, 35, '#3e3a4b');
        const g = Math.floor(t * 7) % 9 ? '#9dff6b' : '#3a6a2a';
        win(-26, -51, 6, 7, st, 0, { ol, always: true, lit: g, lit2: '#d0ffb0' });
        win(14, -46, 8, 8, st, 1, { ol, always: true, lit: g, lit2: '#d0ffb0' }); line(13, -46, 22, -39, '#6b4a2f');
        sign(-31, { bg: '#3a2e22', border: '#1a120c', text: '#9dff6b', hi: '#e8ffd8' }, st);
        win(-24, -17, 7, 8, st, 0, { ol, always: true, lit: g, lit2: '#d0ffb0' }); win(17, -17, 7, 8, st, 1, { ol, always: true, lit: g, lit2: '#d0ffb0' });
        door(-6, -18, 12, 18, '#2a1c14', st, { ol, light: '#9dff6b' });
        for (let i = 0; i < 3; i++) {
          const x = Math.round(Math.sin(t * 1.3 + i * 2) * 40), y = Math.round(-56 + Math.cos(t * 2 + i) * 6);
          const f = Math.floor(t * 8 + i) % 2;
          R(x - 1, y, 3, 2, '#120c18'); R(x - 4, y - f, 3, 1, '#120c18'); R(x + 2, y - f, 3, 1, '#120c18');
        }
        alpha(0.7, () => {
          const gy = Math.round(-52 + Math.sin(t * 2) * 2) + 0;
          R(36, gy, 7, 8, '#f0f0ff'); R(37, gy - 1, 5, 1, '#f0f0ff'); R(36, gy + 8, 2, 1, '#f0f0ff'); R(40, gy + 8, 2, 1, '#f0f0ff');
          R(38, gy + 2, 1, 2, '#1a1020'); R(41, gy + 2, 1, 2, '#1a1020');
        });
      } },

    // 16 ─ Mushroom House
    { id: 'mushroom', name: 'Mushroom', hw: 44, height: 54,
      emit: [{ type: 'spark', x: [-40, 40], y: -20, rate: 2, when: 'always' }],
      draw(st) {
        const ol = '#2a0e0c';
        grass(44);
        for (const [x, c] of [[-36, '#e0433b'], [34, '#ffd34d']]) { R(x, -4, 2, 4, '#f2e6c8'); R(x - 2, -6, 6, 2, c); }
        R(-21, -30, 42, 30, ol); R(-20, -30, 40, 30, '#f2e6c8'); R(10, -30, 10, 30, '#e0d0aa');
        for (let r = 0; r < 24; r++) {
          const y = -54 + r, w = Math.round(42 * Math.sqrt(1 - Math.pow((23 - r) / 24, 2)));
          R(-w - 1, y, w * 2 + 2, 1, ol); R(-w, y, w * 2, 1, '#e0433b');
        }
        R(-43, -31, 86, 2, ol); R(-40, -32, 80, 1, '#b8302a');
        for (const [x, y, r] of [[-24, -40, 4], [4, -48, 5], [26, -38, 3], [-6, -36, 2], [34, -44, 2], [-36, -34, 2]]) circle(x, y, r, '#fff4ec');
        sign(-28, { bg: '#6b4a2f', border: ol, text: '#ffe39a' }, st);
        for (const [x, k] of [[-13, 0], [13, 1]]) {
          circle(x, -9, 4, ol);
          circle(x, -9, 3, st.home.length ? '#ffd36b' : '#2c3e6b');
          if (st.home.length) peek(x - 3, -12, 6, 6, st, k);
        }
        R(-6, -15, 12, 15, ol); R(-5, -16, 10, 1, ol);
        R(-5, -14, 10, 14, st.open ? '#1d1228' : '#8f5530'); if (!st.open) R(2, -7, 1, 1, '#ffd36b');
      } },

    // 17 ─ Circus Tent
    { id: 'circus', name: 'Circus', hw: 48, height: 56,
      emit: [{ type: 'confetti', x: [-40, 40], y: -50, rate: 3, when: 'home' }],
      draw(st) {
        const ol = '#2a0a0a', t = st.t;
        grass(48);
        flag(0, -57, '#ffd34d', t);
        for (let r = 0; r < 24; r++) {
          const y = -49 + r, hw = Math.round(2 + r * 1.75);
          R(-hw - 1, y, hw * 2 + 2, 1, ol); R(-hw, y, hw * 2, 1, '#f5efe6');
          for (let k = -3; k <= 3; k++) { const cx = Math.round(k * hw / 3.5), sw = Math.max(1, Math.round(hw / 7)); R(cx - (sw >> 1), y, sw, 1, '#e0343c'); }
        }
        R(-41, -25, 82, 25, ol);
        for (let x = -40, i = 0; x < 40; x += 4, i++) R(x, -24, 4, 24, i % 2 ? '#f5efe6' : '#e0343c');
        for (let x = -42, i = 0; x < 42; x += 6, i++) { circle(x + 3, -25, 3, ol); circle(x + 3, -25, 2, i % 2 ? '#ffd34d' : '#3c5ccf'); }
        for (let y = -12; y < 0; y++) { const hw = Math.floor((y + 13) / 1.4); R(-hw, y, hw * 2, 1, st.open || st.home.length ? '#ffcf6b' : '#2a1020'); }
        if (st.home.length) peek(-5, -6, 10, 6, st, 0);
        sign(-22, { bg: '#ffd34d', border: '#8a1a1a', text: '#b0141e', hi: '#3c5ccf', hot: '#6a0a10', notch: true }, st);
      } },

    // 18 ─ Windmill
    { id: 'windmill', name: 'Windmill', hw: 46, height: 74,
      emit: [],
      draw(st) {
        const ol = '#2a1a10', t = st.t;
        grass(46);
        for (let r = 0; r < 24; r++) {
          const y = -23 - r, hw = 14 - Math.floor(r / 4);
          R(-hw - 1, y, hw * 2 + 2, 1, ol); R(-hw, y, hw * 2, 1, r % 4 === 3 ? '#b59c74' : '#c9b28a');
        }
        win(-2, -40, 4, 6, st, 0, { ol, mullion: false });
        R(-10, -50, 20, 4, ol); R(-9, -49, 18, 3, '#8a3a28');
        roofAt(0, -54, 4, r => 3 + r * 2, () => '#8a3a28', ol);
        const hub = [0, -47];
        for (let k = 0; k < 4; k++) {
          const a = t * 1.2 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
          for (let d = 6; d <= 26; d++) for (let o = 1; o <= 4; o++) R(Math.round(hub[0] + ca * d - sa * o), Math.round(hub[1] + sa * d + ca * o), 1, 1, d % 4 === 0 || o === 4 ? '#8a6a48' : '#efe6d0');
          line(hub[0], hub[1], hub[0] + ca * 27, hub[1] + sa * 27, '#5a3a20');
        }
        box(-2, -49, 5, 5, '#5a3a20', ol);
        R(-38, -22, 76, 22, ol); R(-37, -21, 74, 21, '#f2efe6');
        sign(-21, { bg: '#3a6a9a', border: ol, text: '#ffffff', hi: '#ffe39a' }, st);
        win(-30, -9, 8, 6, st, 0, { ol }); win(22, -9, 8, 6, st, 1, { ol });
        door(-4, -10, 8, 10, '#3a6a9a', st, { ol, panels: false });
      } },

    // 19 ─ Observatory
    { id: 'observatory', name: 'Observatory', hw: 44, height: 56,
      emit: [],
      draw(st) {
        const ol = '#141a2a', t = st.t;
        grass(44);
        for (const [x, y, k] of [[-38, -52, 0], [-28, -62, 1], [30, -60, 2], [40, -48, 3], [-42, -40, 4]]) if (Math.floor(t * 2 + k) % 3) star(x, y, '#fff6c8'); else R(x, y, 1, 1, '#fff6c8');
        line(4, -38, 18, -56, '#2a3140'); line(5, -38, 19, -56, '#7c8597'); line(6, -38, 20, -56, '#7c8597'); line(7, -38, 21, -56, '#2a3140');
        R(18, -58, 5, 3, '#2a3140');
        dome(0, -26, 22, '#eef1f7', ol);
        for (let y = -47; y < -26; y++) { const w = Math.floor(Math.sqrt(21 * 21 - (y + 26) * (y + 26))); R(w - 7, y, 7, 1, '#d6dbe6'); }
        R(-3, -47, 7, 21, ol); R(-2, -46, 5, 20, '#1b2233');
        R(-38, -26, 76, 26, ol); R(-37, -25, 74, 25, '#d8dce6');
        for (let y = -21; y < 0; y += 4) R(-37, y, 74, 1, '#c2c7d3');
        sign(-23, { bg: '#1b2233', border: ol, text: '#9fd8ff', hi: '#ffffff' }, st);
        for (const [x, k] of [[-26, 0], [26, 1]]) { circle(x, -7, 4, ol); circle(x, -7, 3, st.home.length ? '#ffd36b' : '#2c3e6b'); if (st.home.length) peek(x - 3, -10, 6, 6, st, k); }
        door(-5, -12, 10, 12, '#3a4458', st, { ol });
      } },

    // 20 ─ Greenhouse
    { id: 'greenhouse', name: 'Greenhouse', hw: 46, height: 44,
      emit: [{ type: 'spark', x: [-36, 36], y: -10, rate: 1.5, when: 'always' }],
      draw(st) {
        const ol = '#1a3a2a', t = st.t;
        R(-48, 0, 96, 2, '#5a3a20'); R(-46, 0, 92, 1, '#7a5230');
        for (let i = 0; i < 8; i++) {
          const x = -33 + i * 9;
          R(x - 2, -5, 5, 5, '#c0613a'); R(x, -12, 1, 7, '#3f9a45');
          circle(x, -14 - (i % 3) * 3, 3 + (i % 2), '#3f9a45');
          R(x + (i % 2 ? 1 : -1), -17 - (i % 3) * 3, 2, 2, ['#ff5d8f', '#ffd34d', '#ffffff', '#b46bff'][i % 4]);
        }
        st.home.forEach((s, j) => { const hop = Math.floor(t * 3 + j) % 2; R(-28 + j * 16, -9 + hop, 4, 9 - hop, s.pal.main); });
        alpha(0.45, () => { R(-38, -24, 76, 24, '#bfe9d9'); roof(-42, 18, r => 4 + r * 2, () => '#bfe9d9', '#bfe9d9'); });
        R(-39, -25, 78, 1, '#ffffff'); R(-39, -25, 1, 25, '#ffffff'); R(38, -25, 1, 25, '#ffffff');
        for (let x = -30; x < 38; x += 8) R(x, -25, 1, 25, 'rgba(255,255,255,0.8)');
        for (let r = 0; r < 18; r++) { const hw = 4 + r * 2; R(-hw - 1, -42 + r, 1, 1, '#ffffff'); R(hw, -42 + r, 1, 1, '#ffffff'); }
        R(0, -42, 1, 17, '#ffffff');
        sign(-23, { bg: '#6b4a2f', border: '#2a1a14', text: '#ffe39a' }, st);
        door(-5, -12, 10, 12, 'rgba(160,220,200,0.9)', st, { ol: '#ffffff', panels: false });
      } },

    // 21 ─ Tiki Hut
    { id: 'tiki', name: 'Tiki Hut', hw: 50, height: 46,
      emit: [],
      draw(st) {
        const ol = '#3a2410', t = st.t;
        R(-52, 0, 104, 2, '#e8cf8a'); R(-50, 0, 100, 1, '#f5e2a8');
        for (const x of [-41, 39]) {
          R(x, -16, 2, 16, '#6b4a2f'); R(x - 1, -18, 4, 2, '#3a2410');
          const f = Math.floor(t * 8 + x) % 2;
          R(x - 1, -21 - f, 4, 3 + f, '#ff7a2f'); R(x, -20, 2, 2, '#ffd23f');
        }
        R(-31, -26, 62, 26, ol);
        for (let x = -30, i = 0; x < 30; x += 3, i++) R(x, -25, 3, 25, i % 2 ? '#c9a35a' : '#b08a45');
        roof(-46, 20, r => 6 + Math.floor(r * 2.1), r => (r % 3 ? '#e2b85a' : '#c99a3a'), ol);
        for (let x = -46; x < 46; x++) R(x, -26, 1, 1 + (Math.abs(x * 7) % 3), '#c99a3a');
        sign(-22, { bg: '#8a5a2b', border: ol, text: '#ffe39a' }, st);
        R(-6, -12, 12, 12, ol); R(-5, -11, 10, 11, st.open || st.home.length ? '#ffcf6b' : '#2a1a10');
        if (st.home.length) peek(-5, -11, 10, 11, st, 0);
        win(-24, -11, 8, 6, st, 0, { ol, mullion: false }); win(16, -11, 8, 6, st, 1, { ol, mullion: false });
        box(44, -18, 5, 18, '#4ff6ff', '#0a3a4a'); R(46, -16, 1, 14, '#ffffff');
      } },

    // 22 ─ Log Cabin
    { id: 'cabin', name: 'Log Cabin', hw: 46, height: 50,
      emit: [{ type: 'smoke', x: 22, y: -54, rate: 2.5, when: 'always' }],
      draw(st) {
        const ol = '#2a1608';
        R(-48, 0, 96, 2, '#e8f4ff'); R(-46, 0, 92, 1, '#ffffff');
        box(18, -52, 8, 16, '#7c7c88', ol); for (let y = -48; y < -38; y += 3) R(19, y, 6, 1, '#5a5a66');
        roof(-50, 20, r => 4 + r * 2, r => (r < 4 ? '#ffffff' : Math.floor(r / 3) % 2 ? '#2e5a3a' : '#3a6b45'), ol);
        R(-34, -30, 68, 30, ol);
        for (let y = -29; y < 0; y += 3) { R(-33, y, 66, 3, '#8a5a2b'); R(-33, y + 2, 66, 1, '#6b4220'); circle(-34, y + 1, 1, '#c08a52'); circle(33, y + 1, 1, '#c08a52'); }
        sign(-28, { bg: '#5a3a20', border: ol, text: '#ffe39a' }, st);
        win(-27, -15, 8, 7, st, 0, { ol }); win(19, -15, 8, 7, st, 1, { ol });
        door(-5, -16, 10, 16, '#5a3a20', st, { ol });
        for (const [x, y] of [[-44, -3], [-40, -3], [-42, -6]]) { circle(x, y, 2, ol); circle(x, y, 1, '#c08a52'); }
      } },

    // 23 ─ Pirate Ship
    { id: 'pirate', name: 'Pirate Ship', hw: 58, height: 72,
      emit: [],
      draw(st) {
        const ol = '#1a0e06', t = st.t;
        const b = Math.round(Math.sin(t * 1.5));
        line(0, -64 + b, -50, -16 + b, '#3a2a1a'); line(0, -64 + b, 50, -16 + b, '#3a2a1a');
        R(-1, -68 + b, 2, 54, '#5a3a20');
        R(1, -72 + b, 8, 5, '#111111'); R(4, -71 + b, 2, 2, '#ffffff'); R(3, -69 + b, 4, 1, '#ffffff');
        R(-4, -60 + b, 8, 3, '#5a3a20');
        const bl = Math.round(Math.sin(t * 2) * 2);
        for (let y = -56; y < -42; y++) { const k = (y + 56) / 14, hw = 18 + Math.round(Math.sin(k * Math.PI) * (3 + bl)); R(-hw, y + b, hw * 2, 1, '#f5efe6'); R(-hw - 1, y + b, 1, 1, ol); R(hw, y + b, 1, 1, ol); }
        for (let y = -40; y < -20; y++) { const k = (y + 40) / 20, hw = 24 + Math.round(Math.sin(k * Math.PI) * (4 + bl)); R(-hw, y + b, hw * 2, 1, '#f5efe6'); R(-hw - 1, y + b, 1, 1, ol); R(hw, y + b, 1, 1, ol); }
        R(-1, -56 + b, 2, 36, 'rgba(90,58,32,0.5)');
        R(-56, -24 + b, 18, 8, ol); R(-55, -23 + b, 16, 7, '#7a4a2a');
        for (let r = 0; r < 14; r++) { const y = -16 + r + b, hw = 54 - Math.floor(r * r / 7); R(-hw - 1, y, hw * 2 + 2, 1, ol); R(-hw, y, hw * 2, 1, r % 3 ? '#7a4a2a' : '#6a3e22'); }
        R(-50, -16 + b, 100, 1, '#d4a52a');
        sign(-14 + b, { bg: '#2a1a10', border: '#d4a52a', text: '#ffd34d', hi: '#ffffff' }, st);
        for (const [x, k] of [[-46, 0], [42, 1]]) win(x, -13 + b, 4, 4, st, k, { ol, mullion: false });
        waves(58, t, -2);
      } },

    // 24 ─ Rocket Pad
    { id: 'rocket', name: 'Rocket Pad', hw: 46, height: 78,
      emit: [{ type: 'smoke', x: [-10, 10], y: -14, rate: 6, when: 'home' }],
      draw(st) {
        const ol = '#14161e', t = st.t;
        R(-48, 0, 96, 2, '#5a5a64'); R(-46, 0, 92, 1, '#7c7c88');
        R(16, -70, 1, 56, '#c94a2a'); R(24, -70, 1, 56, '#c94a2a');
        for (let y = -70; y < -14; y += 8) { line(16, y, 24, y + 8, '#c94a2a'); R(16, y, 9, 1, '#c94a2a'); }
        R(7, -52, 9, 1, '#c94a2a'); R(7, -36, 9, 1, '#c94a2a');
        roofAt(0, -78, 14, r => Math.max(1, Math.round(r / 2)), r => (r < 5 ? '#e0343c' : '#f2f2f6'), ol);
        R(-8, -64, 16, 48, ol); R(-7, -64, 14, 47, '#f2f2f6'); R(3, -64, 4, 47, '#d6d6e0');
        R(-7, -30, 14, 2, '#e0343c'); R(-7, -58, 14, 1, '#3a3f4d');
        circle(0, -48, 4, ol); circle(0, -48, 3, st.home.length ? '#9fe8ff' : '#2c3e6b');
        if (st.home.length) { const s = st.home[Math.floor(t / 2) % st.home.length]; R(-2, -49, 4, 4, s.pal.main); R(-1, -48, 1, 1, '#fff'); R(1, -48, 1, 1, '#fff'); }
        for (const s of [-1, 1]) { const x = s < 0 ? -13 : 8; R(x, -24, 5, 10, ol); R(x + 1, -23, 3, 9, '#e0343c'); }
        R(-38, -14, 76, 14, ol); R(-37, -13, 74, 13, '#7c8597');
        sign(-12, { bg: '#05070a', border: '#3a3f4d', text: '#ffb03f', hi: '#ffffff' }, st);
        if (st.home.length) alpha(0.8, () => { R(-5, -16, 10, 2, Math.floor(t * 10) % 2 ? '#ffd23f' : '#ff7a2f'); });
      } },

    // 25 ─ GPU Cluster
    { id: 'datacenter', name: 'GPU Cluster', hw: 46, height: 46,
      emit: [{ type: 'bit', x: [-36, 36], y: -40, rate: 3, when: 'always' }],
      draw(st) {
        const ol = '#0a0d14', t = st.t;
        pavement(46, '#2a2f3a', '#4a5262');
        for (const x of [-26, 26]) {
          box(x - 7, -45, 14, 7, '#5a6275', ol);
          const f = Math.floor(t * 12) % 2;
          if (f) { R(x - 3, -42, 7, 1, '#2a2f3a'); R(x, -44, 1, 5, '#2a2f3a'); }
          else { line(x - 2, -44, x + 2, -40, '#2a2f3a'); line(x + 2, -44, x - 2, -40, '#2a2f3a'); }
        }
        R(-42, -38, 84, 38, ol); R(-41, -37, 82, 37, '#2a3140');
        R(-41, -37, 82, 1, '#4a5262');
        sign(-35, { bg: '#05070a', border: '#3a4458', text: '#4ff6ff', hi: '#ffffff' }, st);
        const hash = n => { n = Math.sin(n) * 43758.5453; return n - Math.floor(n); };
        for (const x of [-37, -21, 9, 25]) {
          R(x - 1, -23, 14, 21, ol); R(x, -22, 12, 19, '#0d1118');
          for (let row = 0; row < 6; row++) {
            R(x + 1, -21 + row * 3, 10, 2, '#1b2230');
            for (let c = 0; c < 3; c++) {
              const on = hash(x * 3 + row * 7 + c + Math.floor(t * (st.home.length ? 8 : 3))) > 0.45;
              R(x + 2 + c * 3, -21 + row * 3, 1, 1, on ? ['#5dff9b', '#4ff6ff', '#ffb03f'][(row + c) % 3] : '#2a3140');
            }
          }
        }
        door(-6, -22, 12, 22, '#3a4458', st, { ol, panels: false, knob: '#4ff6ff', light: '#4ff6ff' });
        if (!st.open) R(-1, -22, 1, 22, ol);
        alpha(0.6, () => R(-6, -2, 12, 1, '#4ff6ff'));
      } },
  ];

  const BY_ID = Object.fromEntries(HOUSES.map(h => [h.id, h]));
  const getHouse = id => BY_ID[id] || HOUSES[0];

  function drawHouse(house, cx, groundY, st) {
    const c = window.Sprites.getCtx();
    c.save();
    c.translate(Math.round(cx), Math.round(groundY));
    house.draw(st);
    c.restore();
  }

  window.Houses = { HOUSES, getHouse, drawHouse };
})();
