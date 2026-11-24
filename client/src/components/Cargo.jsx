import { useState } from 'react';

export default function Cargo({ projects, club }) {
  const [open, setOpen] = useState(null);

  return (
    <section id="cargo" className="sec sec--ink cargo" data-cursor="crate" aria-labelledby="cargo-title">
      <div className="cargo__head">
        <h2 id="cargo-title" className="cargo__title">
          Events we've run.
        </h2>
        <p className="cargo__note">
          Crates from the hold. Open one. {club?.upcomingNote}
        </p>
      </div>

      <ul className="cargo__grid">
        {projects.map((p) => {
          const isOpen = open === p.id;
          return (
            <li key={p.id}>
              <article className={`crate${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="crate__btn"
                  aria-expanded={isOpen}
                  aria-controls={`crate-${p.id}`}
                  onClick={() => setOpen(isOpen ? null : p.id)}
                  data-cursor-label={isOpen ? 'close' : 'open'}
                >
                  <span className="crate__status">{p.status}</span>
                  <span className="crate__title">{p.title}</span>
                  <span className="crate__blurb">{p.blurb}</span>
                </button>
                <div className="crate__more" id={`crate-${p.id}`} hidden={!isOpen}>
                  <p>{p.detail}</p>
                  {p.stack?.length ? (
                    <ul className="crate__stack" aria-label="Built with">
                      {p.stack.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                  {p.link ? (
                    <a className="crate__link" href={p.link} target="_blank" rel="noreferrer">
                      Open the event page
                    </a>
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
