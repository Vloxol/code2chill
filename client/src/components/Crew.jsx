import { memo, useMemo, useState } from 'react';
import { buildScene, buildAvatar, SCENE_W, SCENE_H, HORIZON, SHIP_X, SHIP_Y, SLOTS } from '../lib/pixel.js';

const Runs = memo(function Runs({ runs }) {
  return (
    <g shapeRendering="crispEdges">
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w + 0.04} height="1.04" fill={r.c} />
      ))}
    </g>
  );
});

function Wave({ runs, y, cls }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <g className={`wave ${cls}`}>
        <Runs runs={runs} />
        <g transform={`translate(${SCENE_W} 0)`}>
          <Runs runs={runs} />
        </g>
      </g>
    </g>
  );
}

function Avatar({ slot }) {
  const runs = useMemo(() => buildAvatar(slot), [slot]);
  return (
    <svg className="avatar" viewBox="0 0 9 14" shapeRendering="crispEdges" aria-hidden="true">
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w + 0.04} height="1.04" fill={r.c} />
      ))}
    </svg>
  );
}

export default function Crew({ crew }) {
  const S = useMemo(() => buildScene(), []);
  const [active, setActive] = useState('captain');
  const known = crew.filter((c) => S.crew[c.slot]);
  const current = known.find((c) => c.slot === active) || known[0];

  const activate = (slot) => () => setActive(slot);
  const onKey = (slot) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActive(slot);
    }
  };

  const ab = current ? S.crew[current.slot].box : null;
  const tagW = current ? Math.max(current.name.length * 2.7, current.title.length * 2.1) + 5 : 0;

  return (
    <section id="crew" className="crew" data-cursor="spy" aria-labelledby="crew-title">
      <div className="crew__head">
        <h2 id="crew-title" className="crew__title">
          Meet the crew.
        </h2>
        <p className="crew__note">Every sailor is a member of the club. Click one to see who they are.</p>
      </div>

      <div className="scene">
        <svg
          className="scene__svg"
          viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
          preserveAspectRatio="xMidYMid slice"
          role="group"
          aria-label="A pixel-art ship with the Code2Chill crew aboard"
        >
          <Runs runs={S.sky} />
          <g shapeRendering="crispEdges" className="stars">
            {S.stars.map((s, i) => (
              <rect key={i} x={s.x} y={s.y} width="1" height="1" fill="#BFDDE0" style={{ animationDelay: `${s.d}s` }} />
            ))}
          </g>
          <g transform="translate(5 51)">
            <Runs runs={S.sun} />
          </g>
          {S.clouds.map((c, i) => (
            <g key={i} transform={`translate(0 ${c.y})`}>
              <g className="cloud" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
                <Runs runs={c.runs} />
              </g>
            </g>
          ))}

          <g transform={`translate(0 ${HORIZON})`}>
            <Runs runs={S.seaBack} />
          </g>
          <Wave runs={S.waves.a} y={HORIZON} cls="wave--a" />
          <Wave runs={S.waves.b} y={HORIZON + 6} cls="wave--b" />

          <g transform={`translate(${SHIP_X} ${SHIP_Y})`}>
            <g className="ship">
              <Runs runs={S.ship.back} />

              {known.map((c) => {
                const crewSlot = S.crew[c.slot];
                return (
                  <g key={c.slot} className={`sailor${active === c.slot ? ' is-active' : ''}`}>
                    <Runs runs={crewSlot.runs} />
                  </g>
                );
              })}

              <Runs runs={S.ship.front} />
              <g className="pennant">
                <g className="pennant__a">
                  <Runs runs={S.ship.pennant[0]} />
                </g>
                <g className="pennant__b">
                  <Runs runs={S.ship.pennant[1]} />
                </g>
              </g>
              <g className="steam">
                {S.ship.steam.map((runs, i) => (
                  <g key={i} className={`steam__${i}`}>
                    <Runs runs={runs} />
                  </g>
                ))}
              </g>

              {/* selection brackets + name tag for the active sailor */}
              {ab && (
                <g className="pick">
                  <path
                    d={`M${ab.x} ${ab.y + 3}V${ab.y}H${ab.x + 3} M${ab.x + ab.w - 3} ${ab.y}H${ab.x + ab.w}V${ab.y + 3} M${ab.x} ${ab.y + ab.h - 3}V${ab.y + ab.h}H${ab.x + 3} M${ab.x + ab.w - 3} ${ab.y + ab.h}H${ab.x + ab.w}V${ab.y + ab.h - 3}`}
                    fill="none"
                    stroke="#EDB52E"
                    strokeWidth="1"
                    shapeRendering="crispEdges"
                  />
                  <g transform={`translate(${Math.min(ab.x, SCENE_W - SHIP_X - tagW - 3)} ${ab.y - 13})`}>
                    <rect width={tagW} height="11" fill="#101820" stroke="#EDB52E" strokeWidth=".8" />
                    <text x="2.5" y="5" fontSize="4.2" fontWeight="700" fill="#F6F8F4" style={{ fontFamily: 'var(--f-mono)' }}>
                      {current.name}
                    </text>
                    <text x="2.5" y="9" fontSize="3.4" fill="#79E6C4" style={{ fontFamily: 'var(--f-pixel)' }}>
                      {current.title}
                    </text>
                  </g>
                </g>
              )}

              {/* hit areas */}
              {known.map((c) => {
                const b = S.crew[c.slot].box;
                return (
                  <rect
                    key={c.slot}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill="transparent"
                    className="hit"
                    tabIndex={0}
                    role="button"
                    aria-label={`${c.name}, ${c.title}`}
                    aria-pressed={active === c.slot}
                    data-lock
                    data-cursor-label={c.name}
                    onPointerEnter={activate(c.slot)}
                    onFocus={activate(c.slot)}
                    onClick={activate(c.slot)}
                    onKeyDown={onKey(c.slot)}
                  />
                );
              })}
            </g>
          </g>

          <Wave runs={S.waves.c} y={HORIZON + 3} cls="wave--c" />
          <Wave runs={S.waves.d} y={HORIZON + 14} cls="wave--d" />
        </svg>
      </div>

      <div className="manifest">
        {current && (
          <div className="manifest__card" aria-live="polite">
            <Avatar slot={current.slot} />
            <div>
              <h3 className="manifest__role">{current.name}</h3>
              <p className="manifest__title">{current.title}</p>
              <p className="manifest__duty">{current.duty}</p>
            </div>
          </div>
        )}
        <ul className="manifest__list" aria-label="Crew roles">
          {known.map((c) => (
            <li key={c.slot}>
              <button
                type="button"
                className={active === c.slot ? 'is-on' : ''}
                onClick={activate(c.slot)}
                onPointerEnter={activate(c.slot)}
                aria-pressed={active === c.slot}
                data-cursor-label={c.title}
              >
                <Avatar slot={c.slot} />
                <span className="who">
                  <b>{c.name}</b>
                  <i>{c.title}</i>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { SLOTS };
