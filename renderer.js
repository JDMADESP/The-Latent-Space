// The Latent Space — pet window. Everything is drawn on a tiny canvas (1 unit = 1 art pixel)
// that CSS scales up with `image-rendering: pixelated`, so all art stays crisp pixel art.
'use strict';

const { use, R, box, circle, star, text, textW, textOutlined, bubble, sideBubble, getSkin, trickPose, drawPet } = window.Sprites;
const api = window.latent;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
use(ctx);

// ───────────────────────── layout ─────────────────────────
const AW = 136;        // art width
const CX = AW / 2;     // column / club centre
const SP = 28;         // vertical spacing between floating pets
const TOP = 16;        // headroom above the top pet
const HOUSE_H = 50;    // club height incl. roof
let AH = 0, G = 0, ROOF = 0, S = 3;

let config = { scale: 3, pets: [] };
let screenH = 900;
let pets = [];

function layout() {
  const n = Math.max(1, pets.length);
  AH = TOP + n * SP + HOUSE_H;
  G = AH - 2;
  ROOF = G - 44;
  const maxS = Math.max(1, Math.floor((screenH - 20) / AH));
  S = Math.max(1, Math.min(config.scale || 3, maxS));
  cv.width = AW; cv.height = AH;
  cv.style.width = AW * S + 'px';
  cv.style.height = AH * S + 'px';
  ctx.imageSmoothingEnabled = false;
  pets.forEach((p, i) => { p.slotX = CX; p.slotY = ROOF - 6 - (pets.length - 1 - i) * SP; });
  api.resize(AW * S, AH * S);
}

function buildPets() {
  const wasOut = mode !== 'hidden' && mode !== 'closing';
  pets = config.pets.map((c, i) => ({
    idx: i, name: (c.name || '').toUpperCase(), skin: getSkin(c.skin),
    x: CX, y: 0, slotX: CX, slotY: 0, state: 'home', st: 0, delay: 0,
    facing: 1, phase: Math.random() * 6, trickT: 0, trickStart: 0,
    blinkAt: rnd(1, 4), lookAt: rnd(3, 8), tx: 0, ty: 0,
  }));
  layout();
  fight = null; cloud = null; shake = 0;
  if (wasOut && pets.length) {
    pets.forEach(p => { p.x = p.slotX; p.y = p.slotY; setState(p, 'idle'); });
    mode = 'out';
  } else {
    mode = 'hidden';
  }
}

// ───────────────────────── state ─────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;

let T = 0;
let mode = 'hidden'; // hidden | opening | out | closing | fight
let fight = null;
let cloud = null;
let shake = 0;
let hovered = null;  // pet | 'house' | null
let mx = -99, my = -99;
const parts = [];

function setState(p, s) { p.state = s; p.st = 0; }
function isVisible(p) {
  if (p.state === 'home' || p.state === 'brawl') return false;
  if (p.state === 'flyOut' && p.st < p.delay) return false;
  return true;
}
function addP(o) { parts.push(Object.assign({ t: 0, life: 1, vx: 0, vy: 0 }, o)); }
function dust(x, y, n = 4) {
  for (let i = 0; i < n; i++) addP({ type: 'dust', x: x + rnd(-3, 3), y: y - rnd(0, 2), vx: rnd(-14, 14), vy: rnd(-10, -2), life: rnd(0.3, 0.6) });
}
const NEON = ['#ff3fd0', '#4ff6ff', '#ffe14d', '#8d5bff', '#5dff9b'];
function sparkle(x, y, n = 1) {
  for (let i = 0; i < n; i++) addP({ type: 'spark', x: x + rnd(-6, 6), y: y - rnd(0, 20), vx: rnd(-6, 6), vy: rnd(-12, 4), life: rnd(0.3, 0.6), c: NEON[rndi(0, NEON.length - 1)] });
}
function floatY(p) { return Math.round(Math.sin(T * 2.2 + p.phase) * 1.5); }

// ───────────────────────── pets ─────────────────────────
function renderPet(p) {
  if (!isVisible(p)) return;
  let x = p.x, y = p.y;
  const o = { pose: 'idle', frame: 0, expr: 'normal', facing: p.facing, bob: 0, t: T };

  switch (p.state) {
    case 'idle':
      y += floatY(p);
      o.bob = Math.floor((T + p.phase) / 0.5) % 2;
      if (p.trickT > 0) {
        const tp = trickPose(p.skin, T - p.trickStart);
        Object.assign(o, tp); o.bob = 0;
        x += tp.dx; y += tp.dy;
        if (p.skin.trick !== 'spin') o.facing = p.facing;
      } else if (T > p.blinkAt) {
        o.expr = 'blink';
        if (T > p.blinkAt + 0.12) p.blinkAt = T + rnd(2, 5);
      }
      break;
    case 'flyOut': case 'flyIn': o.pose = 'up'; o.expr = 'happy'; break;
    case 'charge': o.pose = 'walk'; o.frame = Math.floor(T / 0.07) % 2; o.expr = 'angry'; break;
    case 'ready': y += floatY(p); o.pose = 'punch'; o.frame = Math.floor(T / 0.1) % 2; o.expr = 'angry'; break;
    case 'scared': o.pose = 'up'; o.expr = 'shock'; x += Math.floor(T / 0.04) % 2 ? 1 : -1; break;
    case 'flyHome': o.pose = 'walk'; o.frame = Math.floor(T / 0.14) % 2; o.expr = 'happy'; break;
    case 'ko': o.lying = true; o.expr = 'x'; y += floatY(p); break;
    case 'getup': o.pose = 'up'; o.expr = 'blink'; y -= Math.round(Math.sin(Math.min(1, p.st / 0.4) * Math.PI) * 5); break;
  }
  drawPet(p.skin, x, y, o);
}

// ───────────────────────── nightclub ─────────────────────────
const SIGN = 'THE LATENT SPACE';
let flickerIdx = -1, flickerUntil = 0;

function drawBeams() {
  const out = mode !== 'hidden';
  // sweeping searchlights from the roof corners
  for (const [lx, ph, col] of [[27, 0, '#ff3fd0'], [109, 2.1, '#4ff6ff']]) {
    const tx = CX + Math.sin(T * 0.8 + ph) * 70;
    ctx.globalAlpha = out ? 0.16 : 0.1;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(lx, ROOF - 3);
    ctx.lineTo(tx - 9, 0);
    ctx.lineTo(tx + 9, 0);
    ctx.closePath();
    ctx.fill();
  }
  // tractor-beam column the pets float in
  if (out) {
    const pulse = 0.07 + (beat() < 0.2 ? 0.04 : 0);
    ctx.globalAlpha = pulse;
    R(CX - 14, 0, 28, ROOF - 2, '#b46bff');
    ctx.globalAlpha = pulse * 2;
    R(CX - 14, 0, 1, ROOF - 2, '#e7c8ff'); R(CX + 13, 0, 1, ROOF - 2, '#e7c8ff');
  }
  ctx.globalAlpha = 1;
}

const beat = () => (T * 2) % 1; // 120 BPM

function drawClub() {
  const ol = '#07040d';
  const hot = hovered === 'house';
  const b = beat();
  const thump = b < 0.15;
  const homeCount = pets.filter(p => p.state === 'home' || (p.state === 'flyOut' && p.st < p.delay)).length;

  // ground + neon puddle reflections
  R(14, G, 108, 2, '#1c1729');
  ctx.globalAlpha = 0.5;
  R(36, G + 1, 8, 1, '#ff3fd0'); R(92, G + 1, 8, 1, '#4ff6ff'); R(62, G + 1, 12, 1, '#c0213c');
  ctx.globalAlpha = 1;

  // walls (dark brick)
  R(25, ROOF + 3, 86, G - ROOF - 3, ol);
  R(26, ROOF + 4, 84, G - ROOF - 4, '#1d1733');
  for (let y = ROOF + 6, row = 0; y < G - 1; y += 3, row++) {
    R(26, y, 84, 1, '#16112a');
    for (let x = 26 + (row % 2) * 3; x < 110; x += 6) R(x, y - 2, 1, 2, '#16112a');
  }

  // parapet with chasing marquee lights
  R(22, ROOF, 92, 4, ol);
  R(23, ROOF + 1, 90, 2, '#2d2450');
  for (let i = 0, x = 24; x < 112; x += 4, i++) {
    const on = (i - Math.floor(T * 10)) % 4 === 0 || (i - Math.floor(T * 10)) % 4 === -0;
    R(x, ROOF + 1, 2, 1, on ? NEON[i % NEON.length] : '#4a3c70');
  }

  // roof launch pad + spotlight cans
  const out = mode !== 'hidden';
  R(57, ROOF - 2, 22, 2, ol);
  R(58, ROOF - 2, 20, 1, out ? (thump ? '#ffffff' : '#e7c8ff') : '#3a3060');
  box(24, ROOF - 5, 6, 5, '#3a3a48', ol); R(25, ROOF - 5, 4, 1, '#ff3fd0');
  box(106, ROOF - 5, 6, 5, '#3a3a48', ol); R(107, ROOF - 5, 4, 1, '#4ff6ff');

  // neon sign
  const sy = ROOF + 7;
  ctx.globalAlpha = hot ? 0.35 : 0.2;
  R(32, sy - 2, 72, 15, '#4ff6ff');
  ctx.globalAlpha = 1;
  R(33, sy - 1, 70, 13, '#4ff6ff');
  R(34, sy, 68, 11, '#0d0820');
  if (T > flickerUntil && Math.random() < 0.01) { flickerIdx = rndi(0, SIGN.length - 1); flickerUntil = T + rnd(0.1, 0.5); }
  if (T > flickerUntil) flickerIdx = -1;
  const tx = CX - Math.floor(textW(SIGN) / 2);
  const pink = hot ? '#ffd0f6' : thump ? '#ff9cec' : '#ff5fdc';
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < SIGN.length; i++) if (i !== flickerIdx) { text(SIGN[i], tx + i * 4 - 1, sy + 3, '#ff3fd0'); text(SIGN[i], tx + i * 4 + 1, sy + 3, '#ff3fd0'); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < SIGN.length; i++) text(SIGN[i], tx + i * 4, sy + 3, i === flickerIdx ? '#4a2546' : pink);

  // VIP marquee over the door
  text('VIP', CX - 5, ROOF + 20, thump ? '#fff6b0' : '#ffd34d');

  // porthole windows pulsing to the beat, with dancing silhouettes while pets are inside
  [[40, 0], [96, 1]].forEach(([wx, k]) => {
    const wy = ROOF + 29;
    circle(wx, wy, 6, ol);
    const c = NEON[(Math.floor(T * 2) + k * 2) % NEON.length];
    circle(wx, wy, 5, c);
    ctx.globalAlpha = 0.35; circle(wx, wy, 3, '#ffffff'); ctx.globalAlpha = 1;
    const inside = pets.filter(p => p.state === 'home' || (p.state === 'flyOut' && p.st < p.delay)).filter((_, j) => j % 2 === k);
    inside.slice(0, 2).forEach((p, j) => {
      const hop = Math.floor(T * 4 + j) % 2;
      const sx = wx - 3 + j * 4;
      R(sx, wy - 1 + hop, 3, 6 - hop, p.skin.pal.dark);
    });
    R(wx - 6, wy - 1, 13, 1, ol); R(wx - 1, wy - 6, 1, 13, ol);
  });

  // door
  const dx = 59, dw = 18, dy = G - 18;
  R(dx - 1, dy - 1, dw + 2, 19, thump && homeCount ? '#c08bff' : '#8d5bff');
  R(dx, dy, dw, 18, '#0b0716');
  const doorOpen = pets.some(p => (p.state === 'flyOut' && p.st >= p.delay && p.st < p.delay + 0.3) || (p.state === 'flyIn' && p.st > 0.25));
  if (homeCount || doorOpen) {
    // party light spilling through the door gap
    ctx.globalAlpha = 0.6 + (thump ? 0.3 : 0);
    R(dx + 2, dy + 2, dw - 4, 14, NEON[Math.floor(T * 4) % NEON.length]);
    ctx.globalAlpha = 1;
    R(dx + 4, dy + 4, dw - 8, 12, '#0b0716');
  } else {
    R(dx + 8, dy, 2, 18, '#1a1130');
  }
  R(dx + 6, dy + 9, 1, 2, '#ffd34d'); R(dx + 11, dy + 9, 1, 2, '#ffd34d');

  // velvet rope + red carpet
  R(dx + 1, G, dw - 2, 2, '#c0213c');
  for (const px of [49, 86]) { R(px, G - 7, 2, 7, '#ffd34d'); R(px - 1, G - 8, 4, 1, '#fff0a0'); }
  for (const [x0, x1] of [[51, dx - 1], [dx + dw + 1, 86]]) {
    for (let x = x0; x < x1; x++) {
      const k = (x - x0) / (x1 - x0);
      R(x, G - 6 + Math.round(Math.sin(k * Math.PI) * 2), 1, 1, '#d0213c');
    }
  }

  if (hot && mode === 'hidden') bubble('CLICK!', CX, ROOF - 6 - (Math.floor(T * 3) % 2));
}

// ───────────────────────── fight cloud ─────────────────────────
function reseedCloud() {
  const puffs = [[0, 0, 10], [-10, 2, 7], [10, 2, 7], [0, -9, 7], [-6, -6, 6], [6, -6, 6]];
  for (let i = 0; i < 6; i++) puffs.push([rndi(-14, 14), rndi(-11, 4), rndi(4, 7)]);
  const dirs = [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [1, 1], [-1, 1], [0, 1]];
  const limbs = [];
  for (let i = 0; i < 4; i++) {
    limbs.push({ d: dirs[rndi(0, dirs.length - 1)], len: rndi(14, 18), skin: pets[rndi(0, pets.length - 1)].skin, foot: Math.random() < 0.35 });
  }
  const stars = [];
  for (let i = 0; i < 3; i++) stars.push([rndi(-16, 16), rndi(-14, 6)]);
  cloud.seed = { puffs, limbs, stars };
  cloud.seedT = T;
}
function drawCloud() {
  if (!cloud) return;
  if (!cloud.seed || T - cloud.seedT > 0.07) reseedCloud();
  const { puffs, limbs, stars } = cloud.seed;
  const cx = Math.round(cloud.x), cy = Math.round(cloud.y);
  const ol = '#241a22';
  for (const l of limbs) {
    const P = l.skin.pal;
    for (let i = 0; i <= l.len; i++) R(cx + l.d[0] * i - 1, cy + l.d[1] * i - 1, 3, 3, P.ol);
    for (let i = 0; i <= l.len; i++) R(cx + l.d[0] * i, cy + l.d[1] * i, 1, 1, P.main);
    const ex = cx + l.d[0] * l.len, ey = cy + l.d[1] * l.len;
    if (l.foot) box(ex - 3, ey - 2, 6, 4, P.dark, P.ol);
    else box(ex - 2, ey - 2, 5, 5, P.main, P.ol, P.light);
  }
  for (const [dx, dy, r] of puffs) circle(cx + dx, cy + dy, r + 1, ol);
  for (const [dx, dy, r] of puffs) circle(cx + dx, cy + dy, r, '#ece6db');
  for (const [dx, dy, r] of puffs) if (r > 4) circle(cx + dx + 1, cy + dy + 2, r - 3, '#cfc6b6');
  for (const [dx, dy] of stars) star(cx + dx, cy + dy, Math.random() < 0.5 ? '#ffe14d' : '#ffffff');
}

// ───────────────────────── particles ─────────────────────────
function drawParts() {
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - p.t / p.life) * 1.6));
    const x = Math.round(p.x), y = Math.round(p.y);
    switch (p.type) {
      case 'dust': R(x, y, 2, 2, '#d9d2c5'); break;
      case 'note': R(x, y, 2, 2, p.c); R(x + 1, y - 4, 1, 4, p.c); R(x + 2, y - 4, 1, 1, p.c); R(x + 3, y - 3, 1, 1, p.c); break;
      case 'spark': if (Math.floor(p.t * 12) % 2) star(x, y, p.c); else R(x, y, 1, 1, p.c); break;
      case 'word': {
        const sc = p.t < 0.06 ? 1 : 2;
        textOutlined(p.s, x - Math.floor(textW(p.s, sc) / 2), y, p.c, '#1a1020', sc);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────── logic ─────────────────────────
function toggleHouse() {
  if (!pets.length) return;
  if (mode === 'hidden') {
    mode = 'opening';
    // bottom slot launches first so the column stacks upward
    pets.forEach((p, i) => {
      setState(p, 'flyOut');
      p.delay = (pets.length - 1 - i) * 0.14;
      p.x = CX; p.y = ROOF; p.facing = 1;
    });
  } else if (mode === 'out') {
    mode = 'closing';
    pets.forEach((p, i) => { setState(p, 'flyIn'); p.delay = i * 0.1; p.fx = p.x; p.fy = p.y; p.trickT = 0; });
  }
}

function startFight(v) {
  api.launch(v.idx); // open the app immediately — the brawl plays on top
  mode = 'fight';
  fight = { v, phase: 'charge', t: 0, nextWord: 0 };
  pets.forEach(p => { p.trickT = 0; });
  setState(v, 'scared');
  const attackers = pets.filter(p => p !== v)
    .sort((a, b) => Math.abs(a.slotY - v.slotY) - Math.abs(b.slotY - v.slotY));
  attackers.forEach((a, k) => {
    const side = k % 2 ? 1 : -1;
    const rank = Math.floor(k / 2);
    a.tx = v.x + side * (13 + rank * 6);
    a.ty = v.y - rank * 3;
    a.facing = -side;
    setState(a, 'charge');
  });
  if (!attackers.length) { // lonely pet: just get dizzy
    fight.phase = 'after';
    setState(v, 'ko');
  }
}

const WORDS = ['POW!', 'BAM!', 'WHAM!', 'BONK!', 'ZAP!', 'OOF!', 'KAPOW!'];

function moveToward(p, tx, ty, speed, dt) {
  const dx = tx - p.x, dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  if (d <= step) { p.x = tx; p.y = ty; return true; }
  p.x += dx / d * step; p.y += dy / d * step;
  return false;
}

function updateFight(dt) {
  const f = fight;
  f.t += dt;
  const v = f.v;
  const attackers = pets.filter(p => p !== v);

  if (f.phase === 'charge') {
    for (const a of attackers) {
      if (a.state === 'charge') {
        if (moveToward(a, a.tx, a.ty, 150, dt)) setState(a, 'ready');
        if (Math.random() < 0.4) addP({ type: 'dust', x: a.x - a.facing * 5, y: a.y - rnd(2, 10), vx: -a.facing * 20, vy: rnd(-4, 4), life: 0.3 });
      }
    }
    if ((attackers.every(a => a.state === 'ready') && f.t > 0.7) || f.t > 1.6) {
      f.phase = 'cloud'; f.t = 0;
      cloud = { x: v.x, y: v.y - 12 };
      pets.forEach(p => setState(p, 'brawl'));
      dust(v.x, v.y, 10);
    }
  } else if (f.phase === 'cloud') {
    shake = 1;
    cloud.x = v.x + Math.sin(f.t * 23) * 2;
    if (f.t > f.nextWord) {
      f.nextWord = f.t + rnd(0.22, 0.34);
      const s = WORDS[rndi(0, WORDS.length - 1)];
      const side = Math.random() < 0.5 ? -1 : 1;
      addP({ type: 'word', s,
        x: Math.max(18, Math.min(AW - 18, v.x + side * rnd(26, 44))),
        y: Math.max(4, Math.min(AH - 14, v.y - rnd(8, 30))),
        vy: -10, life: 0.45, c: NEON[rndi(0, NEON.length - 1)] });
    }
    if (Math.random() < 0.3) dust(v.x + rnd(-10, 10), v.y, 1);
    if (f.t > 2.0) {
      f.phase = 'after'; f.t = 0;
      shake = 0; cloud = null;
      dust(v.x, v.y, 12);
      setState(v, 'ko');
      attackers.forEach(a => {
        a.x = v.x + rnd(-14, 14); a.y = v.y + rnd(-6, 4);
        a.facing = a.slotX >= a.x ? 1 : -1;
        setState(a, 'flyHome');
      });
    }
  } else if (f.phase === 'after') {
    for (const a of attackers) {
      if (a.state === 'flyHome') {
        a.facing = a.slotX > a.x + 0.5 ? 1 : a.slotX < a.x - 0.5 ? -1 : a.facing;
        if (moveToward(a, a.slotX, a.slotY, 50, dt)) { a.facing = 1; setState(a, 'idle'); }
      }
    }
    if (v.state === 'ko' && v.st > 2.4) setState(v, 'getup');
    if (v.state === 'getup' && v.st > 0.45) { setState(v, 'idle'); v.facing = 1; }
    if (pets.every(p => p.state === 'idle')) { mode = 'out'; fight = null; }
  }
}

function trickLen(p) { return p.skin.trick === 'flip' ? 2.8 : p.skin.trick === 'wave' ? 1.6 : 1.8; }

function update(dt) {
  T += dt;
  for (const p of pets) {
    p.st += dt;
    if (p.trickT > 0) {
      p.trickT -= dt;
      if (hovered === p && p.trickT < 0.15) p.trickT = trickLen(p); // loop while hovered
      const tt = T - p.trickStart;
      const tr = p.skin.trick;
      if (tr === 'dance' && Math.random() < dt * 3) addP({ type: 'note', x: p.x + rnd(-8, 6), y: p.y - 22, vx: rnd(-6, 6), vy: -16, life: 0.9, c: NEON[rndi(0, NEON.length - 1)] });
      if (tr === 'spin' && Math.random() < dt * 10) sparkle(p.x, p.y - 4);
      if (tr === 'flip' && tt % 1.4 > 0.58 && tt % 1.4 < 0.62) dust(p.x, p.y, 3);
    }

    if (p.state === 'idle' && p.trickT <= 0 && T > p.lookAt && mode === 'out') {
      p.facing = Math.random() < 0.6 ? 1 : -1;
      p.lookAt = T + rnd(3, 8);
    }

    if (p.state === 'flyOut' && p.st >= p.delay) {
      const k = Math.min(1, (p.st - p.delay) / 0.6);
      if (p.st - p.delay < dt * 1.5) sparkle(CX, ROOF, 4);
      p.x = CX + Math.sin(k * Math.PI * 2) * 6 * (1 - k);
      p.y = lerp(ROOF, p.slotY, easeOut(k));
      if (Math.random() < 0.3) sparkle(p.x, p.y + 4);
      if (k >= 1) { p.x = p.slotX; p.y = p.slotY; setState(p, 'idle'); }
    }
    if (p.state === 'flyIn' && p.st >= p.delay) {
      const k = Math.min(1, (p.st - p.delay) / 0.45);
      p.x = lerp(p.fx, CX, k);
      p.y = lerp(p.fy, ROOF + 4, easeIn(k));
      if (k >= 1) { setState(p, 'home'); sparkle(CX, ROOF, 3); }
    }
  }

  if (mode === 'opening' && pets.every(p => p.state === 'idle')) mode = 'out';
  if (mode === 'closing' && pets.every(p => p.state === 'home')) mode = 'hidden';
  if (mode === 'fight') updateFight(dt);

  // music notes leaking out of the club while the party is inside
  if (mode === 'hidden' && Math.random() < dt * 1.4) {
    addP({ type: 'note', x: rnd(30, 106), y: ROOF - 2, vx: rnd(-5, 5), vy: -12, life: 1.6, c: NEON[rndi(0, NEON.length - 1)] });
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.t >= q.life) parts.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, AW, AH);
  ctx.save();
  if (shake) ctx.translate(rndi(-1, 1), rndi(-1, 1));
  drawBeams();

  const order = [...pets].sort((a, b) => (a.state === 'ko' ? -1 : 0) - (b.state === 'ko' ? -1 : 0));
  for (const p of order) renderPet(p);
  drawClub();
  drawCloud();

  for (const p of pets) {
    if (!isVisible(p)) continue;
    const by = p.y + (p.state === 'idle' ? floatY(p) : 0);
    if (p.state === 'idle' && p.trickT > 0) {
      const tt = T - p.trickStart;
      if (p.skin.trick === 'wave') sideBubble('HI!', p.x + 11, by - 14);
      if (p.skin.trick === 'flip' && tt > 0.6) sideBubble('COOL', p.x + 11, by - 14);
    }
    if (p.state === 'scared') sideBubble('!', p.x + 11, p.y - 14 - (Math.floor(T * 8) % 2));
    if (p.state === 'ready' && Math.floor(T / 0.1) % 2) star(p.x + p.facing * 13, p.y - 8, '#ffffff');
    if (p.state === 'ko') {
      const hx = p.x - 6, hy = by - 19;
      for (let i = 0; i < 3; i++) {
        const a = T * 5 + i * (Math.PI * 2 / 3);
        star(Math.round(hx + Math.cos(a) * 8), Math.round(hy + Math.sin(a) * 2), '#ffe14d');
      }
    }
    if (hovered === p && mode === 'out' && p.name) {
      const w = textW(p.name) + 4;
      const x = Math.max(1, Math.round(p.x - 12 - w));
      box(x, by - 18, w, 9, '#120c22', '#ff3fd0');
      text(p.name, x + 2, by - 16, p.skin.pal.light);
    }
  }
  drawParts();
  ctx.restore();
}

// ───────────────────────── input ─────────────────────────
let interactive = false;
let press = null;
let dragging = false;

function hitTest() {
  if (mode !== 'hidden') {
    for (const p of pets) {
      if (!isVisible(p)) continue;
      if (mx >= p.x - 9 && mx <= p.x + 9 && my >= p.y - 26 && my <= p.y + 2) return p;
    }
  }
  if (mx >= 21 && mx <= 115 && my >= ROOF - 5 && my <= AH) return 'house';
  return null;
}

function setInteractive(on) {
  if (on === interactive) return;
  interactive = on;
  api.setIgnore(!on);
  cv.style.cursor = on ? 'pointer' : 'default';
}

function refreshHover() {
  const hit = hitTest();
  setInteractive(!!hit || dragging);
  const prev = hovered;
  hovered = hit;
  if (hit && hit !== 'house' && hit !== prev && mode === 'out' && hit.state === 'idle' && hit.trickT <= 0) {
    hit.trickStart = T; hit.trickT = trickLen(hit);
  }
}

window.addEventListener('mousemove', e => {
  mx = e.clientX / S; my = e.clientY / S;
  if (press && !dragging && Math.hypot(e.screenX - press.x, e.screenY - press.y) > 4) {
    dragging = true;
    api.dragStart();
  }
  if (!dragging) refreshHover();
});

window.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const hit = hitTest();
  if (hit === 'house') press = { x: e.screenX, y: e.screenY };
  else if (hit && mode === 'out' && hit.state === 'idle') startFight(hit);
});

window.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  if (dragging) { dragging = false; api.dragEnd(); }
  else if (press && hitTest() === 'house') toggleHouse();
  press = null;
  refreshHover();
});

window.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (hitTest()) api.menu();
});

document.addEventListener('mouseleave', () => {
  if (dragging) return;
  mx = my = -99;
  hovered = null;
  setInteractive(false);
});

window.addEventListener('blur', () => {
  if (dragging) { dragging = false; api.dragEnd(); }
  press = null;
});

api.onToggle(() => toggleHouse());
api.onConfig(data => { config = data.config; screenH = data.screenH || screenH; buildPets(); });

// ───────────────────────── boot ─────────────────────────
api.getConfig().then(data => {
  config = data.config;
  screenH = data.screenH || screenH;
  buildPets();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
