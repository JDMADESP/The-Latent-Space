// Shared pixel-art library: drawing helpers, pixel font, and the 25 pet skins.
// Loaded by both the pet window (renderer.js) and the Customize window (settings.js).
(function () {
  'use strict';

  let ctx = null;
  const use = c => { ctx = c; };

  // ───────────── primitives ─────────────
  function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function box(x, y, w, h, fill, ol, hi) {
    R(x + 1, y, w - 2, h, ol); R(x, y + 1, w, h - 2, ol);
    R(x + 1, y + 1, w - 2, h - 2, fill);
    if (hi) R(x + 2, y + 1, Math.max(1, w - 4), 1, hi);
  }
  function blob(rects, fill, ol) {
    for (const [x, y, w, h] of rects) { R(x + 1, y, w - 2, h, ol); R(x, y + 1, w, h - 2, ol); }
    for (const [x, y, w, h] of rects) R(x + 1, y + 1, w - 2, h - 2, fill);
  }
  function circle(cx, cy, r, c) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      R(cx - w, cy + dy, w * 2 + 1, 1, c);
    }
  }
  function star(x, y, c) { R(x - 1, y, 3, 1, c); R(x, y - 1, 1, 3, c); }

  // ───────────── 3x5 pixel font ─────────────
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', ' ': '000000000000000',
    ')': '100010010010100', ':': '000010000010000', '-': '000000111000000', '+': '000010111010000',
  };
  const FONT_CHARS = Object.keys(FONT).join('');
  function text(str, x, y, c, sc = 1) {
    for (const ch of String(str)) {
      const g = FONT[ch] || FONT[' '];
      for (let i = 0; i < 15; i++) if (g[i] === '1') R(x + (i % 3) * sc, y + Math.floor(i / 3) * sc, sc, sc, c);
      x += 4 * sc;
    }
  }
  const textW = (str, sc = 1) => Math.max(0, String(str).length * 4 * sc - sc);
  function textOutlined(str, x, y, c, ol, sc = 1) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) text(str, x + dx, y + dy, ol, sc);
    text(str, x, y, c, sc);
  }
  // speech bubble whose tail points left at (lx, cy)
  function sideBubble(str, lx, cy) {
    const ol = '#1a1020';
    const w = textW(str) + 5, h = 9;
    box(lx + 2, cy - 4, w, h, '#ffffff', ol);
    R(lx + 2, cy, 1, 1, '#ffffff'); R(lx + 1, cy, 1, 1, ol); R(lx + 2, cy - 1, 1, 1, ol); R(lx + 2, cy + 1, 1, 1, ol);
    R(lx, cy, 1, 1, ol);
    text(str, lx + 5, cy - 2, ol);
  }
  // speech bubble whose tail points down at (cx, by)
  function bubble(str, cx, by) {
    const ol = '#1a1020';
    const w = textW(str) + 5, h = 9;
    const x = Math.round(cx - w / 2), y = by - h - 2;
    box(x, y, w, h, '#ffffff', ol);
    cx = Math.round(cx);
    R(cx - 1, by - 2, 3, 1, '#ffffff'); R(cx - 2, by - 2, 1, 1, ol); R(cx + 2, by - 2, 1, 1, ol);
    R(cx, by - 1, 1, 1, ol);
    text(str, x + 3, y + 2, ol);
  }

  // ───────────── skins ─────────────
  // head: box | cloud | round | crt     eyes: square | slit | dot | cyclops | visor | tri
  // acc: hat/antenna accessory          emblem: chest decoration          trick: hover animation
  const pal = (main, light, dark, ol, screen, eye, acc) => ({ main, light, dark, ol, screen, eye, acc });
  const SKINS = [
    { id: 'cloudy',  name: 'Cloudy',  head: 'cloud', eyes: 'square',  acc: 'none',        emblem: 'prompt', trick: 'wave',  pal: pal('#35c595', '#9af2cf', '#1d8a66', '#0b2a21', '#0c201a', '#b9ffe4', '#ffffff') },
    { id: 'spark',   name: 'Spark',   head: 'box',   eyes: 'square',  acc: 'star',        emblem: 'plus',   trick: 'dance', pal: pal('#d97757', '#f6ad8e', '#a5502f', '#3a160a', '#2a120a', '#ffe0cc', '#ffc46b') },
    { id: 'beats',   name: 'Beats',   head: 'box',   eyes: 'square',  acc: 'headphones',  emblem: 'note',   trick: 'spin',  pal: pal('#5b74ff', '#a3b3ff', '#3346c4', '#11143d', '#0e1133', '#ead6ff', '#b46bff') },
    { id: 'slash',   name: 'Slash',   head: 'box',   eyes: 'slit',    acc: 'slash',       emblem: 'slash',  trick: 'flip',  pal: pal('#4a4a54', '#83838f', '#2a2a30', '#060608', '#16161b', '#ffffff', '#ffffff') },
    { id: 'ghosty',  name: 'Ghosty',  head: 'round', eyes: 'dot',     acc: 'none',        emblem: 'dot',    trick: 'spin',  pal: pal('#eeeaff', '#ffffff', '#b9b0d9', '#2c2547', '#2c2547', '#9ef0ff', '#ffffff') },
    { id: 'kitty',   name: 'Kitty',   head: 'box',   eyes: 'square',  acc: 'catears',     emblem: 'heart',  trick: 'dance', pal: pal('#ff8fc1', '#ffc4de', '#d0558f', '#3d0f26', '#3d0f26', '#fff1f8', '#ffd1e6') },
    { id: 'bunbun',  name: 'Bunbun',  head: 'round', eyes: 'dot',     acc: 'bunnyears',   emblem: 'heart',  trick: 'wave',  pal: pal('#f4e7d0', '#fffaf0', '#c9b79a', '#3a2e22', '#3a2e22', '#ffd0dc', '#ffb7c8') },
    { id: 'imp',     name: 'Imp',     head: 'box',   eyes: 'slit',    acc: 'horns',       emblem: 'none',   trick: 'flip',  pal: pal('#e0434b', '#ff8a8f', '#9e1f2a', '#2b060a', '#1d0407', '#ffd84d', '#f5e6c8') },
    { id: 'seraph',  name: 'Seraph',  head: 'round', eyes: 'square',  acc: 'halo',        emblem: 'plus',   trick: 'spin',  pal: pal('#f7f3e6', '#ffffff', '#d6c79a', '#3a3220', '#2e2a40', '#fff3a8', '#ffd84d') },
    { id: 'royale',  name: 'Royale',  head: 'box',   eyes: 'square',  acc: 'crown',       emblem: 'diamond',trick: 'wave',  pal: pal('#8a4fff', '#c0a0ff', '#5a2bc0', '#1c0b40', '#160a33', '#ffe27a', '#ffd34d') },
    { id: 'sprout',  name: 'Sprout',  head: 'round', eyes: 'dot',     acc: 'leaf',        emblem: 'dot',    trick: 'dance', pal: pal('#6cc04a', '#a8e88a', '#3e8a2b', '#123010', '#10260d', '#e9ffd6', '#3fae3a') },
    { id: 'copter',  name: 'Copter',  head: 'box',   eyes: 'square',  acc: 'propeller',   emblem: 'stripes',trick: 'spin',  pal: pal('#5ac8fa', '#b3e9ff', '#2b8fc4', '#0a2a3d', '#0a2233', '#ffffff', '#ffd23f') },
    { id: 'dapper',  name: 'Dapper',  head: 'box',   eyes: 'slit',    acc: 'tophat',      emblem: 'bowtie', trick: 'wave',  pal: pal('#9aa3b5', '#d0d6e2', '#667087', '#161a24', '#161a24', '#ffffff', '#1b1b22') },
    { id: 'ember',   name: 'Ember',   head: 'box',   eyes: 'slit',    acc: 'flame',       emblem: 'dot',    trick: 'flip',  pal: pal('#ff7a2f', '#ffb36b', '#c4471a', '#3a1004', '#2a0b03', '#fff0a0', '#ffd23f') },
    { id: 'volt',    name: 'Volt',    head: 'box',   eyes: 'visor',   acc: 'bolt',        emblem: 'bolt',   trick: 'dance', pal: pal('#ffe14d', '#fff6a8', '#d1a800', '#2a2200', '#1a1a1a', '#7df9ff', '#7df9ff') },
    { id: 'cyclo',   name: 'Cyclo',   head: 'round', eyes: 'cyclops', acc: 'antenna',     emblem: 'knobs',  trick: 'spin',  pal: pal('#a6e22e', '#d8ff8a', '#6f9a12', '#1d2a04', '#1d2a04', '#ff5d73', '#ff5d73') },
    { id: 'frosty',  name: 'Frosty',  head: 'box',   eyes: 'square',  acc: 'spikes',      emblem: 'plus',   trick: 'wave',  pal: pal('#8fe3ff', '#d9f7ff', '#4aaed6', '#0b2a3a', '#0b2a3a', '#ffffff', '#ffffff') },
    { id: 'retro',   name: 'Retro',   head: 'crt',   eyes: 'square',  acc: 'rabbitears',  emblem: 'knobs',  trick: 'dance', pal: pal('#d8cfae', '#f2ead0', '#a99f7e', '#2a261a', '#203a2a', '#7dff9b', '#ff5d73') },
    { id: 'bowbow',  name: 'Bowbow',  head: 'box',   eyes: 'dot',     acc: 'bow',         emblem: 'heart',  trick: 'wave',  pal: pal('#c58cff', '#e5c8ff', '#8b52cc', '#2a0f45', '#2a0f45', '#ffffff', '#ff4fa0') },
    { id: 'shinobi', name: 'Shinobi', head: 'box',   eyes: 'slit',    acc: 'headband',    emblem: 'none',   trick: 'flip',  pal: pal('#26262e', '#4a4a56', '#15151a', '#000000', '#0c0c10', '#ffffff', '#e0343c') },
    { id: 'pumpkin', name: 'Pumpkin', head: 'round', eyes: 'tri',     acc: 'stem',        emblem: 'none',   trick: 'dance', pal: pal('#ff9a2e', '#ffc277', '#c9620e', '#3a1a02', '#2a1202', '#ffe14d', '#3e8a2b') },
    { id: 'astro',   name: 'Astro',   head: 'box',   eyes: 'visor',   acc: 'dome',        emblem: 'dot',    trick: 'spin',  pal: pal('#e8ecf5', '#ffffff', '#aab3c7', '#1b2233', '#1d2b55', '#9ad7ff', '#ff6b3d') },
    { id: 'slimey',  name: 'Slimey',  head: 'round', eyes: 'dot',     acc: 'drip',        emblem: 'none',   trick: 'dance', pal: pal('#4fe39a', '#a8ffd1', '#20a868', '#0a3320', '#0a3320', '#ffffff', '#4fe39a') },
    { id: 'punk',    name: 'Punk',    head: 'box',   eyes: 'slit',    acc: 'mohawk',      emblem: 'slash',  trick: 'flip',  pal: pal('#ff3fb4', '#ff9ad8', '#c0137f', '#33061f', '#200414', '#5dfffb', '#5dfffb') },
    { id: 'buzz',    name: 'Buzz',    head: 'round', eyes: 'square',  acc: 'beeantennae', emblem: 'stripes',trick: 'spin',  pal: pal('#ffd23f', '#fff09a', '#d19a0a', '#2a2205', '#2a2205', '#ffffff', '#2a2205') },
  ];
  const SKIN_BY_ID = Object.fromEntries(SKINS.map(s => [s.id, s]));
  const getSkin = id => SKIN_BY_ID[id] || SKINS[0];

  // Pose for a hover trick, `tt` seconds into it.
  function trickPose(skin, tt) {
    const o = { pose: 'idle', frame: 0, expr: 'happy', facing: 1, dx: 0, dy: 0, flipY: false };
    switch (skin.trick) {
      case 'wave':
        o.pose = 'wave'; o.frame = Math.floor(tt / 0.14) % 2;
        if (tt < 0.25) o.dy = -Math.round(Math.sin(tt / 0.25 * Math.PI) * 3);
        break;
      case 'dance': {
        const f = Math.floor(tt / 0.15) % 4;
        o.pose = 'dance'; o.frame = f; o.dx = [0, 1, 0, -1][f]; o.dy = -(f % 2);
        break;
      }
      case 'spin':
        o.pose = 'up'; o.facing = Math.floor(tt / 0.09) % 2 ? 1 : -1;
        o.dy = -Math.round(Math.abs(Math.sin(tt * 6)) * 3);
        break;
      case 'flip': {
        const c = tt % 1.4;
        if (c < 0.6) {
          const k = c / 0.6;
          o.dy = -Math.round(Math.sin(Math.PI * k) * 16);
          o.flipY = k > 0.3 && k < 0.7;
          o.pose = 'up';
        }
        if (tt > 0.6) o.expr = 'cool';
        break;
      }
    }
    return o;
  }

  // ───────────── pet drawing ─────────────
  // (x, y) = feet. o: { pose, frame, expr, facing, flipY, lying, bob, t }
  function drawPet(skin, x, y, o = {}) {
    const P = skin.pal;
    const pose = o.pose || 'idle', frame = o.frame || 0, t = o.t || 0;
    let expr = o.expr || 'normal';
    if (expr === 'happy' && skin.eyes === 'slit') expr = 'grin';

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (o.lying) { ctx.translate(8, -8); ctx.transform(0, -1, 1, 0, 0, 0); }
    if ((o.facing || 1) < 0) ctx.scale(-1, 1);
    if (o.flipY) { ctx.translate(0, -11); ctx.scale(1, -1); ctx.translate(0, 11); }

    // legs
    let lL = 0, lR = 0;
    if (pose === 'walk') { if (frame) lL = -1; else lR = -1; }
    R(-4, -3 + lL, 3, 3, P.ol); R(-3, -3 + lL, 1, 2, P.dark);
    R(1, -3 + lR, 3, 3, P.ol); R(2, -3 + lR, 1, 2, P.dark);

    // body + emblem
    box(-5, -10, 10, 8, P.main, P.ol, P.light);
    drawEmblem(skin);

    // arms
    const armDown = (side, dy = 0) => box(side < 0 ? -8 : 5, -9 + dy, 3, 5, P.main, P.ol);
    const armUp = (side, dx = 0) => box((side < 0 ? -8 : 5) + dx, -15, 3, 6, P.main, P.ol);
    if (pose === 'wave') { armDown(-1); armUp(1, frame); }
    else if (pose === 'dance') { if (frame % 2) { armUp(-1); armDown(1); } else { armDown(-1); armUp(1); } }
    else if (pose === 'up') { armUp(-1, -1); armUp(1, 1); }
    else if (pose === 'walk') { armDown(-1, frame ? -1 : 0); armDown(1, frame ? 0 : -1); }
    else if (pose === 'punch') {
      armDown(-1);
      if (frame) { box(5, -8, 6, 3, P.main, P.ol); box(10, -9, 4, 5, P.light, P.ol); }
      else armDown(1, -1);
    } else { armDown(-1); armDown(1); }

    // head
    const hy = -20 + (o.bob || 0);
    let top = hy;
    accBehind(skin, hy, t);
    if (skin.head === 'cloud') {
      const puffs = [[-5, hy + 1, 4], [0, hy - 1, 5], [5, hy + 1, 3], [-8, hy + 5, 3], [7, hy + 5, 3]];
      for (const [cx, cy, r] of puffs) circle(cx, cy, r + 1, P.ol);
      R(-9, hy + 1, 18, 10, P.ol); R(-8, hy, 16, 12, P.ol);
      for (const [cx, cy, r] of puffs) circle(cx, cy, r, P.main);
      R(-8, hy + 1, 16, 10, P.main);
      R(-1, hy - 4, 3, 1, P.light); R(-2, hy - 3, 1, 1, P.light); R(-6, hy - 1, 2, 1, P.light); R(-9, hy + 4, 1, 2, P.light);
      top = hy - 5;
    } else if (skin.head === 'round') {
      blob([[-8, hy + 1, 16, 10], [-7, hy - 1, 14, 13], [-5, hy - 2, 10, 14]], P.main, P.ol);
      R(-5, hy, 3, 1, P.light); R(-6, hy + 1, 1, 1, P.light);
      top = hy - 2;
    } else if (skin.head === 'crt') {
      blob([[-9, hy - 1, 18, 12]], P.main, P.ol);
      R(-7, hy, 4, 1, P.light);
      R(-11, hy + 4, 2, 3, P.ol); R(9, hy + 4, 2, 3, P.ol);
      top = hy - 1;
    } else {
      blob([[-8, hy, 16, 11]], P.main, P.ol);
      R(-6, hy + 1, 3, 1, P.light); R(-7, hy + 2, 1, 1, P.light);
    }
    accFront(skin, hy, top, t);

    // face screen
    box(-6, hy + 3, 12, 6, P.screen, P.dark);
    drawFace(skin, expr, hy, t);
    if (skin.acc === 'dome') { // glass glint on top of everything
      R(-8, hy - 3, 3, 1, 'rgba(255,255,255,0.8)'); R(-9, hy - 2, 1, 2, 'rgba(255,255,255,0.8)');
    }
    ctx.restore();
  }

  function drawEmblem(skin) {
    const P = skin.pal, L = P.light, A = P.acc;
    switch (skin.emblem) {
      case 'prompt': R(-3, -8, 1, 1, L); R(-2, -7, 1, 1, L); R(-3, -6, 1, 1, L); R(0, -6, 2, 1, L); break;
      case 'plus': R(-1, -8, 1, 3, A); R(-2, -7, 3, 1, A); break;
      case 'note': R(-1, -8, 2, 1, A); R(0, -7, 1, 2, A); R(-2, -6, 2, 1, A); break;
      case 'slash': R(1, -8, 1, 1, L); R(0, -7, 1, 1, L); R(-1, -6, 1, 1, L); break;
      case 'heart': R(-3, -8, 2, 1, '#ff5d8f'); R(0, -8, 2, 1, '#ff5d8f'); R(-3, -7, 5, 1, '#ff5d8f'); R(-2, -6, 3, 1, '#ff5d8f'); R(-1, -5, 1, 1, '#ff5d8f'); break;
      case 'dot': R(-1, -7, 2, 2, L); break;
      case 'diamond': R(-1, -8, 1, 1, A); R(-2, -7, 3, 1, A); R(-1, -6, 1, 1, A); break;
      case 'stripes': R(-4, -8, 8, 1, P.ol); R(-4, -6, 8, 1, P.ol); break;
      case 'bowtie': R(-3, -9, 2, 2, '#e0343c'); R(1, -9, 2, 2, '#e0343c'); R(-1, -9, 2, 1, '#9e1f2a'); break;
      case 'bolt': R(0, -8, 1, 1, P.ol); R(-1, -7, 2, 1, P.ol); R(-1, -6, 1, 1, P.ol); break;
      case 'knobs': R(-3, -7, 1, 1, P.ol); R(1, -7, 1, 1, P.ol); R(-1, -5, 2, 1, P.dark); break;
    }
  }

  function accBehind(skin, hy, t) {
    const P = skin.pal;
    switch (skin.acc) {
      case 'headphones': box(-9, hy - 3, 18, 7, P.acc, P.ol); break;
      case 'bunnyears':
        R(-7, hy - 9, 4, 10, P.ol); R(-6, hy - 8, 2, 9, P.main); R(-6, hy - 7, 1, 6, P.acc);
        R(2, hy - 9, 4, 10, P.ol); R(3, hy - 8, 2, 9, P.main); R(4, hy - 7, 1, 6, P.acc);
        break;
      case 'dome':
        blob([[-11, hy - 3, 22, 16], [-10, hy - 5, 20, 19]], 'rgba(170,220,255,0.35)', '#8fd3ff');
        break;
    }
  }

  function accFront(skin, hy, top, t) {
    const P = skin.pal, ol = P.ol, A = P.acc;
    switch (skin.acc) {
      case 'star': {
        const c = Math.floor(t / 0.4) % 3 === 0 ? '#fff4d6' : A;
        R(-1, top - 2, 1, 2, ol);
        R(-3, top - 5, 5, 1, c); R(-1, top - 7, 1, 5, c);
        R(-2, top - 6, 1, 1, c); R(0, top - 6, 1, 1, c); R(-2, top - 4, 1, 1, c); R(0, top - 4, 1, 1, c);
        break;
      }
      case 'slash':
        for (let i = 0; i < 5; i++) { R(i + 1, top - 1 - i, 1, 1, ol); R(i, top - 1 - i, 1, 1, A); }
        break;
      case 'headphones': box(-10, hy + 3, 3, 6, A, ol); box(7, hy + 3, 3, 6, A, ol); break;
      case 'catears':
        R(-8, top - 3, 3, 3, ol); R(-7, top - 4, 1, 1, ol); R(-7, top - 2, 1, 2, A);
        R(4, top - 3, 3, 3, ol); R(5, top - 4, 1, 1, ol); R(5, top - 2, 1, 2, A);
        break;
      case 'horns':
        R(-7, top - 2, 2, 2, A); R(-8, top - 4, 2, 2, A); R(-8, top - 5, 1, 1, A);
        R(4, top - 2, 2, 2, A); R(5, top - 4, 2, 2, A); R(6, top - 5, 1, 1, A);
        break;
      case 'halo': {
        const b = Math.round(Math.sin(t * 3));
        const y = top - 5 + b;
        R(-5, y, 9, 1, A); R(-6, y + 1, 1, 1, A); R(4, y + 1, 1, 1, A); R(-5, y + 2, 9, 1, A);
        break;
      }
      case 'crown':
        R(-6, top - 3, 11, 3, ol);
        R(-5, top - 2, 9, 2, A);
        R(-5, top - 4, 1, 2, A); R(-1, top - 5, 1, 3, A); R(3, top - 4, 1, 2, A);
        R(-1, top - 1, 1, 1, '#ff4f6d');
        break;
      case 'leaf':
        R(-1, top - 3, 1, 3, '#3e8a2b');
        R(0, top - 5, 3, 2, A); R(1, top - 6, 2, 1, A); R(-3, top - 4, 2, 1, A); R(-4, top - 5, 1, 1, A);
        break;
      case 'propeller': {
        R(-5, top - 2, 5, 2, '#ff4f4f'); R(0, top - 2, 5, 2, A);
        R(-1, top - 4, 1, 2, ol);
        const f = Math.floor(t / 0.06) % 2;
        if (f) R(-6, top - 5, 11, 1, '#3fa9ff'); else R(-3, top - 5, 5, 1, '#3fa9ff');
        break;
      }
      case 'tophat':
        R(-7, top - 1, 14, 1, A);
        R(-5, top - 8, 10, 7, A);
        R(-5, top - 3, 10, 1, '#e0343c');
        R(-4, top - 7, 1, 3, '#3a3a46');
        break;
      case 'flame': {
        const f = Math.floor(t / 0.12) % 2;
        R(-5, top - 2, 10, 2, '#ff7a2f');
        R(-4, top - 4 - f, 2, 2 + f, '#ff7a2f'); R(-1, top - 5 + f, 2, 3 - f, '#ff7a2f'); R(2, top - 4 - f, 2, 2 + f, '#ff7a2f');
        R(-3, top - 2, 1, 1, A); R(0, top - 3 + f, 1, 2, A); R(2, top - 2, 1, 1, A);
        break;
      }
      case 'bolt':
        R(0, top - 7, 2, 1, A); R(-1, top - 6, 2, 1, A); R(-2, top - 5, 4, 1, A);
        R(0, top - 4, 2, 1, A); R(-1, top - 3, 2, 1, A); R(-1, top - 2, 1, 2, A);
        break;
      case 'antenna': {
        R(-1, top - 3, 1, 3, ol);
        const on = Math.floor(t / 0.5) % 2;
        box(-2, top - 6, 3, 3, on ? A : P.dark, ol);
        break;
      }
      case 'spikes':
        R(-7, top - 2, 2, 2, A); R(-3, top - 3, 2, 3, A); R(1, top - 3, 2, 3, A); R(5, top - 2, 2, 2, A);
        R(-3, top - 4, 1, 1, A); R(2, top - 4, 1, 1, A);
        break;
      case 'rabbitears':
        for (let i = 0; i < 5; i++) { R(-2 - i, top - 1 - i, 1, 1, ol); R(1 + i, top - 1 - i, 1, 1, ol); }
        R(-8, top - 7, 2, 2, A); R(6, top - 7, 2, 2, A);
        break;
      case 'bow':
        R(1, top - 3, 9, 5, ol);
        R(2, top - 2, 3, 3, A); R(6, top - 2, 3, 3, A); R(5, top - 1, 1, 1, '#ffffff');
        break;
      case 'headband': {
        R(-8, hy + 1, 16, 2, A);
        const f = Math.floor(t / 0.15) % 2;
        R(8, hy + 1, 3, 1, A); R(9 + f, hy + 2, 3, 1, A);
        break;
      }
      case 'stem':
        R(-1, top - 3, 2, 3, A); R(1, top - 3, 2, 1, A);
        break;
      case 'drip': {
        const d = Math.floor(t * 2) % 3;
        R(-6, hy + 10, 1, 1 + d, A); R(5, hy + 10, 1, 2, A);
        break;
      }
      case 'mohawk':
        R(-2, top - 6, 4, 6, ol);
        R(-1, top - 5, 2, 5, A); R(-1, top - 6, 1, 1, A);
        break;
      case 'beeantennae':
        R(-4, top - 3, 1, 3, ol); R(3, top - 3, 1, 3, ol);
        R(-6, top - 5, 2, 2, ol); R(4, top - 5, 2, 2, ol);
        R(-5, top - 4, 1, 1, ol); R(4, top - 4, 1, 1, ol);
        break;
    }
  }

  function drawFace(skin, expr, hy, t) {
    const P = skin.pal, E = P.eye;
    switch (expr) {
      case 'normal':
        switch (skin.eyes) {
          case 'slit': R(-4, hy + 5, 2, 1, E); R(2, hy + 5, 2, 1, E); R(-3, hy + 6, 1, 1, E); R(2, hy + 6, 1, 1, E); break;
          case 'dot': R(-3, hy + 5, 1, 2, E); R(2, hy + 5, 1, 2, E); break;
          case 'cyclops': R(-2, hy + 4, 4, 3, E); R(-1, hy + 5, 2, 1, P.screen); break;
          case 'visor': {
            R(-5, hy + 5, 10, 2, P.dark);
            const k = Math.floor(t * 10) % 16, px = k < 8 ? k : 15 - k;
            R(-5 + Math.min(8, px), hy + 5, 2, 2, E);
            break;
          }
          case 'tri': R(-4, hy + 6, 3, 1, E); R(-3, hy + 5, 1, 1, E); R(1, hy + 6, 3, 1, E); R(2, hy + 5, 1, 1, E); break;
          default: R(-4, hy + 5, 2, 2, E); R(2, hy + 5, 2, 2, E);
        }
        break;
      case 'blink':
        if (skin.eyes === 'cyclops') R(-2, hy + 6, 4, 1, E);
        else if (skin.eyes === 'visor') R(-5, hy + 6, 10, 1, P.dark);
        else { R(-4, hy + 6, 2, 1, E); R(2, hy + 6, 2, 1, E); }
        break;
      case 'happy':
        R(-5, hy + 6, 1, 1, E); R(-4, hy + 5, 2, 1, E); R(-2, hy + 6, 1, 1, E);
        R(1, hy + 6, 1, 1, E); R(2, hy + 5, 2, 1, E); R(4, hy + 6, 1, 1, E);
        R(-1, hy + 7, 2, 1, E);
        R(-7, hy + 8, 1, 1, '#ff8fa3'); R(6, hy + 8, 1, 1, '#ff8fa3');
        break;
      case 'grin':
        R(-4, hy + 5, 2, 1, E); R(2, hy + 5, 2, 1, E); R(-2, hy + 7, 4, 1, E); R(2, hy + 6, 1, 1, E);
        break;
      case 'angry':
        R(-4, hy + 5, 1, 1, E); R(-4, hy + 6, 2, 1, E);
        R(3, hy + 5, 1, 1, E); R(2, hy + 6, 2, 1, E);
        R(-1, hy + 7, 2, 1, E);
        break;
      case 'shock': R(-4, hy + 4, 2, 3, E); R(2, hy + 4, 2, 3, E); break;
      case 'x':
        for (const ox of [-5, 2]) { R(ox, hy + 4, 1, 1, E); R(ox + 2, hy + 4, 1, 1, E); R(ox + 1, hy + 5, 1, 1, E); R(ox, hy + 6, 1, 1, E); R(ox + 2, hy + 6, 1, 1, E); }
        break;
      case 'cool':
        R(-6, hy + 4, 12, 1, '#000'); R(-5, hy + 5, 4, 2, '#000'); R(1, hy + 5, 4, 2, '#000');
        R(-4, hy + 5, 1, 1, '#ffffff'); R(2, hy + 5, 1, 1, '#ffffff');
        R(-1, hy + 7, 3, 1, E);
        break;
    }
  }

  window.Sprites = {
    use, R, box, blob, circle, star, text, textW, textOutlined, bubble, sideBubble,
    FONT_CHARS, SKINS, getSkin, trickPose, drawPet,
  };
})();
