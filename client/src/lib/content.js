import bundled from '../../../shared/content.json';

// The site renders instantly from bundled content, then swaps in live data from the API
// when it's reachable. If the API is down or not deployed, the bundled copy stays.
export const bundledContent = bundled;

export async function loadContent(signal) {
  try {
    const res = await fetch('/api/content', { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const live = await res.json();
    return { ...bundled, ...live };
  } catch {
    return bundled;
  }
}

export async function submitJoin(payload) {
  const res = await fetch('/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Could not send your sign-up. Try again in a moment.');
    err.fields = data.errors || {};
    throw err;
  }
  return data;
}
