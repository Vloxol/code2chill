import { useRef } from 'react';

// The copy you read, and the code it compiles to. The cursor is an x-ray lens between the two.
function Xray({ text, code }) {
  const ref = useRef(null);

  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const leave = () => {
    ref.current.style.setProperty('--mx', '-999px');
    ref.current.style.setProperty('--my', '-999px');
  };

  return (
    <p className="xray" ref={ref} onPointerMove={move} onPointerLeave={leave}>
      <span className="xray__top">{text}</span>
      <code className="xray__code" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i}>{code}</span>
        ))}
      </code>
    </p>
  );
}

export default function Charter({ items }) {
  return (
    <section id="charter" className="sec sec--light charter" data-cursor="lens" aria-labelledby="charter-title">
      <div className="charter__head">
        <h2 id="charter-title" className="charter__title">
          Our charter, in three lines.
        </h2>
        <p className="charter__note">Hover over a line to see what it compiles to.</p>
      </div>
      <div className="charter__lines">
        {items.map((it) => (
          <Xray key={it.text} text={it.text} code={it.code} />
        ))}
      </div>
    </section>
  );
}
