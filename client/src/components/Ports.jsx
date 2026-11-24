import { useEffect, useRef } from 'react';
import { Grid, C } from '../lib/pixel.js';

// A small pixel ship that sails along the route as you drag.
const MINI = (() => {
  const g = new Grid(16, 13);
  g.rect(7, 1, 1, 8, C.woodDk);
  g.rect(3, 2, 9, 5, C.sail);
  g.rect(9, 2, 3, 5, C.sailSh);
  g.rect(5, 4, 5, 1, C.ink);
  g.rect(8, 0, 4, 1, C.coral);
  g.rect(1, 9, 14, 2, C.wood);
  g.rect(2, 11, 12, 1, C.woodDk);
  g.rect(3, 9, 10, 1, C.woodLt);
  return g.runs();
})();

export default function Ports({ ports }) {
  const track = useRef(null);
  const ship = useRef(null);
  const drag = useRef(null);

  const sync = () => {
    const t = track.current;
    if (!t || !ship.current) return;
    const max = t.scrollWidth - t.clientWidth;
    const p = max > 0 ? t.scrollLeft / max : 0;
    ship.current.style.setProperty('--p', p.toFixed(4));
  };

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const down = (e) => {
    if (e.pointerType !== 'mouse') return; // touch scrolls natively
    drag.current = { x: e.clientX, left: track.current.scrollLeft };
    track.current.setPointerCapture(e.pointerId);
    track.current.classList.add('is-dragging');
  };
  const move = (e) => {
    if (!drag.current) return;
    track.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };
  const up = () => {
    drag.current = null;
    track.current?.classList.remove('is-dragging');
  };
  const key = (e) => {
    if (e.key === 'ArrowRight') track.current.scrollBy({ left: 340, behavior: 'smooth' });
    if (e.key === 'ArrowLeft') track.current.scrollBy({ left: -340, behavior: 'smooth' });
  };

  return (
    <section id="ports" className="sec sec--dark ports" data-cursor="helm" aria-labelledby="ports-title">
      <div className="ports__head">
        <h2 id="ports-title" className="ports__title">
          Four ports, one route.
        </h2>
        <p className="ports__note">Drag the chart to steer.</p>
      </div>

      <div
        className="ports__track"
        ref={track}
        onScroll={sync}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        tabIndex={0}
        role="region"
        aria-label="Ports along the route. Scroll sideways to see them all."
      >
        <div className="ports__inner">
          <div className="ports__ship" ref={ship} aria-hidden="true">
            <svg viewBox="0 0 16 13" shapeRendering="crispEdges">
              {MINI.map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w + 0.04} height="1.04" fill={r.c} />
              ))}
            </svg>
          </div>
          {ports.map((p, i) => (
            <article className="port" key={p.id}>
              <span className="port__pin" aria-hidden="true" />
              <p className="port__leg">Port {i + 1}</p>
              <h3 className="port__title">{p.title}</h3>
              <p className="port__blurb">{p.blurb}</p>
              <p className="port__detail">{p.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
