import fs from 'node:fs';

// Bundled sample content. Used when MongoDB isn't configured or a collection is empty.
const file = new URL('../../shared/content.json', import.meta.url);
export const content = JSON.parse(fs.readFileSync(file, 'utf8'));
