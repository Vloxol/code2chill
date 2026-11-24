import { useEffect, useRef } from 'react';

const THREAD_N = 16; // links in the thread
const THREAD_LEN = 6.5; // px between links
const EYE = 33; // px from the needle tip to its eye

/*
 * One cursor, six personalities. Any ancestor with data-cursor="<mode>" decides which one:
 *   tear   landing page   a sailmaker's needle that turns to face your movement, trailing coral thread
 *   lens   charter        x-ray lens over the copy
 *   helm   ports          ship's wheel that spins as you steer
 *   spy    crew           pixel spyglass reticle that locks onto sailors
 *   crate  cargo          crate that opens
 *   anchor dock           anchor that drops on click
 * Elements can add data-cursor-label="text" (shows a tag) or data-lock (reticle snaps to them).
 */
export default function Cursor() {
  const root = useRef(null);
  const dot = useRef(null);
  const body = useRef(null);
  const label = useRef(null);
  const thread = useRef(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = root.current;

    let x = -200;
    let y = -200;
    let bx = x;
    let by = y;
    let ax = 0; // accumulated pointer movement, decays each frame
    let ay = 0;
    let rot = 0;
    let heading = (-135 * Math.PI) / 180; // needle points up-left until you move
    let mode = 'ring';
    let lock = null;
    let shown = false;
    let raf = 0;
    const pts = Array.from({ length: THREAD_N }, () => ({ x: -200, y: -200 }));

    const resetThread = () => {
      const ex = x - Math.cos(heading) * EYE;
      const ey = y - Math.sin(heading) * EYE;
      pts.forEach((p) => {
        p.x = ex;
        p.y = ey;
      });
    };

    const setMode = (m) => {
      if (m === mode) return;
      mode = m;
      el.dataset.mode = m;
      if (m === 'tear') resetThread();
    };

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      ax += e.movementX || 0;
      ay += e.movementY || 0;
      if (!shown) {
        shown = true;
        bx = x;
        by = y;
        el.dataset.on = '1';
        document.documentElement.classList.add('has-cursor');
      }
      const t = e.target instanceof Element ? e.target : null;
      setMode(t?.closest('[data-cursor]')?.dataset.cursor || 'ring');
      el.dataset.hover = t?.closest('a,button,input,textarea,select,[data-cursor-hover],[role="button"]') ? '1' : '0';

      const text = t?.closest('[data-cursor-label]')?.dataset.cursorLabel || '';
      if (label.current.textContent !== text) label.current.textContent = text;
      el.dataset.label = text ? '1' : '0';

      const lockEl = mode === 'spy' ? t?.closest('[data-lock]') : null;
      if (lockEl) {
        const r = lockEl.getBoundingClientRect();
        lock = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        el.style.setProperty('--lw', `${r.width + 8}px`);
        el.style.setProperty('--lh', `${r.height + 8}px`);
        el.dataset.lock = '1';
      } else {
        lock = null;
        el.dataset.lock = '0';
      }
    };
    const onDown = (e) => {
      el.dataset.down = '1';
      const r = document.createElement('span');
      r.className = 'cursor__ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    };
    const onUp = () => {
      el.dataset.down = '0';
    };
    const onLeave = () => {
      el.dataset.on = '0';
    };
    const onEnter = () => {
      if (shown) el.dataset.on = '1';
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      let tx = x;
      let ty = y;
      if (mode === 'spy') {
        if (lock) {
          tx = lock.x;
          ty = lock.y;
        } else {
          tx = Math.round(x / 6) * 6; // the pixel reticle snaps to a 6px grid
          ty = Math.round(y / 6) * 6;
        }
      }
      // the needle's tip sits exactly on the pointer, so a rip starts where you point
      const k = reduce || mode === 'tear' ? 1 : mode === 'lens' ? 0.2 : mode === 'spy' ? 0.35 : 0.24;
      bx += (tx - bx) * k;
      by += (ty - by) * k;

      if (mode === 'helm') {
        rot += ax * 0.9;
      } else if (mode === 'tear') {
        // turn the needle to face the way you are moving
        if (Math.hypot(ax, ay) > 1.2) {
          let d = Math.atan2(ay, ax) - heading;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          heading += d * 0.22;
        }
        // thread: each link is pulled toward the one before it, and sags a little
        pts[0].x = x - Math.cos(heading) * EYE;
        pts[0].y = y - Math.sin(heading) * EYE;
        for (let i = 1; i < THREAD_N; i++) {
          const p = pts[i];
          const q = pts[i - 1];
          p.y += 0.35;
          let dx = p.x - q.x;
          let dy = p.y - q.y;
          const d = Math.hypot(dx, dy) || 1;
          dx /= d;
          dy /= d;
          p.x = q.x + dx * THREAD_LEN;
          p.y = q.y + dy * THREAD_LEN;
        }
        thread.current.setAttribute('d', `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}`);
        el.style.setProperty('--hd', `${((heading * 180) / Math.PI).toFixed(1)}deg`);
      }
      ax *= 0.7;
      ay *= 0.7;

      body.current.style.transform = `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0)`;
      dot.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      el.style.setProperty('--rot', `${rot.toFixed(1)}deg`);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerenter', onEnter);
    raf = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerenter', onEnter);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div className="cursor" ref={root} data-mode="ring" data-hover="0" data-down="0" data-label="0" data-lock="0" data-on="0" aria-hidden="true">
      <svg className="cursor__thread" width="100%" height="100%">
        <path ref={thread} d="" />
      </svg>
      <div className="cursor__dot" ref={dot} />
      <div className="cursor__body" ref={body}>
        <div className="shape shape--ring">
          <i />
        </div>

        <div className="shape shape--tear">
          <svg viewBox="-44 -44 88 88">
            <polygon className="needle" points="0,0 -8,-2.4 -30,-3.4 -34,-3.4 -34,3.4 -30,3.4 -8,2.4" />
            <line className="collar" x1="-10" y1="-2.2" x2="-10" y2="2.2" />
            <ellipse className="eye" cx="-29" cy="0" rx="2.8" ry="1.1" />
          </svg>
        </div>

        <div className="shape shape--lens">
          <i />
        </div>

        <div className="shape shape--helm">
          <svg viewBox="-30 -30 60 60">
            <circle r="14" />
            <circle r="4" className="fill" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <g key={a} transform={`rotate(${a})`}>
                <line x1="4" y1="0" x2="25" y2="0" />
                <circle cx="26" cy="0" r="2.4" className="fill" />
              </g>
            ))}
          </svg>
        </div>

        <div className="shape shape--spy">
          <i />
          <i />
          <i />
          <i />
          <b />
        </div>

        <div className="shape shape--crate">
          <svg viewBox="0 0 48 48">
            <rect x="5" y="5" width="38" height="38" />
            <line x1="5" y1="5" x2="43" y2="43" />
            <line x1="43" y1="5" x2="5" y2="43" />
            <rect x="9" y="9" width="3" height="3" className="fill" />
            <rect x="36" y="9" width="3" height="3" className="fill" />
            <rect x="9" y="36" width="3" height="3" className="fill" />
            <rect x="36" y="36" width="3" height="3" className="fill" />
          </svg>
        </div>

        <div className="shape shape--anchor">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="8" r="4" />
            <line x1="24" y1="12" x2="24" y2="41" />
            <line x1="16" y1="19" x2="32" y2="19" />
            <path d="M7 29c1 9 9 13 17 13s16-4 17-13" />
            <path d="M3 31l4-6 5 5M45 31l-4-6-5 5" />
          </svg>
        </div>

        <span className="cursor__label" ref={label} />
      </div>
    </div>
  );
}
