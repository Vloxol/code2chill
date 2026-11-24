import { useEffect, useState } from 'react';

// theme = what the header and gauge should look like over that section's background
const SECTIONS = [
  { id: 'surface', label: 'Surface', theme: 'light' },
  { id: 'charter', label: 'Charter', theme: 'light' },
  { id: 'ports', label: 'Ports', theme: 'dark' },
  { id: 'crew', label: 'Crew', theme: 'dark' },
  { id: 'cargo', label: 'Cargo', theme: 'dark' },
  { id: 'dock', label: 'Dock', theme: 'dark' },
];

function goTo(e, id) {
  if (id !== 'surface') return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function Chrome() {
  const [active, setActive] = useState('surface');
  const [nm, setNm] = useState(0);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      let cur = SECTIONS[0];
      SECTIONS.forEach((s, i) => {
        const el = els[i];
        if (i === 0 || !el) return;
        if (el.getBoundingClientRect().top <= vh * 0.5) cur = s;
      });
      setActive(cur.id);
      document.documentElement.dataset.theme = cur.theme;
      const max = document.documentElement.scrollHeight - vh;
      setNm(max > 0 ? Math.round((window.scrollY / max) * 100) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <header className="hdr">
        <a className="hdr__logo" href="#surface" onClick={(e) => goTo(e, 'surface')} aria-label="Code2Chill, back to top">
          <span className="hdr__mark" aria-hidden="true">
            &lt;/&gt;
          </span>
          Code2Chill
        </a>
        <nav className="hdr__nav" aria-label="Sections">
          {SECTIONS.slice(1, 5).map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
              {s.label}
            </a>
          ))}
        </nav>
        <a className="hdr__cta" href="#dock">
          Join the crew
        </a>
      </header>

      <nav className="gauge" aria-hidden="true">
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id} className={s.id === active ? 'is-on' : ''}>
              <a href={`#${s.id}`} tabIndex={-1} onClick={(e) => goTo(e, s.id)}>
                <span className="gauge__label">{s.label}</span>
                <i className="gauge__tick" />
              </a>
            </li>
          ))}
        </ul>
        <div className="gauge__nm">{String(nm).padStart(3, '0')} nm</div>
      </nav>
    </>
  );
}
