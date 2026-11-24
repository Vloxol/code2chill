import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { buildGoat, buildPuff, GOAT_W, GOAT_H, PUFF_W, PUFF_H } from '../lib/pixel.js';

const SIZE = 96; // rendered width in px
const CARD_W = 210;
const KEY = 'c2c-goat-clicked';
const rand = (a, b) => a + Math.random() * (b - a);

// Once the goat has been clicked it stays gone for the rest of the session (this tab).
const wasClicked = () => {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
const markClicked = () => {
  try {
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    /* storage blocked: it just comes back after a reload */
  }
};

const Frame = memo(function Frame({ runs, cls }) {
  return (
    <svg className={`gf ${cls}`} viewBox={`0 0 ${GOAT_W} ${GOAT_H}`} shapeRendering="crispEdges" aria-hidden="true">
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w + 0.04} height="1.04" fill={r.c} />
      ))}
    </svg>
  );
});

/*
 * Easter egg. A small pixel goat turns up at a random moment and a random spot, and stands there.
 * Click it: a cloud of dust, the goat dashes off screen, and a card with its details stays behind for a
 * few seconds. After that it does not come back until the tab is closed.
 * If nobody clicks, it wanders off by itself after a while and returns later somewhere else.
 *
 * phases: gone -> idle -> leave -> gone        (wandering off)
 *                    \-> dash  -> gone         (clicked)
 */
export default function Goat() {
  const frames = useMemo(buildGoat, []);
  const puffRuns = useMemo(buildPuff, []);
  const [phase, setPhase] = useState('gone');
  const [card, setCard] = useState(null); // { left, notch }
  const [puff, setPuff] = useState(null); // { x, k }
  const el = useRef(null);
  const retired = useRef(wasClicked());
  const firstSpawn = useRef(true);
  const timers = useRef({});
  const reduce = useRef(false);
  const s = useRef({ x: 0, tx: 0, dir: 1 });

  const armLeave = (ms) => {
    clearTimeout(timers.current.leave);
    timers.current.leave = setTimeout(() => {
      if (reduce.current) {
        setPhase('gone');
        return;
      }
      s.current.tx = s.current.x < window.innerWidth / 2 ? -SIZE - 24 : window.innerWidth + 24;
      setPhase('leave');
    }, ms);
  };

  // spawn after a random wait, every time the goat is gone (never again once it has been clicked)
  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (phase !== 'gone' || retired.current) return undefined;
    const wait = firstSpawn.current ? rand(5000, 14000) : rand(25000, 60000);
    timers.current.spawn = setTimeout(() => {
      firstSpawn.current = false;
      const st = s.current;
      st.x = rand(24, Math.max(25, window.innerWidth - SIZE - 24));
      st.dir = Math.random() < 0.5 ? 1 : -1;
      setPhase('idle');
      armLeave(22000);
    }, wait);
    return () => clearTimeout(timers.current.spawn);
  }, [phase]);

  // walking off screen, slowly when it wanders away and flat out when it has been clicked
  useEffect(() => {
    if (phase !== 'leave' && phase !== 'dash') return undefined;
    const e = el.current;
    if (!e) return undefined;
    const st = s.current;
    const dash = phase === 'dash';
    let raf = 0;
    let last = performance.now();

    e.dataset.moving = '1';
    e.dataset.dash = dash ? '1' : '0';
    e.dataset.dir = String(st.dir);

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!e.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dx = st.tx - st.x;
      const speed = dash ? 1250 : 120;
      if (Math.abs(dx) <= speed * dt) {
        st.x = st.tx;
        setPhase('gone');
        return;
      }
      st.dir = Math.sign(dx);
      st.x += st.dir * speed * dt;
      e.style.transform = `translate3d(${st.x.toFixed(1)}px,0,0)`;
      e.dataset.dir = String(st.dir);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.spawn);
      clearTimeout(t.leave);
      clearTimeout(t.card);
      clearTimeout(t.puff);
    };
  }, []);

  const onClick = () => {
    if (phase === 'dash') return;
    const st = s.current;
    const vw = window.innerWidth;
    const centre = st.x + SIZE / 2;

    markClicked();
    retired.current = true;
    clearTimeout(timers.current.leave);

    // the cloud goes off where the goat was standing
    const k = Date.now();
    setPuff({ x: centre, k });
    clearTimeout(timers.current.puff);
    timers.current.puff = setTimeout(() => setPuff(null), 900);

    // the card stays behind at that spot after the goat has gone
    const left = Math.min(Math.max(centre - CARD_W / 2, 8), Math.max(8, vw - CARD_W - 8));
    setCard({ left, notch: Math.min(Math.max(centre - left - 5, 14), CARD_W - 24), k });
    clearTimeout(timers.current.card);
    timers.current.card = setTimeout(() => setCard(null), 6500);

    if (reduce.current) {
      setPhase('gone');
      return;
    }
    // dash for the nearer edge
    st.dir = centre < vw / 2 ? -1 : 1;
    st.tx = st.dir === -1 ? -SIZE - 40 : vw + 40;
    setPhase('dash');
  };

  const st = s.current;
  return (
    <>
      {puff && (
        <div className="goat__puff" key={puff.k} style={{ left: puff.x }} aria-hidden="true">
          {['p1', 'p2', 'p3'].map((c) => (
            <svg key={c} className={`puff ${c}`} viewBox={`0 0 ${PUFF_W} ${PUFF_H}`} shapeRendering="crispEdges">
              {puffRuns.map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w + 0.04} height="1.04" fill={r.c} />
              ))}
            </svg>
          ))}
        </div>
      )}

      {card && (
        <div className="goat__card" key={card.k} role="status" style={{ left: card.left, '--notch': `${card.notch}px` }}>
          <p className="goat__title">Absolute GOAT</p>
          <p className="goat__name">Kaustubh Parashar</p>
          <p className="goat__branch">Branch: CSE</p>
        </div>
      )}

      {phase !== 'gone' && (
        <div
          className="goat"
          ref={el}
          style={{ transform: `translate3d(${st.x.toFixed(1)}px,0,0)` }}
          data-dir={String(st.dir)}
          data-moving="0"
          data-dash="0"
        >
          <button
            type="button"
            className="goat__btn"
            onClick={onClick}
            aria-label="A small pixel goat. Press it to see who it is."
            data-cursor-label="bah"
          >
            <span className="goat__shadow" aria-hidden="true" />
            <span className="goat__flip">
              <span className="goat__lines" aria-hidden="true" />
              <span className="goat__bob">
                <Frame runs={frames.idle} cls="gf--idle" />
                <Frame runs={frames.a} cls="gf--a" />
                <Frame runs={frames.b} cls="gf--b" />
              </span>
            </span>
          </button>
        </div>
      )}
    </>
  );
}
