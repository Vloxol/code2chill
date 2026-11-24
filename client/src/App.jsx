import { useEffect, useState } from 'react';
import { bundledContent, loadContent } from './lib/content.js';
import Cursor from './components/Cursor.jsx';
import Chrome from './components/Chrome.jsx';
import TearHero from './components/TearHero.jsx';
import Charter from './components/Charter.jsx';
import Ports from './components/Ports.jsx';
import Crew from './components/Crew.jsx';
import Cargo from './components/Cargo.jsx';
import Dock from './components/Dock.jsx';
import Goat from './components/Goat.jsx';

export default function App() {
  const [content, setContent] = useState(bundledContent);

  useEffect(() => {
    const ctrl = new AbortController();
    loadContent(ctrl.signal).then(setContent);
    return () => ctrl.abort();
  }, []);

  return (
    <>
      <Cursor />
      <Goat />
      <Chrome />
      <main>
        <TearHero />
        <div className="sheet">
          <Charter items={content.charter} />
          <Ports ports={content.ports} />
          <Crew crew={content.crew} />
          <Cargo projects={content.projects} club={content.club} />
          <Dock club={content.club} />
        </div>
      </main>
    </>
  );
}
