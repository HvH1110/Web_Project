import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { ORIGIN, startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());
// Imported only now: the app reads the environment on import (helpers.js).
const { clearSitemapCache, loadSitemap } = await import('../src/services/sitemap.service.js');

const urlsOf = (xml) => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const updatedAt = new Date('2026-11-01T00:00:00.000Z');
const day = (date) => new Date(`${date}T12:00:00.000Z`);

before(async () => {
  await app.db.collection('brands').insertMany([
    { slug: 'dior', name: 'Dior', category: 'fashion', order: 2, updatedAt },
    { slug: 'rolex', name: 'Rolex', category: 'watches', order: 1, updatedAt },
  ]);
  const { insertedIds } = await app.db.collection('products').insertMany([
    { brand: 'rolex', ref: 'PRICE-CHANGED', name: 'Later price', createdAt: day('2026-08-01'), updatedAt, description: 'not for the sitemap' },
    { brand: 'rolex', ref: 'ARCHIVE-PRICE', name: 'Older price', createdAt: day('2026-09-01'), updatedAt },
    { brand: 'rolex', ref: 'NO-PRICE', name: 'No price yet', createdAt: day('2026-09-15'), updatedAt },
    { brand: 'dior', ref: "A&B/1'<2>", name: 'Odd reference, no dates' },
  ]);
  await app.db.collection('price_points').insertMany([
    { productId: insertedIds[0], price: 1, observedAt: day('2026-10-01') },
    { productId: insertedIds[0], price: 2, observedAt: day('2026-10-12') },
    { productId: insertedIds[0], price: 3, observedAt: day('2026-10-05') },
    { productId: insertedIds[1], price: 1, observedAt: day('2020-01-01') },
  ]);
});
beforeEach(() => clearSitemapCache());

describe('GET /api/sitemap.xml', () => {
  it('lists the static, brand and product pages at their frontend URLs', async () => {
    const { status, text } = await app.client().get('/sitemap.xml');
    assert.equal(status, 200);
    assert.ok(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
    assert.ok(text.trimEnd().endsWith('</urlset>'));
    assert.deepEqual(urlsOf(text), [
      `${ORIGIN}/`,
      `${ORIGIN}/search`,
      `${ORIGIN}/deals`,
      `${ORIGIN}/brands/rolex`,
      `${ORIGIN}/brands/dior`,
      `${ORIGIN}/products/dior/A%26B%2F1&apos;%3C2%3E`,
      `${ORIGIN}/products/rolex/ARCHIVE-PRICE`,
      `${ORIGIN}/products/rolex/NO-PRICE`,
      `${ORIGIN}/products/rolex/PRICE-CHANGED`,
    ]);
  });

  it('leaves out noindexed pages and anything but the URL and date', async () => {
    const { text } = await app.client().get('/sitemap.xml');
    assert.ok(!/community|account|login|styleguide/.test(text));
    assert.ok(!text.includes('not for the sitemap'));
  });

  it('dates a product by its latest price change or when it was added, never updatedAt', async () => {
    const { text } = await app.client().get('/sitemap.xml');
    const entry = (ref, date) => `<url><loc>${ORIGIN}/products/rolex/${ref}</loc><lastmod>${date}</lastmod></url>`;
    assert.ok(text.includes(entry('PRICE-CHANGED', '2026-10-12')), 'the latest price change');
    assert.ok(text.includes(entry('ARCHIVE-PRICE', '2026-09-01')), 'an older archive price does not count');
    assert.ok(text.includes(entry('NO-PRICE', '2026-09-15')), 'no price: when it was added');
    assert.ok(!text.includes('2026-11-01'));
  });

  it('has no lastmod without a real date', async () => {
    const { text } = await app.client().get('/sitemap.xml');
    assert.ok(text.includes(`<url><loc>${ORIGIN}/products/dior/A%26B%2F1&apos;%3C2%3E</loc></url>`));
    assert.ok(text.includes(`<url><loc>${ORIGIN}/brands/rolex</loc></url>`));
    assert.equal((text.match(/<lastmod>/g) ?? []).length, 3);
  });

  it('is served as XML with long public caching', async () => {
    const { headers } = await app.client().get('/sitemap.xml');
    assert.match(headers.get('content-type'), /^application\/xml/);
    assert.equal(headers.get('cache-control'), 'public, max-age=86400');
  });

  it('keeps the built sitemap instead of reading the catalog every time', async () => {
    const client = app.client();
    await client.get('/sitemap.xml');
    await app.db.collection('products').insertOne({ brand: 'rolex', ref: 'NEW1', name: 'New' });
    assert.ok(!(await client.get('/sitemap.xml')).text.includes('NEW1'));
    clearSitemapCache();
    assert.ok((await client.get('/sitemap.xml')).text.includes('NEW1'));
    await app.db.collection('products').deleteOne({ ref: 'NEW1' });
  });

  it('shares one build between requests at the same moment', async () => {
    assert.equal(loadSitemap(), loadSitemap());
  });
});
