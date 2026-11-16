// Shared by the tests: no network, no database, no waiting between requests.
import { config } from '../src/config.js';

config.crawlDelayMs = 0;

// Replaces fetch with `answer(url)`, which returns a Response or throws.
// robots.txt answers 404 (no rules). Returns the list of URLs asked, robots.txt
// left out.
export function stubFetch(answer) {
  const asked = [];
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.endsWith('/robots.txt')) return new Response('', { status: 404 });
    asked.push(href);
    return answer(href, asked.length);
  };
  return asked;
}

// The error Node's fetch throws when the connection is refused.
export const refused = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });

// An index answer: header row, captures, then the resume key when given.
export function cdxRows(captures, resumeKey) {
  const rows = [['timestamp', 'original'], ...captures];
  if (resumeKey) rows.push([], [resumeKey]);
  return new Response(JSON.stringify(rows), { status: 200 });
}

// The prefix a Wayback index URL asks for.
export const cdxPrefix = (href) => new URL(href).searchParams.get('url');
