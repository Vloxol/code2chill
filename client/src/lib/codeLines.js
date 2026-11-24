// The "underneath" of the landing page. Shows through the tears.
export const CODE_LINES = [
  '// code2chill/voyage.js  (you tore the page. good.)',
  'import { Ship, Crew, vibe } from "@c2c/campus";',
  '',
  'const club = new Ship({',
  '  name: "Code2Chill",',
  '  home: "Chitkara University",',
  '  stack: ["MongoDB", "Express", "React", "Node"],',
  '  vibe: "chill",',
  '});',
  '',
  'export async function voyage(crew) {',
  '  while (crew.hasIdeas()) {',
  '    const build = await crew.build();',
  '    if (build.works) {',
  '      await club.ship(build);',
  '      await vibe.chill(15);',
  '    } else {',
  '      crew.debug(build.error); // it happens',
  '    }',
  '  }',
  '}',
  '',
  'crew.add("navigator", { climbs: "mast", calls: "bugs and routes" });',
  'crew.add("sailmaker", { paints: "sails" });',
  'crew.add("cook", { keeps: "the vibes" });',
  'crew.add("you", { welcome: true });',
  '',
  'const ports = ["workshops", "build nights", "hackathons", "demo days"];',
  'for (const port of ports) {',
  '  await club.sailTo(port);',
  '}',
  '',
  'try {',
  '  await club.dock();',
  '} catch (storm) {',
  '  console.log("weather it together");',
  '}',
  '',
  '// psst: the dock is at the bottom of the page.',
  '// no tickets. no gatekeeping. bring a laptop.',
  'export default club;',
  '',
];

const RE =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(import|from|const|let|export|default|async|function|await|while|if|else|return|new|true|false|for|of|try|catch)\b|\b(\d+)\b|([A-Za-z_$][\w$]*)(?=\()|([{}()[\];,.<>=!&|+\-*/:?]+)|(\s+)|([A-Za-z_$][\w$]*)|(.)/g;

export const TOKEN_COLORS = {
  c: '#5E8190', // comment
  s: '#79E6C4', // string
  k: '#EDB52E', // keyword
  n: '#E4572E', // number
  f: '#BFD8FF', // function call
  p: '#7C94A3', // punctuation
  w: '#000000', // whitespace
  i: '#D9E8EA', // identifier
};

export function tokenize(line) {
  const out = [];
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(line))) {
    const t = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : m[5] ? 'f' : m[6] ? 'p' : m[7] ? 'w' : 'i';
    out.push({ s: m[0], t });
  }
  return out;
}
