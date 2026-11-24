import { mulberry32 } from './rng.js';

/* ------------------------------------------------------------------ *
 * Tiny pixel-art toolkit.
 * Draw into a Grid, then emit run-length rects for SVG (crisp, scalable,
 * and every part stays a real DOM node we can animate or make focusable).
 * ------------------------------------------------------------------ */

export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Map();
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px.set(y * this.w + x, c);
  }
  get(x, y) {
    return this.px.get(y * this.w + x);
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  glyph(x, y, rows, c) {
    rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '#') this.set(x + i, y + j, c);
      }),
    );
  }
  runs() {
    const out = [];
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.px.get(y * this.w + x);
        if (!c) {
          x++;
          continue;
        }
        let e = x + 1;
        while (e < this.w && this.px.get(y * this.w + e) === c) e++;
        out.push({ x, y, w: e - x, c });
        x = e;
      }
    }
    return out;
  }
}

export const C = {
  skyTop: '#0E2347',
  sky2: '#183B73',
  sky3: '#2D64A3',
  sky4: '#6FA8D0',
  sky5: '#BFDDE0',
  sun: '#F5D678',
  halo: '#DDE9D0',
  cloud: '#9CC3DA',
  cloudHi: '#D8EBEF',
  sea1: '#2F78A8',
  sea2: '#245F8D',
  sea3: '#1B4A72',
  sea4: '#12365A',
  foam: '#E4F2F2',
  wood: '#7B4A2B',
  woodDk: '#5A3320',
  woodLt: '#9A6439',
  sail: '#EFEADA',
  sailSh: '#CFC8B2',
  sailDk: '#A9A28D',
  ink: '#12306B',
  brass: '#EDB52E',
  brassDk: '#B98716',
  coral: '#E4572E',
  black: '#101820',
  white: '#F6F8F4',
  rope: '#C9B27C',
  steel: '#2B3640',
};

export const SCENE_W = 192;
export const SCENE_H = 108;
export const HORIZON = 74;

const GLYPHS = {
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '/': ['..#', '..#', '.#.', '.#.', '#..'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '{': ['.##', '.#.', '#..', '.#.', '.##'],
  '}': ['##.', '.#.', '..#', '.#.', '##.'],
  C: ['###', '#..', '#..', '#..', '###'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
};

/* ----------------------------- sky & sea ---------------------------- */

function dithered(g, bands) {
  // bands: [startY, color]. Two dithered rows before each boundary give the stepped, retro look.
  for (let y = 0; y < g.h; y++) {
    let bi = 0;
    while (bi + 1 < bands.length && y >= bands[bi + 1][0]) bi++;
    const cur = bands[bi][1];
    const next = bands[bi + 1];
    for (let x = 0; x < g.w; x++) {
      let c = cur;
      if (next) {
        if (y === next[0] - 2 && (x + y) % 4 === 0) c = next[1];
        if (y === next[0] - 1 && (x + y) % 2 === 0) c = next[1];
      }
      g.set(x, y, c);
    }
  }
}

function buildSky() {
  const g = new Grid(SCENE_W, HORIZON + 2);
  dithered(g, [
    [0, C.skyTop],
    [14, C.sky2],
    [30, C.sky3],
    [48, C.sky4],
    [62, C.sky5],
  ]);
  return g;
}

function buildSun() {
  const size = 34;
  const g = new Grid(size, size);
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 10) g.set(x, y, C.sun);
      else if (d <= 14 && (x + y) % 2 === 0) g.set(x, y, C.halo);
      else if (d <= 16 && (x % 2 === 0 && y % 2 === 0)) g.set(x, y, C.halo);
    }
  }
  return g;
}

function buildCloud(seed, w, h) {
  const rnd = mulberry32(seed);
  const g = new Grid(w, h);
  const bumps = Math.max(3, Math.floor(w / 7));
  for (let b = 0; b < bumps; b++) {
    const cx = 4 + (b / (bumps - 1)) * (w - 8);
    const r = 2 + rnd() * (h / 2 - 1);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot((x - cx) * 0.7, (y - (h - 3)) * 1.1);
        if (d <= r + 1 && y < h - 1) g.set(x, y, y < h * 0.45 ? C.cloudHi : C.cloud);
      }
  }
  g.rect(1, h - 2, w - 2, 1, C.cloud);
  return g;
}

function buildSeaBack() {
  const g = new Grid(SCENE_W, SCENE_H - HORIZON);
  dithered(g, [
    [0, C.sea1],
    [7, C.sea2],
    [19, C.sea3],
    [28, C.sea4],
  ]);
  return g;
}

function buildWave({ amp, period, color, foam, phase = 0, rows = 40 }) {
  // width must be a whole number of periods so the tile repeats seamlessly
  const g = new Grid(SCENE_W, rows);
  for (let x = 0; x < SCENE_W; x++) {
    const top = Math.round(amp + amp * Math.sin((x / period) * Math.PI * 2 + phase));
    for (let y = top; y < rows; y++) g.set(x, y, color);
    if (foam && top === 0) {
      g.set(x, 0, foam);
      if ((x + phase * 7) % 3 < 1) g.set(x, 1, foam);
    }
  }
  return g;
}

/* ----------------------------- the ship ----------------------------- */

const D = 54; // main deck level (ship-local y)
export const SHIP_W = 124;
export const SHIP_H = 72;
export const SHIP_X = 34; // where the ship sits in the scene
export const SHIP_Y = 10;

function crate(g, x, y, w, h) {
  g.rect(x, y, w, h, C.woodLt);
  for (let i = 0; i < w; i++) {
    g.set(x + i, y, C.woodDk);
    g.set(x + i, y + h - 1, C.woodDk);
  }
  for (let j = 0; j < h; j++) {
    g.set(x, y + j, C.woodDk);
    g.set(x + w - 1, y + j, C.woodDk);
  }
  g.line(x, y, x + w - 1, y + h - 1, C.woodDk);
  g.line(x + w - 1, y, x, y + h - 1, C.woodDk);
}

function sail(g, x0, x1, top, bottomAt) {
  const w = x1 - x0;
  for (let x = x0; x <= x1; x++) {
    const bot = bottomAt(x);
    for (let y = top; y <= bot; y++) {
      let c = C.sail;
      if (x > x1 - Math.round(w * 0.26) || x === x0) c = C.sailSh;
      if ((x - x0) % 9 === 8 && y > top) c = C.sailSh;
      if (y === top) c = C.sailSh;
      if (y === bot) c = C.sailDk;
      g.set(x, y, c);
    }
  }
}

function buildShipBack() {
  const g = new Grid(SHIP_W, SHIP_H);

  // rigging, behind everything
  const rig = '#2B2018';
  g.line(57, 3, 8, 43, rig);
  g.line(57, 3, 93, 12, rig);
  g.line(93, 12, 122, 45, rig);
  // bowsprit
  g.line(100, 52, 122, 45, C.woodDk);
  g.line(100, 51, 121, 44, C.woodDk);

  // hull
  for (let y = D; y <= 68; y++) {
    const t = (y - D) / 14;
    const xl = Math.round(6 + 11 * t);
    const xr = Math.round(110 - 15 * Math.pow(t, 1.15));
    for (let x = xl; x <= xr; x++) g.set(x, y, C.wood);
  }
  for (const y of [57, 60, 63, 66]) {
    for (let x = 0; x < SHIP_W; x++) if (g.get(x, y) === C.wood) g.set(x, y, C.woodDk);
  }
  for (let x = 0; x < SHIP_W; x++) {
    if (g.get(x, D)) g.set(x, D, C.woodLt);
    if (g.get(x, 56)) g.set(x, 56, C.brass);
    if (g.get(x, 68)) g.set(x, 68, C.woodDk);
  }
  for (const x of [44, 58, 72, 86]) g.rect(x, 58, 3, 2, C.black); // gun ports
  for (const x of [14, 19, 24]) g.rect(x, 58, 3, 2, C.brass); // cabin windows
  // the ship's name along the hull
  'CODE2CHILL'.split('').forEach((ch, i) => g.glyph(30 + i * 4, 61, GLYPHS[ch], C.white));

  // quarterdeck (stern castle)
  g.rect(6, 46, 28, 8, C.wood);
  for (let x = 6; x < 34; x++) {
    g.set(x, 46, C.woodLt);
    g.set(x, 49, C.woodDk);
    g.set(x, 52, C.woodDk);
  }
  g.rect(33, 46, 1, 8, C.woodDk);
  // stern lantern
  g.rect(6, 36, 1, 10, C.woodDk);
  g.rect(4, 32, 3, 1, C.woodDk);
  g.rect(4, 33, 3, 3, C.brass);
  g.set(5, 34, '#FBE9A0');
  // helm wheel
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dy);
      if (d >= 3.2 && d <= 4.4) g.set(18 + dx, 40 + dy, C.woodLt);
    }
  g.line(18, 36, 18, 44, C.woodDk);
  g.line(14, 40, 22, 40, C.woodDk);
  g.line(15, 37, 21, 43, C.woodDk);
  g.line(21, 37, 15, 43, C.woodDk);
  g.rect(17, 39, 2, 2, C.brass);
  g.rect(18, 44, 1, 2, C.woodDk);

  // cargo, cannon and galley
  crate(g, 35, 48, 9, 6);
  crate(g, 37, 44, 6, 4);
  g.rect(76, 49, 1, 3, '#1B232B');
  g.rect(77, 49, 10, 3, C.steel);
  g.rect(77, 49, 10, 1, '#4B5A66');
  g.rect(87, 48, 1, 5, '#1B232B');
  g.rect(78, 52, 7, 2, C.woodDk);
  g.rect(78, 52, 2, 2, C.black);
  g.rect(83, 52, 2, 2, C.black);
  g.rect(102, 49, 7, 1, '#4B5A66');
  g.rect(103, 50, 5, 3, C.steel);
  g.rect(102, 53, 7, 1, '#1B232B');

  // masts (sails hang in front of them)
  g.rect(56, 1, 2, 53, C.woodDk);
  g.rect(56, 1, 1, 53, C.wood);
  g.rect(92, 12, 2, 42, C.woodDk);
  g.rect(92, 12, 1, 42, C.wood);
  g.rect(54, 52, 6, 2, C.woodDk);
  g.rect(90, 52, 6, 2, C.woodDk);

  // sails
  sail(g, 41, 72, 29, (x) => 49 - Math.round(3 * Math.pow((x - 56.5) / 16, 2)));
  sail(g, 48, 65, 11, (x) => 19 - Math.round(2 * Math.pow((x - 56.5) / 9, 2)));
  g.rect(48, 14, 18, 2, C.coral);
  sail(g, 79, 106, 23, (x) => 44 - Math.round(3 * Math.pow((x - 92.5) / 13.5, 2)));
  // emblems: </> on the main sail, { } on the foresail
  g.glyph(51, 36, GLYPHS['<'], C.ink);
  g.glyph(55, 36, GLYPHS['/'], C.ink);
  g.glyph(59, 36, GLYPHS['>'], C.ink);
  g.glyph(84, 31, GLYPHS['{'], C.ink);
  g.glyph(97, 31, GLYPHS['}'], C.ink);
  // fresh paint from the sailmaker
  g.rect(99, 23, 8, 2, C.coral);

  // yards and the crow's nest platform
  g.rect(40, 28, 34, 1, C.woodDk);
  g.set(40, 27, C.woodDk);
  g.set(73, 27, C.woodDk);
  g.rect(47, 10, 19, 1, C.woodDk);
  g.rect(78, 22, 30, 1, C.woodDk);
  g.rect(50, 24, 14, 2, C.woodDk);
  g.rect(51, 26, 12, 1, C.woodDk);
  return g;
}

function buildShipFront() {
  const g = new Grid(SHIP_W, SHIP_H);
  // quarterdeck rail
  g.rect(6, 45, 28, 1, C.woodLt);
  for (let x = 6; x < 34; x += 4) g.rect(x, 43, 1, 2, C.woodDk);
  // main bulwark
  g.rect(34, 53, 77, 1, C.woodLt);
  for (let x = 36; x < 110; x += 4) g.rect(x, 51, 1, 2, C.woodDk);
  // crow's nest wicker (hides the navigator's legs)
  g.rect(50, 21, 14, 1, C.woodLt);
  for (let y = 22; y <= 23; y++)
    for (let x = 50; x < 64; x++) g.set(x, y, (x + y) % 2 ? C.woodDk : C.wood);
  g.rect(50, 19, 1, 4, C.woodDk);
  g.rect(63, 19, 1, 4, C.woodDk);
  return g;
}

function pennant(frame) {
  const g = new Grid(SHIP_W, SHIP_H);
  if (frame === 0) {
    g.rect(58, 1, 7, 1, C.coral);
    g.rect(58, 2, 5, 1, C.coral);
    g.rect(58, 3, 3, 1, C.coral);
  } else {
    g.rect(58, 2, 7, 1, C.coral);
    g.rect(58, 3, 5, 1, C.coral);
    g.rect(58, 4, 3, 1, C.coral);
  }
  g.rect(94, 12, 4, 1, C.brass);
  g.rect(94, 13, 2, 1, C.brass);
  return g;
}

function steam(frame) {
  const g = new Grid(SHIP_W, SHIP_H);
  const puff = '#DDE8EA';
  if (frame === 0) {
    g.rect(104, 47, 2, 2, puff);
    g.rect(107, 45, 1, 1, puff);
  } else if (frame === 1) {
    g.rect(105, 45, 2, 2, puff);
    g.rect(103, 43, 2, 1, puff);
  } else {
    g.rect(104, 43, 3, 2, puff);
    g.rect(106, 41, 1, 1, puff);
  }
  return g;
}

/* ------------------------------- crew ------------------------------- */

export function drawSailor(g, x, y, o) {
  const {
    hat = 'cap',
    hatC = C.black,
    coat = C.ink,
    trim = C.brass,
    skin = '#E8B58B',
    pants = '#243447',
    boots = C.black,
    beard,
    item,
    armUp,
  } = o;

  // hat
  if (hat === 'chef') {
    g.rect(x + 2, y - 3, 3, 1, C.white);
    g.rect(x + 1, y - 2, 5, 2, C.white);
    g.rect(x + 1, y, 5, 1, C.white);
    g.rect(x + 1, y + 1, 5, 1, '#C9D2CC');
  } else if (hat === 'tricorn') {
    g.rect(x + 2, y, 3, 1, hatC);
    g.rect(x, y + 1, 7, 1, hatC);
    g.set(x + 3, y, trim);
  } else if (hat === 'beret') {
    g.set(x + 2, y - 1, hatC);
    g.rect(x + 1, y, 4, 1, hatC);
    g.rect(x + 1, y + 1, 5, 1, hatC);
  } else if (hat === 'bandana') {
    g.rect(x + 2, y, 3, 1, hatC);
    g.rect(x + 1, y + 1, 5, 1, hatC);
    g.set(x, y + 2, hatC);
  } else if (hat === 'knit') {
    g.set(x + 3, y - 1, trim);
    g.rect(x + 2, y, 3, 1, hatC);
    g.rect(x + 1, y + 1, 5, 1, hatC);
  } else {
    g.rect(x + 2, y, 3, 1, hatC);
    g.rect(x + 1, y + 1, 6, 1, hatC);
  }

  // head
  g.rect(x + 2, y + 2, 3, 3, skin);
  g.set(x + 4, y + 3, C.black);
  if (beard) g.rect(x + 2, y + 4, 3, 1, beard);

  // body, belt and buttons
  g.rect(x + 1, y + 5, 5, 4, coat);
  g.rect(x + 1, y + 8, 5, 1, C.woodDk);
  g.set(x + 3, y + 5, trim);
  g.set(x + 3, y + 7, trim);

  // arms
  g.rect(x, y + 6, 1, 2, coat);
  g.set(x, y + 8, skin);
  if (armUp) {
    g.rect(x + 6, y + 4, 1, 3, coat);
    g.set(x + 6, y + 3, skin);
  } else {
    g.rect(x + 6, y + 6, 1, 2, coat);
    g.set(x + 6, y + 8, skin);
  }

  // legs
  g.rect(x + 2, y + 9, 2, 1, pants);
  g.rect(x + 4, y + 9, 2, 1, pants);
  g.rect(x + 2, y + 10, 2, 1, boots);
  g.rect(x + 4, y + 10, 2, 1, boots);
  g.set(x + 6, y + 10, boots);

  // what they're holding
  if (item === 'spyglass') {
    g.line(x + 7, y + 3, x + 13, y - 1, C.woodDk);
    g.line(x + 7, y + 2, x + 13, y - 2, C.brassDk);
    g.rect(x + 14, y - 3, 1, 2, C.brass);
  } else if (item === 'scroll') {
    g.rect(x + 7, y + 7, 3, 4, '#EFEADA');
    g.set(x + 8, y + 8, C.ink);
    g.set(x + 8, y + 10, C.ink);
  } else if (item === 'book') {
    g.rect(x + 7, y + 7, 3, 4, C.wood);
    g.rect(x + 9, y + 7, 1, 4, C.brass);
  } else if (item === 'brush') {
    g.line(x + 7, y + 8, x + 11, y + 12, C.woodDk);
    g.rect(x + 11, y + 11, 2, 2, C.coral);
  } else if (item === 'whistle') {
    g.set(x + 5, y + 4, C.brass);
    g.set(x + 7, y + 2, C.white);
    g.set(x + 8, y + 3, C.white);
    g.set(x + 8, y + 1, C.white);
  } else if (item === 'fuse') {
    g.line(x + 7, y + 8, x + 10, y + 9, C.woodDk);
    g.set(x + 11, y + 9, C.coral);
    g.set(x + 11, y + 8, C.brass);
  } else if (item === 'rope') {
    g.rect(x + 7, y + 7, 3, 3, C.rope);
    g.set(x + 8, y + 8, C.woodDk);
    g.line(x + 9, y + 9, x + 11, y + 12, C.rope);
  } else if (item === 'ladle') {
    g.line(x + 7, y + 8, x + 9, y + 10, '#C9D2CC');
    g.rect(x + 9, y + 10, 2, 2, '#8FA0AA');
  }
}

// x, y = sprite top-left in ship-local pixels. box = highlight/hit area.
const deck = (x) => ({ x, y: 43, box: { x: x - 2, y: 40, w: 10, h: 14 } });
export const SLOTS = {
  captain: {
    x: 8,
    y: 35,
    box: { x: 6, y: 33, w: 11, h: 14 },
    o: { hat: 'tricorn', hatC: C.black, coat: C.ink, skin: '#E8B58B', beard: '#E7E2D3' },
  },
  firstmate: {
    x: 24,
    y: 35,
    box: { x: 22, y: 33, w: 10, h: 14 },
    o: { hat: 'cap', hatC: C.black, coat: '#2E7D7A', skin: '#C98C62' },
  },
  navigator: {
    x: 53,
    y: 13,
    box: { x: 51, y: 9, w: 19, h: 16 },
    o: { hat: 'knit', hatC: '#79E6C4', trim: C.coral, coat: '#243447', skin: '#8F5B3A', item: 'spyglass', armUp: true },
  },
  rigger: {
    x: 94,
    y: 11,
    box: { x: 92, y: 9, w: 17, h: 15 },
    o: { hat: 'bandana', hatC: '#79E6C4', coat: '#F1EEE0', trim: C.coral, skin: '#F1C9A5', item: 'rope' },
  },
  deckhand: {
    ...deck(37),
    o: { hat: 'cap', hatC: C.woodDk, coat: '#4B7A3A', skin: '#6B4128', item: 'book' },
  },
  bosun: {
    ...deck(48),
    o: { hat: 'bandana', hatC: '#B53A1C', coat: '#D9CFA8', skin: '#E8B58B', item: 'whistle', armUp: true },
  },
  sailmaker: {
    ...deck(59),
    o: { hat: 'beret', hatC: C.coral, coat: '#F1EEE0', trim: '#79E6C4', skin: '#F1C9A5', item: 'brush' },
  },
  scribe: {
    ...deck(72),
    o: { hat: 'cap', hatC: '#5A3320', coat: '#7A5AA6', skin: '#C98C62', item: 'scroll' },
  },
  gunner: {
    ...deck(86),
    o: { hat: 'cap', hatC: C.black, coat: '#5B6770', skin: '#C98C62', item: 'fuse' },
  },
  cook: {
    ...deck(97),
    o: { hat: 'chef', coat: C.white, trim: C.coral, skin: '#8F5B3A', item: 'ladle' },
  },
};

export function buildAvatar(slot) {
  const g = new Grid(9, 14);
  drawSailor(g, 1, 3, { ...SLOTS[slot].o, item: undefined, armUp: false });
  return g.runs();
}

/* ------------------------------ the scene ------------------------------ */

export function buildScene() {
  const rnd = mulberry32(2026);

  const crew = {};
  for (const [slot, s] of Object.entries(SLOTS)) {
    const g = new Grid(SHIP_W, SHIP_H);
    drawSailor(g, s.x, s.y, s.o);
    crew[slot] = { runs: g.runs(), box: s.box };
  }

  const stars = [];
  for (let i = 0; i < 26; i++) stars.push({ x: Math.floor(rnd() * SCENE_W), y: Math.floor(rnd() * 26), d: rnd() * 4 });

  return {
    sky: buildSky().runs(),
    stars,
    sun: buildSun().runs(),
    clouds: [
      { runs: buildCloud(3, 34, 9).runs(), y: 14, dur: 140, delay: -30 },
      { runs: buildCloud(9, 24, 7).runs(), y: 30, dur: 190, delay: -120 },
      { runs: buildCloud(5, 40, 10).runs(), y: 44, dur: 240, delay: -70 },
    ],
    seaBack: buildSeaBack().runs(),
    waves: {
      a: buildWave({ amp: 1, period: 48, color: C.sea2, phase: 0.6, rows: 34 }).runs(),
      b: buildWave({ amp: 1, period: 64, color: C.sea3, phase: 2.1, rows: 30 }).runs(),
      c: buildWave({ amp: 1, period: 32, color: C.sea1, foam: C.foam, phase: 0, rows: 30 }).runs(),
      d: buildWave({ amp: 2, period: 96, color: C.sea4, phase: 1.3, rows: 20 }).runs(),
    },
    ship: {
      back: buildShipBack().runs(),
      front: buildShipFront().runs(),
      pennant: [pennant(0).runs(), pennant(1).runs()],
      steam: [steam(0).runs(), steam(1).runs(), steam(2).runs()],
    },
    crew,
  };
}

/* ------------------------------- the goat ------------------------------- */

export const GOAT_W = 24;
export const GOAT_H = 20;

export function buildGoat() {
  const W = '#F3EFE4';
  const S = '#CFC8B2';
  const D = '#A9A28D';
  const K = '#101820';
  const H = '#C9A24A';
  const Hd = '#8A6A22';
  const nose = '#E8A0A8';

  // each leg: x, far side?, lift (0 = planted), shift
  const frame = (legs) => {
    const g = new Grid(GOAT_W, GOAT_H);

    // legs first, so the body overlaps their tops
    legs.forEach(({ x, far, h }) => {
      g.rect(x, 15, 2, h, far ? D : S);
      g.rect(x, 15 + h, 2, 1, K);
    });

    // body, belly, tail
    g.rect(3, 9, 13, 6, W);
    g.rect(3, 14, 13, 1, S);
    for (let x = 5; x < 14; x += 3) {
      g.set(x, 11, S);
      g.set(x + 1, 12, S);
    }
    g.set(2, 9, W);
    g.set(2, 8, W);
    g.set(1, 8, W);

    // neck and head
    g.rect(14, 8, 4, 3, W);
    g.rect(16, 4, 6, 5, W);
    g.rect(21, 6, 3, 3, '#F6E3D6');
    g.set(23, 7, K);
    g.set(23, 8, nose);
    g.set(19, 5, K);

    // ear, horns, beard
    g.rect(15, 5, 2, 1, S);
    g.set(14, 6, S);
    g.set(18, 3, H);
    g.set(17, 2, H);
    g.set(16, 1, H);
    g.set(15, 1, Hd);
    g.set(14, 2, Hd);
    g.set(20, 3, Hd);
    g.rect(21, 9, 2, 1, W);
    g.rect(21, 10, 1, 2, S);
    return g.runs();
  };

  const idle = [
    { x: 4, far: false, h: 3 },
    { x: 7, far: true, h: 3 },
    { x: 11, far: false, h: 3 },
    { x: 14, far: true, h: 3 },
  ];
  const a = [
    { x: 3, far: false, h: 2 },
    { x: 8, far: true, h: 3 },
    { x: 12, far: false, h: 3 },
    { x: 13, far: true, h: 2 },
  ];
  const b = [
    { x: 5, far: false, h: 3 },
    { x: 6, far: true, h: 2 },
    { x: 10, far: false, h: 2 },
    { x: 15, far: true, h: 3 },
  ];
  return { idle: frame(idle), a: frame(a), b: frame(b) };
}

/* ------------------------------ dust puff ------------------------------ */

export const PUFF_W = 24;
export const PUFF_H = 16;

export function buildPuff() {
  const g = new Grid(PUFF_W, PUFF_H);
  const blobs = [
    [5, 10, 5],
    [11, 7, 6],
    [18, 10, 5],
    [12, 11, 5],
  ];
  for (let y = 0; y < PUFF_H; y++) {
    for (let x = 0; x < PUFF_W; x++) {
      const hit = blobs.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r);
      if (!hit) continue;
      g.set(x, y, y >= 12 ? '#BFCFD2' : y >= 9 && (x + y) % 3 === 0 ? '#DCE7E8' : '#F6F8F4');
    }
  }
  return g.runs();
}
