// Source survey helper: `npm run probe -- <url> [<url> ...]`
// For each URL: what robots.txt says, whether the page loads for a plain HTTP
// client (or bot protection answers instead), and where a price appears.
// Requests go through politeFetch, so robots.txt and rate limits apply.
import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { getRobots, getRobotsTxt, politeFetch, RobotsDisallowedError } from '../lib/http.js';

const BOT_WALLS = [
  [/_Incapsula_Resource|Incapsula incident/i, 'Imperva/Incapsula'],
  [/Pardon Our Interruption/i, 'Imperva (Distil)'],
  [/captcha-delivery\.com|geo\.captcha-delivery/i, 'DataDome'],
  [/px-captcha|_pxAppId|perimeterx/i, 'PerimeterX/HUMAN'],
  [/cf-chl-|challenge-platform|Just a moment\.\.\./i, 'Cloudflare challenge'],
  [/<title>\s*Access Denied\s*<\/title>|errors\.edgesuite\.net/i, 'Akamai block'],
  [/sec-if-cpt-container|Powered and protected by\s*<[^>]*>?\s*Akamai/i, 'Akamai challenge'],
  [/kpsdk|KPSDK/, 'Kasada'],
  [/recaptcha|hcaptcha/i, 'CAPTCHA on page'],
];

const PRICE_TEXT =
  /(?:S\$|SGD|HK\$|HKD|US\$|USD|VND|₫)\s?\d[\d.,\s]{2,}|\d[\d.,]{3,}\s?(?:₫|VND|đ\b|SGD|HKD)/g;

function robotsSummary(text) {
  // Only for display: the `User-agent: *` group plus any group naming us.
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
  const out = [];
  let agents = [];
  let inRules = false;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      if (inRules) agents = [];
      inRules = false;
      agents.push(value.toLowerCase());
    } else if (key === 'sitemap') {
      out.push(`sitemap: ${value}`);
    } else {
      inRules = true;
      if (agents.some((a) => a === '*' || config.robotsAgent.toLowerCase().includes(a))) {
        out.push(`[${agents.join(',')}] ${key}: ${value}`);
      }
    }
  }
  return out;
}

function findJsonLdOffers($) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const type = [].concat(node['@type'] ?? []).join(',');
    if (/Offer/.test(type) && (node.price ?? node.lowPrice) != null) {
      found.push(`${node.priceCurrency ?? '?'} ${node.price ?? node.lowPrice}`);
    }
    Object.values(node).forEach(visit);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      // Ignore malformed JSON-LD.
    }
  });
  return found;
}

function embeddedState(html) {
  const markers = {
    __NEXT_DATA__: /id="__NEXT_DATA__"/,
    __NUXT__: /window\.__NUXT__|id="__NUXT_DATA__"/,
    __INITIAL_STATE__: /__INITIAL_STATE__|__PRELOADED_STATE__|__APOLLO_STATE__/,
    'Magento (x-magento-init)': /text\/x-magento-init/,
    'SFCC (demandware)': /demandware|dwvar_|on\/demandware\.store/,
    Shopify: /cdn\.shopify\.com|Shopify\.theme/,
    WooCommerce: /woocommerce/i,
  };
  return Object.entries(markers)
    .filter(([, re]) => re.test(html))
    .map(([name]) => name);
}

async function probe(url) {
  console.log(`\n=== ${url}`);
  const robotsTxt = await getRobotsTxt(url);
  console.log(`robots.txt: ${robotsTxt.status ? `HTTP ${robotsTxt.status}` : 'request failed'}`);
  robotsSummary(robotsTxt.text).slice(0, 40).forEach((l) => console.log(`  ${l}`));
  const robots = await getRobots(url);
  if (robots) {
    console.log(`allowed for ${config.robotsAgent}: ${robots.isAllowed(url, config.robotsAgent)}`);
    const delay = robots.getCrawlDelay(config.robotsAgent);
    if (delay) console.log(`crawl-delay: ${delay}s`);
  }

  let res;
  try {
    res = await politeFetch(url);
  } catch (err) {
    console.log(err instanceof RobotsDisallowedError ? 'SKIPPED: disallowed by robots.txt' : `FETCH ERROR: ${err.message}`);
    return;
  }
  const html = await res.text();
  const h = (name) => res.headers.get(name);
  console.log(`HTTP ${res.status}  final=${res.url}`);
  console.log(`content-type=${h('content-type')}  bytes=${html.length}  server=${h('server') ?? '-'}`);
  const cdn = ['cf-ray', 'x-akamai-transformed', 'akamai-grn', 'x-datadome', 'x-iinfo', 'x-cache', 'x-vercel-id', 'x-amz-cf-id']
    .filter((name) => h(name))
    .map((name) => `${name}=${h(name).slice(0, 40)}`);
  if (cdn.length) console.log(`edge headers: ${cdn.join('  ')}`);
  const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split('=')[0]);
  if (cookies.length) console.log(`cookies: ${cookies.join(', ')}`);

  const walls = BOT_WALLS.filter(([re]) => re.test(html)).map(([, name]) => name);
  if (walls.length) console.log(`BOT PROTECTION MARKERS: ${walls.join(', ')}`);

  const $ = cheerio.load(html);
  console.log(`title: ${$('title').first().text().trim().slice(0, 120)}`);
  const offers = findJsonLdOffers($);
  console.log(`JSON-LD offers: ${offers.length ? offers.slice(0, 5).join(' | ') : 'none'}`);
  const metaPrice = $('meta[property="product:price:amount"], meta[itemprop="price"]').attr('content');
  if (metaPrice) console.log(`meta price: ${metaPrice}`);
  const state = embeddedState(html);
  console.log(`embedded state / platform: ${state.length ? state.join(', ') : 'none detected'}`);
  const text = $('body').text().replace(/\s+/g, ' ');
  const prices = [...new Set(text.match(PRICE_TEXT) ?? [])].slice(0, 8);
  console.log(`price-like text in HTML: ${prices.length ? prices.join(' | ') : 'none'}`);
  const rawPrices = [...new Set(html.match(/"(?:price|amount|formattedPrice|salePrice)"\s*:\s*"?[\d.,]+/gi) ?? [])].slice(0, 6);
  if (rawPrices.length) console.log(`price keys in raw HTML/JSON: ${rawPrices.join(' | ')}`);
}

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('Usage: npm run probe -- <url> [<url> ...]');
  process.exit(1);
}
for (const url of urls) {
  await probe(url);
}
