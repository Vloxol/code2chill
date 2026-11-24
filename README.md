# Code2Chill

Club website for Code2Chill, Chitkara University. MERN stack: MongoDB, Express, React (Vite), Node.

## Run it

```bash
npm install
npm run dev        # API on :5000, site on :5173
```

MongoDB is optional while you develop. With no `MONGO_URI` the API serves the sample content in
`shared/content.json` and keeps sign-ups in memory. To use MongoDB:

```bash
cp server/.env.example server/.env   # set MONGO_URI
npm run seed                          # loads crew, ports and projects from shared/content.json
```

Production: `npm run build && npm start` serves the built site and the API from one Node process.

## Put in your real content

All site copy lives in `shared/content.json`: the charter lines, ports, past events, seat counts and the ten crew
members (taken from the club page on 23 Nov 2026). Update it when members, events or seats change, then re-run
`npm run seed` if you use MongoDB.
Sign-ups are saved to the `joinrequests` collection.

## How the pieces work

| Piece | File |
| --- | --- |
| Section-aware cursor (six modes, chosen by `data-cursor` on each section; the landing page uses a sailmaker's needle with a trailing thread) | `client/src/components/Cursor.jsx`, `styles/cursor.css` |
| Landing rip: a ribbon that opens behind the needle, shows code through the gap, then is stitched shut. Clicks burst it open | `client/src/components/TearHero.jsx` |
| Code shown inside the tears | `client/src/lib/codeLines.js` |
| Pixel ship, sea, sky and crew sprites (drawn in code, rendered as SVG) | `client/src/lib/pixel.js`, `components/Crew.jsx` |
| Crew roles and what each one does | `shared/content.json` |

To add a crew role, add an entry to `crew` and a matching slot in `SLOTS` in `pixel.js`.

## Easter egg

A small pixel goat (`client/src/components/Goat.jsx`) turns up at a random moment and spot. Click it and it
puffs a cloud of dust and dashes off screen, leaving a card with its details for a few seconds. It stays gone
for the rest of that browser tab's session (`sessionStorage` key `c2c-goat-clicked`) and returns in a new one.
Edit the card text in the `goat__card` block. To change how long a rip lasts, see `OPEN`, `HEAL` and `LIFE` in
`TearHero.jsx`.

## Accessibility

Real cursor only on devices with a fine pointer; touch and reduced-motion get a calm version. Crew members
are keyboard-focusable buttons. Reduced motion shortens the tear and stops the drifting code.
