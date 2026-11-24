import { useRef, useState } from 'react';
import { submitJoin } from '../lib/content.js';

const YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Other'];

export default function Dock({ club }) {
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');
  const [fields, setFields] = useState({});
  const btn = useRef(null);

  // The button leans toward the cursor, like a ship toward the quay.
  const pull = (e) => {
    const b = btn.current;
    if (!b || e.pointerType !== 'mouse') return;
    const r = b.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    b.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
  };
  const release = () => {
    if (btn.current) btn.current.style.transform = '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setStatus('sending');
    setFields({});
    setMessage('');
    try {
      await submitJoin(data);
      setStatus('done');
      e.currentTarget.reset();
    } catch (err) {
      setStatus('error');
      setFields(err.fields || {});
      setMessage(err.message);
    }
  };

  return (
    <section id="dock" className="sec sec--dark dock" data-cursor="anchor" aria-labelledby="dock-title">
      <div className="dock__grid">
        <div className="dock__copy">
          <h2 id="dock-title" className="dock__title">
            Drop anchor.
          </h2>
          <p className="dock__lede">
            {club.members} of {club.capacity} seats are taken and {club.capacity - club.members} are left. Tell us what
            you'd like to build and we'll find you a spot on deck.
          </p>
          <a className="dock__official" href={club.url} target="_blank" rel="noreferrer">
            Or press "I'm Interested" on the official club page
          </a>
        </div>

        {status === 'done' ? (
          <div className="dock__done" role="status">
            <h3>Anchor dropped.</h3>
            <p>You're on the list. We'll email you with the next time the crew meets.</p>
            <button type="button" className="dock__again" onClick={() => setStatus('idle')}>
              Add another sailor
            </button>
          </div>
        ) : (
          <form className="dock__form" onSubmit={onSubmit} noValidate>
            <label className={fields.name ? 'has-error' : ''}>
              Your name
              <input name="name" type="text" autoComplete="name" required aria-invalid={!!fields.name} />
              {fields.name && <span className="err">{fields.name}</span>}
            </label>
            <label className={fields.email ? 'has-error' : ''}>
              Email
              <input name="email" type="email" autoComplete="email" required aria-invalid={!!fields.email} />
              {fields.email && <span className="err">{fields.email}</span>}
            </label>
            <div className="dock__row">
              <label>
                Year
                <select name="year" defaultValue="">
                  <option value="" disabled>
                    Choose
                  </option>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label>
                Branch or course
                <input name="branch" type="text" autoComplete="off" />
              </label>
            </div>
            <label className={fields.message ? 'has-error' : ''}>
              What do you want to build?
              <textarea name="message" rows="3" maxLength="600" aria-invalid={!!fields.message} />
              {fields.message && <span className="err">{fields.message}</span>}
            </label>

            {status === 'error' && (
              <p className="dock__error" role="alert">
                {message}
              </p>
            )}

            <button
              ref={btn}
              className="dock__btn"
              type="submit"
              disabled={status === 'sending'}
              onPointerMove={pull}
              onPointerLeave={release}
              data-cursor-label="drop anchor"
            >
              {status === 'sending' ? 'Dropping anchor...' : 'Join the crew'}
            </button>
          </form>
        )}
      </div>

      <footer className="dock__foot">
        <p>
          {club.name} · {club.university}
        </p>
        <a href={club.url} target="_blank" rel="noreferrer">
          Official club page
        </a>
      </footer>
    </section>
  );
}
