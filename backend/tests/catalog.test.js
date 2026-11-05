import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

const SGD = 20000;
const HKD = 3300;
let client;

const refs = (res) => res.body.items.map((item) => item.ref);

before(async () => {
  client = app.client();
  const today = new Date().toISOString().slice(0, 10);
  await app.db.collection('fx_rates').insertOne({ date: today, vndPer: { SGD, HKD, USD: 26000 }, source: 'vietcombank' });
  await app.db.collection('brands').insertMany([
    { slug: 'cartier', name: 'Cartier', category: 'jewelry', order: 1, contentStatus: 'draft', history: 'Text', signatureProducts: [{ name: 'Tank', year: 1917, description: 'x' }] },
    { slug: 'rolex', name: 'Rolex', category: 'watches', order: 2, contentStatus: 'draft' },
  ]);

  const product = (brand, ref, name, category, collection, createdAt) => ({ brand, ref, name, category, collection, createdAt: new Date(createdAt) });
  const { insertedIds } = await app.db.collection('products').insertMany([
    product('cartier', 'P1', 'Bague Panthère de Cartier', 'jewelry', 'Panthère', '2026-01-01'),
    product('cartier', 'P2', 'Tank Must watch', 'watches', 'Tank', '2026-02-01'),
    product('rolex', 'R1', 'Submariner Date', 'watches', 'Submariner', '2026-03-01'),
    product('rolex', 'R2', 'Day-Date 36 (100% gold)', 'watches', 'Day-Date', '2026-04-01'),
    product('rolex', 'NOPRICE', 'Datejust 41', 'watches', 'Datejust', '2026-05-01'),
  ]);
  const offer = (index, market, currency, price) => ({
    productId: insertedIds[index],
    source: { id: `${market}-${index}`, market, name: `Store ${market}`, type: 'official' },
    url: 'https://example.test/item',
    currency,
    price,
    available: true,
    lastSeenAt: new Date(),
    origin: 'crawl',
  });
  await app.db.collection('offers').insertMany([
    offer(0, 'VN', 'VND', 100_000_000),
    offer(1, 'SG', 'SGD', 2000), // 40,000,000
    offer(1, 'HK', 'HKD', 20000), // 66,000,000
    offer(2, 'HK', 'HKD', 60000), // 198,000,000
    offer(3, 'SG', 'SGD', 15000), // 300,000,000
  ]);
  await app.db.collection('price_points').insertMany([
    { productId: insertedIds[1], sourceId: 'SG-1', market: 'SG', currency: 'SGD', price: 1900, observedAt: new Date('2025-06-01'), origin: 'wayback', archiveUrl: 'https://web.archive.org/x' },
    { productId: insertedIds[1], sourceId: 'SG-1', market: 'SG', currency: 'SGD', price: 2000, observedAt: new Date(Date.now() - 86400000), origin: 'crawl' },
  ]);
});

describe('brands', () => {
  it('lists brands in order with their product counts', async () => {
    const res = await client.get('/brands');
    assert.deepEqual(res.body.items.map((b) => [b.slug, b.productCount]), [['cartier', 2], ['rolex', 3]]);
    assert.equal((await client.get('/brands?category=watches')).body.items.length, 1);
    assert.equal((await client.get('/brands?category=evil')).status, 400);
  });

  it('gives one brand with its collections, or 404', async () => {
    const res = await client.get('/brands/rolex');
    assert.equal(res.body.brand.productCount, 3);
    assert.deepEqual(res.body.brand.collections.map((c) => c.name), ['Datejust', 'Day-Date', 'Submariner']);
    assert.equal((await client.get('/brands/nobody')).status, 404);
  });

  it('compresses responses when the client accepts it', async () => {
    const big = await fetch(`${app.base}/api/products?limit=60`, { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(big.headers.get('content-encoding'), 'gzip');
    assert.ok((await big.json()).items.length > 0);
  });
});

describe('search', () => {
  it('ignores accents and case, and needs every word', async () => {
    assert.deepEqual(refs(await client.get('/products?q=PANTHERE')), ['P1']);
    assert.deepEqual(refs(await client.get(`/products?q=${encodeURIComponent('bague panthère')}`)), ['P1']);
    assert.deepEqual(refs(await client.get('/products?q=panthere+rolex')), []);
  });

  it('searches the brand, collection and reference too', async () => {
    assert.deepEqual(refs(await client.get('/products?q=rolex&sort=name')), ['NOPRICE', 'R2', 'R1']);
    assert.deepEqual(refs(await client.get('/products?q=r1')), ['R1']);
    assert.deepEqual(refs(await client.get('/products?q=tank')), ['P2']);
  });

  it('takes regex characters literally', async () => {
    // As a regular expression, "r.*" would match every name with an R in it.
    assert.deepEqual(refs(await client.get('/products?q=r.*')), []);
  });

  it('ignores a search with no letters or digits', async () => {
    const all = refs(await client.get('/products'));
    assert.ok(all.length > 0);
    assert.deepEqual(refs(await client.get('/products?q=.*')), all);
  });

  it('refuses a very long search', async () => {
    assert.equal((await client.get(`/products?q=${'a'.repeat(101)}`)).status, 400);
  });
});

describe('filters and sorting', () => {
  it('filters by brand, category, collection and market', async () => {
    assert.equal((await client.get('/products?brand=rolex')).body.total, 3);
    assert.equal((await client.get('/products?brand=ROLEX,cartier')).body.total, 5);
    assert.equal((await client.get('/products?brand=rolex&brand=cartier')).body.total, 5);
    assert.equal((await client.get('/products?category=jewelry')).body.total, 1);
    assert.deepEqual(refs(await client.get('/products?collection=Tank')), ['P2']);
    assert.deepEqual(refs(await client.get('/products?market=vn')), ['P1']);
    assert.equal((await client.get('/products?market=SG,HK')).body.total, 3);
    assert.equal((await client.get('/products?market=XX')).status, 400);
  });

  it('filters and sorts by the lowest price in VND', async () => {
    assert.deepEqual(refs(await client.get('/products?minPriceVnd=150000000&sort=price_asc')), ['R1', 'R2']);
    assert.deepEqual(refs(await client.get('/products?maxPriceVnd=100000000&sort=price_desc')), ['P1', 'P2']);
    assert.deepEqual(refs(await client.get('/products?sort=price_asc')), ['P2', 'P1', 'R1', 'R2', 'NOPRICE'], 'no price comes last');
    assert.deepEqual(refs(await client.get('/products?sort=price_desc')), ['R2', 'R1', 'P1', 'P2', 'NOPRICE']);
  });

  it('counts only the chosen markets for lowestPriceVnd', async () => {
    const res = await client.get('/products?market=HK&collection=Tank');
    assert.equal(res.body.items[0].lowestPriceVnd, 20000 * HKD);
    assert.equal((await client.get('/products?collection=Tank')).body.items[0].lowestPriceVnd, 2000 * SGD);
  });

  it('sorts by newest by default, and pages with the right totals', async () => {
    const first = await client.get('/products?limit=2');
    assert.deepEqual(refs(first), ['NOPRICE', 'R2']);
    assert.deepEqual([first.body.total, first.body.totalPages, first.body.page], [5, 3, 1]);
    assert.deepEqual(refs(await client.get('/products?limit=2&page=3')), ['P1']);
    assert.deepEqual(refs(await client.get('/products?limit=2&page=9')), []);
  });

  for (const query of ['page=0', 'page=-1', 'page=abc', 'limit=61', 'limit=0', 'sort=evil', 'minPriceVnd=-1', 'minPriceVnd=abc', 'minPriceVnd=5&maxPriceVnd=1', 'q=a&q=b']) {
    it(`answers 400 for ?${query}`, async () => {
      assert.equal((await client.get(`/products?${query}`)).status, 400);
    });
  }
});

describe('product and history', () => {
  it('gives a product by brand and normalized reference', async () => {
    const res = await client.get('/products/Rolex/r%201');
    assert.equal(res.status, 200);
    assert.equal(res.body.product.ref, 'R1');
    assert.equal(res.body.product.offers[0].priceVnd, 60000 * HKD);
    assert.equal((await client.get('/products/rolex/NOPE')).status, 404);
  });

  it('sorts offers by market, then price', async () => {
    const { offers } = (await client.get('/products/cartier/P2')).body.product;
    assert.deepEqual(offers.map((o) => o.market), ['SG', 'HK']);
  });

  it('gives the price history with where each point came from', async () => {
    const res = await client.get('/products/cartier/P2/history?range=all');
    assert.equal(res.status, 200);
    const [series] = res.body.series;
    assert.deepEqual(series.points.map((p) => p.origin), ['wayback', 'crawl']);
    assert.equal(series.points[0].archiveUrl, 'https://web.archive.org/x');
    assert.equal((await client.get('/products/cartier/P2/history?range=evil')).status, 400);
    assert.equal((await client.get('/products/cartier/NOPE/history')).status, 404);
  });
});

describe('crawler collections', () => {
  it('cannot be written by the backend', async () => {
    const { Offer } = await import('../src/models/offer.model.js');
    const { Product } = await import('../src/models/product.model.js');
    await assert.rejects(Offer.updateMany({}, { price: 1 }), /read-only/);
    await assert.rejects(Product.deleteMany({}), /read-only/);
    await assert.rejects(new Product({ brand: 'x', ref: 'y' }).save(), /read-only/);
    assert.equal((await client.get('/products')).body.total, 5);
  });
});
