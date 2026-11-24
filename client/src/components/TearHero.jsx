import { useEffect, useRef } from 'react';
import ChartBackdrop from './ChartBackdrop.jsx';
import { mulberry32 } from '../lib/rng.js';
import { CODE_LINES, TOKEN_COLORS, tokenize } from '../lib/codeLines.js';

/*
 * The rip.
 * A stroke is a ribbon of points. Each point has its own clock:
 *   opens   the gap widens from a sharp tip to full width (OPEN ms), so the rip appears to race along
 *   holds   the code shows through
 *   closes  coral stitches cross the gap, then it narrows shut, oldest end first (HEAL ms)
 * A click sends rips outward from the point, one after another.
 */
const SP = 8; // px between points along a stroke
const OPEN = 340;
const HEAL = 600;
const MAX_PTS = 320;
const TAU = Math.PI * 2;
const THREAD = '#E4572E';

export default function TearHero() {
  const wrap = useRef(null);
  const canvas = useRef(null);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LIFE = reduce ? 1000 : 1500;
    const HS = LIFE - HEAL; // when closing starts

    // Offscreen canvases: the code layer, and a scratch layer that masks it to the rip.
    const code = document.createElement('canvas');
    const cctx = code.getContext('2d');
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d');

    const rnd = mulberry32(7);
    const strokes = [];
    let cur = null;
    let W = 1;
    let H = 1;
    let dpr = 1;
    let blockH = 1;
    let raf = 0;
    let lx = 0;
    let ly = 0;
    let lt = 0;
    let touched = false;
    let demo = null;
    const t0 = performance.now();

    /* ---------------------------- code layer ---------------------------- */

    const paintCode = () => {
      const fs = W < 700 ? 13 : 15;
      const lh = Math.round(fs * 1.65);
      const colW = W < 700 ? W : 640;
      const cols = Math.max(1, Math.ceil(W / colW));
      const N = CODE_LINES.length;
      blockH = Math.max(N * lh, 1);
      code.width = Math.round(W * dpr);
      code.height = Math.round((H + blockH) * dpr);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.fillStyle = '#06171F';
      cctx.fillRect(0, 0, W, H + blockH);
      cctx.font = `${fs}px "JetBrains Mono Variable", ui-monospace, Menlo, monospace`;
      cctx.textBaseline = 'alphabetic';
      const cw = cctx.measureText('M').width;
      const rows = Math.ceil((H + blockH) / lh) + 1;
      for (let c = 0; c < cols; c++) {
        const x0 = c * colW + 26;
        const off = c * 17;
        for (let r = 0; r < rows; r++) {
          const li = (r + off) % N;
          const y = (r + 1) * lh - 6;
          cctx.fillStyle = '#2C4756';
          cctx.fillText(String(li + 1).padStart(2, ' '), x0, y);
          let x = x0 + cw * 4;
          for (const tk of tokenize(CODE_LINES[li])) {
            cctx.fillStyle = TOKEN_COLORS[tk.t];
            cctx.fillText(tk.s, x, y);
            x += cw * tk.s.length;
          }
        }
      }
    };

    const size = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      for (const c of [cv, tmp]) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      paintCode();
    };

    /* ----------------------------- the rips ----------------------------- */

    const countPts = () => strokes.reduce((n, s) => n + s.pts.length, 0);

    // Each edge wanders (so it reads as torn fibre, not a saw blade) with the odd sharp spike.
    const edge = (prev) => {
      let v = prev * 0.7 + (0.62 + rnd() * 0.8) * 0.3;
      if (rnd() < 0.1) v += 0.45;
      return Math.min(1.5, Math.max(0.6, v));
    };
    const addPt = (st, x, y, t, R) => {
      st.jl = edge(st.jl ?? 1);
      st.jr = edge(st.jr ?? 1);
      st.pts.push({ x, y, t, R, jl: st.jl, jr: st.jr });
    };

    const trim = () => {
      let over = countPts() - MAX_PTS;
      while (over > 0 && strokes.length) {
        const s = strokes[0];
        const cut = Math.min(over, s.pts.length);
        s.pts.splice(0, cut);
        over -= cut;
        if (!s.pts.length) strokes.shift();
      }
    };

    const stroke = (x, y) => {
      const now = performance.now();
      if (!cur) {
        cur = { pts: [], dx: 1, dy: 0 };
        strokes.push(cur);
        addPt(cur, x, y, now, 9);
        lx = x;
        ly = y;
        lt = now;
        return;
      }
      const dx = x - lx;
      const dy = y - ly;
      const d = Math.hypot(dx, dy);
      if (d < SP) return;
      const speed = d / Math.max(1, now - lt);
      const n = Math.floor(d / SP);
      const nx = -dy / d;
      const ny = dx / d;
      for (let i = 1; i <= n; i++) {
        const f = i / n;
        const j = (rnd() - 0.5) * 3;
        // points are stamped slightly into the future so the rip opens in sequence, like it is racing along
        addPt(
          cur,
          lx + dx * f + nx * j,
          ly + dy * f + ny * j,
          now + (i - 1) * 5,
          6 + Math.min(speed * 7, 7) + rnd() * 3,
        );
      }
      cur.dx = dx / d;
      cur.dy = dy / d;
      lx = x;
      ly = y;
      lt = now;
      trim();
    };

    // A click: rips shoot outward from the point, each opening a beat after the last.
    const burst = (x, y) => {
      const now = performance.now();
      const n = 5 + Math.floor(rnd() * 2);
      const base = rnd() * TAU;
      for (let k = 0; k < n; k++) {
        const a = base + (k * TAU) / n + (rnd() - 0.5) * 0.6;
        const len = 64 + rnd() * 76;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const st = { pts: [], dx: ca, dy: sa, burst: true };
        for (let s = 0; s <= len; s += SP) {
          const j = (rnd() - 0.5) * 3;
          addPt(st, x + ca * s - sa * j, y + sa * s + ca * j, now + s * 2.4, 2.6 + 6 * (1 - s / len) + rnd() * 1.6);
        }
        strokes.push(st);
      }
      trim();
    };

    /* ----------------------------- rendering ---------------------------- */

    const halfWidth = (p, now) => {
      const age = now - p.t;
      if (age <= 0 || age >= LIFE) return 0;
      const open = 1 - Math.pow(1 - Math.min(1, age / (reduce ? 120 : OPEN)), 3);
      const close = age > HS ? Math.max(0, 1 - Math.pow((age - HS) / HEAL, 2)) : 1;
      return p.R * open * close;
    };

    const geometry = (st, now) => {
      const P = st.pts;
      const n = P.length;
      const g = new Array(n);
      for (let i = 0; i < n; i++) {
        const a = P[Math.max(0, i - 1)];
        const b = P[Math.min(n - 1, i + 1)];
        let tx = b.x - a.x;
        let ty = b.y - a.y;
        const m = Math.hypot(tx, ty) || 1;
        tx /= m;
        ty /= m;
        g[i] = { h: halfWidth(P[i], now), nx: -ty, ny: tx };
      }
      return g;
    };

    // Trace the ribbon outline. eL/eR widen the left and right edge, used for the paper rim.
    const trace = (c, st, g, eL, eR, ox = 0, oy = 0) => {
      const P = st.pts;
      const n = P.length;
      if (n < 2) return false;
      const left = [];
      const right = [];
      let any = false;
      for (let i = 0; i < n; i++) {
        const { h, nx, ny } = g[i];
        const open = h > 0.4;
        if (open) any = true;
        const k = Math.min(1, h / 5);
        const wl = open ? h * P[i].jl + eL * k : 0;
        const wr = open ? h * P[i].jr + eR * k : 0;
        left.push([P[i].x + nx * wl + ox, P[i].y + ny * wl + oy]);
        right.push([P[i].x - nx * wr + ox, P[i].y - ny * wr + oy]);
      }
      if (!any) return false;
      c.beginPath();
      c.moveTo(left[0][0], left[0][1]);
      for (let i = 1; i < n; i++) c.lineTo(left[i][0], left[i][1]);
      for (let i = n - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
      c.closePath();
      return true;
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);

      // First visit: a scripted stroke shows what this page does, then hands over.
      if (!demo && !touched && !reduce && now - t0 > 1500 && now - t0 < 1600) demo = { start: now };
      if (demo) {
        const u = (now - demo.start) / 2600;
        if (u >= 1) {
          demo = null;
          cur = null;
        } else {
          const e = u * u * (3 - 2 * u);
          stroke((0.08 + 0.78 * e) * W, H * (0.6 + 0.12 * Math.sin(e * 6.2) - 0.05 * e));
        }
      }

      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        while (s.pts.length && now - s.pts[0].t >= LIFE) s.pts.shift();
        if (!s.pts.length) {
          if (s === cur) cur = null;
          strokes.splice(i, 1);
        }
      }
      if (window.scrollY > H * 1.05) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (!strokes.length) return;

      const geo = strokes.map((s) => geometry(s, now));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineJoin = 'round';

      // 1. shadow under the torn paper
      ctx.fillStyle = 'rgba(8,24,46,0.28)';
      strokes.forEach((s, i) => {
        if (trace(ctx, s, geo[i], 11, 9, 3, 6)) ctx.fill();
      });
      // 2. the paper's torn rim, lighter on the right
      ctx.fillStyle = '#F7FAF8';
      strokes.forEach((s, i) => {
        if (trace(ctx, s, geo[i], 7, 5)) ctx.fill();
      });
      // 3. the curled lip, in shade on the left edge
      ctx.fillStyle = '#B5C6BF';
      strokes.forEach((s, i) => {
        if (trace(ctx, s, geo[i], 3.6, 1.2)) ctx.fill();
      });

      // 4. the hole: the rip as a mask, with the code layer drawn through it
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, W, H);
      tctx.fillStyle = '#000';
      strokes.forEach((s, i) => {
        if (trace(tctx, s, geo[i], 0, 0)) tctx.fill();
      });
      tctx.globalCompositeOperation = 'source-in';
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      const off = reduce ? 0 : ((now - t0) * 0.022) % blockH;
      tctx.drawImage(code, 0, Math.round(off * dpr), code.width, Math.round(H * dpr), 0, 0, tmp.width, tmp.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(tmp, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 5. coral stitches pull the rip shut
      ctx.strokeStyle = THREAD;
      ctx.fillStyle = THREAD;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      strokes.forEach((s, si) => {
        const g = geo[si];
        s.pts.forEach((p, i) => {
          if (i % 2) return;
          const age = now - p.t;
          if (age < HS - 140 || g[i].h < 2.5) return;
          const k = Math.min(1, (age - (HS - 140)) / 140);
          const reach = (g[i].h + 4) * k;
          ctx.beginPath();
          ctx.moveTo(p.x + g[i].nx * reach, p.y + g[i].ny * reach);
          ctx.lineTo(p.x - g[i].nx * reach, p.y - g[i].ny * reach);
          ctx.stroke();
        });
      });

      // 6. a hairline crack runs ahead of the rip's head
      ctx.strokeStyle = 'rgba(18,48,107,0.6)';
      ctx.lineWidth = 1.4;
      strokes.forEach((s) => {
        const P = s.pts;
        let j = P.length - 1;
        while (j >= 0 && now - P[j].t < 0) j--;
        if (j < 0) return;
        const age = now - P[j].t;
        if (age > 260 || (s !== cur && j === P.length - 1)) return;
        const reach = 30 * (1 - age / 260);
        ctx.beginPath();
        ctx.moveTo(P[j].x, P[j].y);
        for (let k = 1; k <= 4; k++) {
          const f = (k / 4) * reach;
          const wob = Math.sin(k * 2.3 + P[j].t) * 3.2;
          ctx.lineTo(P[j].x + s.dx * f - s.dy * wob, P[j].y + s.dy * f + s.dx * wob);
        }
        ctx.stroke();
      });
    };

    /* ------------------------------ input ------------------------------- */

    const inHero = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (window.scrollY > H * 0.9 || x < 0 || y < 0 || x > r.width || y > r.height) return null;
      return { x, y };
    };
    const onMove = (e) => {
      const pt = inHero(e);
      if (!pt) {
        cur = null;
        return;
      }
      if (!touched) {
        touched = true;
        demo = null;
        el.classList.add('is-touched');
      }
      stroke(pt.x, pt.y);
    };
    const onDown = (e) => {
      const pt = inHero(e);
      if (pt) burst(pt.x, pt.y);
    };
    const onLeave = () => {
      cur = null;
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    if (document.fonts?.ready) document.fonts.ready.then(paintCode);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section id="surface" className="hero" ref={wrap} data-cursor="tear" aria-label="Code2Chill">
      <ChartBackdrop />
      <div className="hero__copy">
        <h1 className="hero__title">
          <span>Calm on the surface.</span>
          <span>Code underneath.</span>
        </h1>
        <p className="hero__lede">
          Code2Chill is a student-led technical club at Chitkara University for people who build with code and know when to
          chill.
        </p>
      </div>
      <p className="hero__hint">
        <span className="hint--fine">Move across the page to rip it. Click to burst it open.</span>
        <span className="hint--touch">Drag a finger across the page. Tap to burst it open.</span>
      </p>
      <canvas ref={canvas} className="hero__tear" aria-hidden="true" />
    </section>
  );
}
