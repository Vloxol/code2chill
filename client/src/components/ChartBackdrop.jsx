import { memo, useMemo } from 'react';
import { mulberry32 } from '../lib/rng.js';

// A nautical chart: graticule, depth contours and soundings. Replaces the usual gradient wash.
function ChartBackdrop() {
  const chart = useMemo(() => {
    const rnd = mulberry32(11);
    const systems = [
      { x: 1210, y: 300, R: 250, n: 6, ph: 1.1 },
      { x: 330, y: 700, R: 210, n: 5, ph: 0.2 },
    ];
    const rings = [];
    systems.forEach((s, si) => {
      for (let k = 1; k <= s.n; k++) {
        const R = ((s.R * k) / s.n) * 1.25;
        const pts = [];
        for (let i = 0; i <= 90; i++) {
          const a = (i / 90) * Math.PI * 2;
          const r = R * (1 + 0.1 * Math.sin(3 * a + s.ph + k * 0.2) + 0.06 * Math.sin(5 * a + s.ph * 2));
          pts.push(`${(s.x + Math.cos(a) * r).toFixed(1)},${(s.y + Math.sin(a) * r).toFixed(1)}`);
        }
        rings.push({ d: `M${pts.join('L')}Z`, key: `${si}-${k}`, bold: k % 3 === 0 });
      }
    });

    const marks = [];
    for (let i = 0; i < 110; i++) {
      marks.push({
        x: 30 + rnd() * 1540,
        y: 40 + rnd() * 820,
        n: 2 + Math.floor(rnd() * 46),
        bold: rnd() > 0.82,
      });
    }

    const lines = [];
    for (let x = 160; x < 1600; x += 160) lines.push({ x1: x, y1: 0, x2: x, y2: 900 });
    for (let y = 150; y < 900; y += 150) lines.push({ x1: 0, y1: y, x2: 1600, y2: y });
    return { rings, marks, lines };
  }, []);

  return (
    <svg className="hero__chart" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#12306B" strokeOpacity=".09" strokeWidth="1">
        {chart.lines.map((l, i) => (
          <line key={i} {...l} />
        ))}
      </g>
      <g fill="none" stroke="#12306B" strokeLinejoin="round">
        {chart.rings.map((r) => (
          <path key={r.key} d={r.d} strokeOpacity={r.bold ? 0.3 : 0.16} strokeWidth={r.bold ? 1.6 : 1} />
        ))}
      </g>
      <g fill="#12306B" fontFamily="var(--f-mono)" fontSize="13">
        {chart.marks.map((m, i) => (
          <text key={i} x={m.x} y={m.y} fillOpacity={m.bold ? 0.5 : 0.28} fontWeight={m.bold ? 700 : 400}>
            {m.n}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default memo(ChartBackdrop);
