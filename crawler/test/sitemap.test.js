import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stubFetch } from './helpers.js';
import { fetchSitemapUrls } from '../src/lib/sitemap.js';

const URLSET = '<?xml version="1.0"?><urlset><url><loc>https://example.com/a?x=1&amp;y=2</loc></url><url><loc> https://example.com/b </loc></url></urlset>';

test('a complete sitemap lists its URLs', async () => {
  stubFetch(() => new Response(URLSET, { status: 200 }));
  assert.deepEqual(await fetchSitemapUrls('https://example.com/sitemap.xml'), ['https://example.com/a?x=1&y=2', 'https://example.com/b']);
});

test('a sitemap cut short is a retryable error, not a shorter list', async () => {
  stubFetch(() => new Response(URLSET.slice(0, 80), { status: 200 }));
  await assert.rejects(fetchSitemapUrls('https://example.com/sitemap.xml'), (err) => /incomplete/.test(err.message) && err.retryable === true);
});

test('5xx is retryable, 503 and 4xx are not', async () => {
  for (const [status, retryable] of [
    [500, true],
    [502, true],
    [503, false],
    [403, false],
    [404, false],
  ]) {
    stubFetch(() => new Response('', { status }));
    await assert.rejects(fetchSitemapUrls('https://example.com/sitemap.xml'), (err) => err.retryable === retryable, `HTTP ${status}`);
  }
});
