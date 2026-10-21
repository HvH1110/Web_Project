import robotsParser from 'robots-parser';
import { config } from '../config.js';

const lastRequestAt = new Map(); // host -> timestamp of the last request
const robotsCache = new Map(); // origin -> Promise<{ status, text }>

export class RobotsDisallowedError extends Error {
  constructor(url, robotsStatus) {
    const why = robotsStatus >= 200 && robotsStatus < 300 ? '' : ` (robots.txt unreadable: ${robotsStatus ? `HTTP ${robotsStatus}` : 'request failed'})`;
    super(`robots.txt disallows ${url}${why}`);
    this.name = 'RobotsDisallowedError';
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Waits until at least crawlDelayMs (or the site's Crawl-delay, if longer)
// has passed since the previous request to the same host.
async function throttle(host, minDelayMs) {
  const wait = (lastRequestAt.get(host) ?? 0) + minDelayMs - Date.now();
  lastRequestAt.set(host, Date.now() + Math.max(wait, 0));
  if (wait > 0) await sleep(wait);
}

async function rawFetch(url, { minDelayMs = config.crawlDelayMs, headers = {}, timeoutMs = 30000 } = {}) {
  const { host } = new URL(url);
  await throttle(host, minDelayMs);
  return fetch(url, {
    headers: {
      'User-Agent': config.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en',
      ...headers,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
}

const ROBOTS_RETRY_MS = 30000;

async function fetchRobotsTxt(origin) {
  try {
    const res = await rawFetch(`${origin}/robots.txt`);
    return { status: res.status, text: res.ok ? await res.text() : '' };
  } catch {
    return { status: 0, text: '' };
  }
}

// Fetches robots.txt once per origin: { status, text }. status is the HTTP
// status, or 0 when the request itself failed. A network error or 5xx is
// retried once after a pause, so one glitch doesn't cost a whole run.
export function getRobotsTxt(url) {
  const { origin } = new URL(url);
  if (!robotsCache.has(origin)) {
    robotsCache.set(
      origin,
      fetchRobotsTxt(origin).then(async (first) => {
        if (first.status !== 0 && first.status < 500) return first;
        await sleep(ROBOTS_RETRY_MS);
        return fetchRobotsTxt(origin);
      }),
    );
  }
  return robotsCache.get(origin);
}

// Returns the parsed robots.txt for the URL's origin, or null when the site
// has none (404/410). Any other failure is treated as "disallow everything".
export async function getRobots(url) {
  const robotsUrl = new URL('/robots.txt', url).href;
  const { status, text } = await getRobotsTxt(url);
  if (status === 404 || status === 410) return null;
  if (status < 200 || status >= 300) return robotsParser(robotsUrl, 'User-agent: *\nDisallow: /');
  return robotsParser(robotsUrl, text);
}

// The one way the crawler talks to the outside world: checks robots.txt,
// honours Crawl-delay, rate-limits per host and sends an honest User-Agent.
export async function politeFetch(url, options = {}) {
  const robots = await getRobots(url);
  if (robots && robots.isAllowed(url, config.robotsAgent) === false) {
    throw new RobotsDisallowedError(url, (await getRobotsTxt(url)).status);
  }
  const crawlDelayMs = (robots?.getCrawlDelay(config.robotsAgent) ?? 0) * 1000;
  return rawFetch(url, { ...options, minDelayMs: Math.max(config.crawlDelayMs, crawlDelayMs) });
}
