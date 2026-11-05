import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());

const SGD = 20000;
const HKD = 3300;
const CURRENCY = { SG: 'SGD', HK: 'HKD', VN: 'VND' };
const now = new Date();
// Start of the current year in Vietnam time.
const since = new Date(Date.UTC(new Date(now.getTime() + 7 * 3600000).getUTCFullYear(), 0, 1) - 7 * 3600000);
const daysBefore = (days) => new Date(since.getTime() - days * 86400000);
const old = daysBefore(40);

const offers = [];
const points = [];
async function product(ref, offerList, pointList = []) {
  const { insertedId } = await app.db.collection('products').insertOne({ brand: 'dior', ref, name: ref, category: 'bags', createdAt: now });
  for (const [sourceId, market, price, origin] of offerList) {
    offers.push({
      productId: insertedId,
      source: { id: sourceId, market, name: sourceId, type: 'official' },
      url: `https://example.test/${ref}/${sourceId}`,
      currency: CURRENCY[market],
      price,
      available: true,
      lastSeenAt: now,
      ...(origin === undefined ? {} : { origin }),
    });
  }
  for (const [sourceId, market, price, observedAt, origin] of pointList) {
    points.push({ productId: insertedId, sourceId, market, currency: CURRENCY[market], price, observedAt, ...(origin === undefined ? {} : { origin }) });
  }
}

let market;
let drop;
const byRef = (body) => Object.fromEntries(body.items.map((deal) => [deal.product.ref, deal]));

before(async () => {
  const rates = [];
  for (let i = 800; i >= 0; i -= 1) {
    // Constant rates: every drop below is in the source's own currency.
    rates.push({ date: new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10), vndPer: { SGD, HKD, USD: 26000 }, source: 'vietcombank' });
  }
  await app.db.collection('fx_rates').insertMany(rates);
  await app.db.collection('brands').insertOne({ slug: 'dior', name: 'Dior', category: 'fashion', order: 1 });

  // Market deals. SG 100 = 2,000,000 VND; HK 1000 = 3,300,000 VND.
  await product('M-THIRD-CHEAP', [['a-sg', 'SG', 100, 'crawl'], ['a-hk', 'HK', 1000, 'crawl'], ['a-vn', 'VN', 1000000, 'manual']]);
  await product('M-THIRD-DEAR', [['b-sg', 'SG', 100, 'crawl'], ['b-hk', 'HK', 1000, 'crawl'], ['b-vn', 'VN', 9000000, 'manual']]);
  await product('M-ALL-MANUAL', [['c-sg', 'SG', 100, 'manual'], ['c-hk', 'HK', 1000, 'manual']]);
  await product('M-ONE-CRAWLED', [['d-sg', 'SG', 100, 'crawl'], ['d-hk', 'HK', 1000, 'manual']]);
  await product('M-SAME-MARKET', [['e-sg', 'SG', 100, 'crawl'], ['e2-sg', 'SG', 50, 'manual'], ['e-hk', 'HK', 1000, 'crawl']]);
  await product('M-NO-ORIGIN', [['f-sg', 'SG', 100], ['f-hk', 'HK', 1000]]);
  await product('M-ONE-MARKET', [['o-sg', 'SG', 100, 'crawl'], ['o2-sg', 'SG', 200, 'crawl']]);
  await product('M-SAME-PRICE', [['p-vn', 'VN', 2000000, 'crawl'], ['p-sg', 'SG', 100, 'crawl']]);
  await product('M-TINY-GAP', [['q-vn', 'VN', 2000100, 'crawl'], ['q-sg', 'SG', 100, 'crawl']]);

  // Drop deals, one market each, so they have no market deal.
  await product('D-CONTROL', [['g-sg', 'SG', 90, 'crawl']], [['g-sg', 'SG', 100, old, 'crawl']]);
  await product('D-WAYBACK-THEN', [['h-sg', 'SG', 90, 'crawl']], [['h-sg', 'SG', 100, old, 'wayback']]);
  await product('D-NO-ORIGIN', [['i-sg', 'SG', 90]], [['i-sg', 'SG', 100, old]]);
  await product('D-MANUAL-NOW', [['j-sg', 'SG', 90, 'manual']], [['j-sg', 'SG', 100, old, 'crawl']]);
  await product('D-MANUAL-THEN', [['k-sg', 'SG', 90, 'crawl']], [['k-sg', 'SG', 100, old, 'manual']]);
  // Falling back to the older 150 would invent a drop.
  await product('D-MANUAL-THEN-OLDER', [['l-sg', 'SG', 110, 'crawl']], [['l-sg', 'SG', 150, daysBefore(400), 'wayback'], ['l-sg', 'SG', 110, old, 'manual']]);
  await product('D-MANUAL-LATER', [['m-sg', 'SG', 90, 'crawl']], [['m-sg', 'SG', 100, old, 'crawl'], ['m-sg', 'SG', 95, new Date(now.getTime() - 3600000), 'manual']]);
  await product('D-TWO-SOURCES', [['n-sg', 'SG', 50, 'manual'], ['n2-sg', 'SG', 95, 'crawl']], [['n-sg', 'SG', 100, old, 'crawl'], ['n2-sg', 'SG', 100, old, 'crawl']]);
  await product('D-SMALL-DROP', [['r-sg', 'SG', 99.5, 'crawl']], [['r-sg', 'SG', 100, old, 'crawl']]);
  await product('D-EXACTLY-1PCT', [['s-sg', 'SG', 99, 'crawl']], [['s-sg', 'SG', 100, old, 'crawl']]);
  await product('D-PRICE-ROSE', [['t-sg', 'SG', 110, 'crawl']], [['t-sg', 'SG', 100, old, 'crawl']]);
  await product('D-FIRST-PRICE-LATER', [['u-sg', 'SG', 90, 'crawl']], [['u-sg', 'SG', 100, new Date(now.getTime() - 3600000), 'crawl']]);
  await product('D-OTHER-CURRENCY', [['v-sg', 'SG', 90, 'crawl']], [['v-sg', 'HK', 100, old, 'crawl']]);
  await product('D-TWO-MARKETS', [['w-sg', 'SG', 90, 'crawl'], ['w-sg2', 'SG', 80, 'crawl']], [['w-sg', 'SG', 100, old, 'crawl'], ['w-sg2', 'SG', 100, old, 'crawl']]);

  await app.db.collection('offers').insertMany(offers);
  await app.db.collection('price_points').insertMany(points);

  const client = app.client();
  market = (await client.get('/deals?type=market&limit=60')).body;
  drop = (await client.get('/deals?type=drop&period=year&limit=60')).body;
});

describe('caching', () => {
  it('serves the same deals for 5 minutes, without reading the catalog again', async () => {
    const { clearDealsCache } = await import('../src/services/deals.service.js');
    const client = app.client();
    const url = '/deals?period=year&limit=60';
    const before = (await client.get(url)).body.total;

    const { insertedId } = await app.db.collection('products').insertOne({ brand: 'dior', ref: 'NEW-DEAL', name: 'New', category: 'bags', createdAt: now });
    const newOffer = (id, market, price) => ({ productId: insertedId, source: { id, market, name: id, type: 'official' }, url: 'https://example.test/n', currency: CURRENCY[market], price, available: true, lastSeenAt: now });
    await app.db.collection('offers').insertMany([newOffer('new-sg', 'SG', 100), newOffer('new-hk', 'HK', 1000)]);
    assert.equal((await client.get(url)).body.total, before);

    clearDealsCache();
    assert.equal((await client.get(url)).body.total, before + 1);

    await app.db.collection('offers').deleteMany({ productId: insertedId });
    await app.db.collection('products').deleteOne({ _id: insertedId });
    clearDealsCache();
  });
});

describe('market deals', () => {
  it('compares the cheapest offer of each market, in VND', () => {
    const deal = byRef(market)['M-NO-ORIGIN'];
    assert.equal(deal.type, 'market');
    assert.equal(deal.cheapest.market, 'SG');
    assert.equal(deal.cheapest.priceVnd, 100 * SGD);
    assert.equal(deal.dearest.market, 'HK');
    assert.equal(deal.dearest.priceVnd, 1000 * HKD);
    assert.equal(deal.savingPct, 39.39);
  });

  it('needs two markets and a real gap, with no minimum saving', () => {
    const deals = byRef(market);
    assert.equal(deals['M-ONE-MARKET'], undefined);
    assert.equal(deals['M-SAME-PRICE'], undefined);
    assert.ok(deals['M-TINY-GAP'], 'even a very small gap counts');
    assert.ok(deals['M-TINY-GAP'].savingPct < 1);
  });

  it('ranks the highest saving first', () => {
    const savings = market.items.map((deal) => deal.savingPct);
    assert.deepEqual(savings, [...savings].sort((a, b) => b - a));
  });
});

describe('drop deals', () => {
  it('compares the current price with the one in effect at the start of the period', () => {
    const deal = byRef(drop)['D-CONTROL'];
    assert.equal(deal.type, 'drop');
    assert.deepEqual([deal.priceThen, deal.priceNow, deal.savingPct], [100, 90, 10]);
    assert.deepEqual([deal.priceVndThen, deal.priceVndNow], [100 * SGD, 90 * SGD]);
    assert.equal(deal.since, since.toISOString());
  });

  it('starts at 1%', () => {
    const deals = byRef(drop);
    assert.equal(deals['D-SMALL-DROP'], undefined);
    assert.equal(deals['D-EXACTLY-1PCT'].savingPct, 1);
    assert.equal(deals['D-PRICE-ROSE'], undefined);
  });

  it('needs an earlier price in the same currency', () => {
    const deals = byRef(drop);
    assert.equal(deals['D-FIRST-PRICE-LATER'], undefined);
    assert.equal(deals['D-OTHER-CURRENCY'], undefined);
  });

  it('gives one deal per market: the source with the biggest drop', () => {
    const matching = drop.items.filter((deal) => deal.product.ref === 'D-TWO-MARKETS');
    assert.equal(matching.length, 1);
    assert.equal(matching[0].offer.source.id, 'w-sg2');
  });

  it('counts a drop in VND alone, when only the exchange rate moved', async () => {
    const { findDropDeals } = await import('../src/services/deals.service.js');
    const productId = 'p1';
    const offer = { source: { id: 's', market: 'SG' }, currency: 'SGD', price: 100, priceVnd: 1_900_000 };
    const pricesThen = new Map([[`${productId}:s`, { price: 100, currency: 'SGD', origin: 'crawl' }]]);
    const deals = findDropDeals([{ _id: productId, offers: [offer] }], pricesThen, () => 20000, since);
    assert.equal(deals.length, 1);
    assert.equal(deals[0].savingPct, 5);
  });

  it('finds no VND drop without a rate, but still a drop in the currency', async () => {
    const { findDropDeals } = await import('../src/services/deals.service.js');
    const offer = { source: { id: 's', market: 'SG' }, currency: 'SGD', price: 90, priceVnd: null };
    const pricesThen = new Map([['p1:s', { price: 100, currency: 'SGD', origin: 'crawl' }]]);
    const [deal] = findDropDeals([{ _id: 'p1', offers: [offer] }], pricesThen, () => null, since);
    assert.deepEqual([deal.savingPct, deal.priceVndThen, deal.priceVndNow], [10, null, null]);
  });
});

describe('hand-entered prices', () => {
  it('are ignored in market deals', () => {
    const deals = byRef(market);
    assert.equal(deals['M-THIRD-CHEAP'].cheapest.offer.source.id, 'a-sg');
    assert.equal(deals['M-THIRD-CHEAP'].dearest.offer.source.id, 'a-hk');
    assert.equal(deals['M-THIRD-CHEAP'].savingPct, 39.39);
    assert.equal(deals['M-THIRD-DEAR'].dearest.offer.source.id, 'b-hk');
    assert.equal(deals['M-ALL-MANUAL'], undefined);
    assert.equal(deals['M-ONE-CRAWLED'], undefined);
    assert.equal(deals['M-SAME-MARKET'].cheapest.offer.source.id, 'e-sg');
  });

  it('are never the current or the starting price of a drop', () => {
    const deals = byRef(drop);
    assert.equal(deals['D-MANUAL-NOW'], undefined);
    assert.equal(deals['D-MANUAL-THEN'], undefined);
    assert.equal(deals['D-MANUAL-THEN-OLDER'], undefined, 'no fallback to an older price');
    assert.equal(deals['D-TWO-SOURCES'].offer.source.id, 'n2-sg');
    assert.equal(deals['D-TWO-SOURCES'].savingPct, 5);
  });

  it('do not matter after the start of the period', () => {
    assert.equal(byRef(drop)['D-MANUAL-LATER'].priceThen, 100);
  });

  it('leave rows with no origin field counted, and wayback starting prices', () => {
    assert.ok(byRef(market)['M-NO-ORIGIN']);
    assert.equal(byRef(drop)['D-NO-ORIGIN'].savingPct, 10);
    assert.equal(byRef(drop)['D-WAYBACK-THEN'].savingPct, 10);
  });

  it('stay in lowestPriceVnd', () => {
    assert.equal(byRef(market)['M-THIRD-CHEAP'].product.lowestPriceVnd, 1000000);
  });
});

describe('paging', () => {
  it('gives totals that match the items', () => {
    assert.equal(market.total, market.items.length);
    assert.equal(drop.total, drop.items.length);
  });

  it('adds both kinds together, in one ranking, on every page', async () => {
    const client = app.client();
    const all = (await client.get('/deals?period=year&limit=60')).body;
    assert.equal(all.total, market.total + drop.total);

    const first = (await client.get('/deals?period=year&limit=2')).body;
    assert.equal(first.totalPages, Math.ceil(all.total / 2));
    const walked = [];
    for (let page = 1; page <= first.totalPages; page += 1) {
      walked.push(...(await client.get(`/deals?period=year&limit=2&page=${page}`)).body.items);
    }
    assert.equal(walked.length, all.total);
    const shown = walked.flatMap((deal) => (deal.type === 'market' ? [deal.cheapest.offer, deal.dearest.offer] : [deal.offer]));
    assert.ok(shown.every((offer) => offer.origin !== 'manual'));
  });

  it('keeps the same market deals for every period', async () => {
    const client = app.client();
    const today = (await client.get('/deals?type=market&period=today&limit=60')).body;
    assert.equal(today.total, market.total);
  });

  for (const query of ['period=evil', 'type=evil', 'page=0', 'limit=61']) {
    it(`answers 400 for ?${query}`, async () => {
      assert.equal((await app.client().get(`/deals?${query}`)).status, 400);
    });
  }
});

describe('periodStart', () => {
  it('uses Vietnam time', async () => {
    const { periodStart } = await import('../src/services/deals.service.js');
    // 18:00 UTC on 31 Dec 2025 is already 1 Jan 2026 in Vietnam.
    const moment = new Date('2025-12-31T18:00:00Z');
    assert.equal(periodStart('today', moment).toISOString(), '2025-12-31T17:00:00.000Z');
    assert.equal(periodStart('month', moment).toISOString(), '2025-12-31T17:00:00.000Z');
    assert.equal(periodStart('year', moment).toISOString(), '2025-12-31T17:00:00.000Z');
    assert.equal(periodStart('month', new Date('2026-03-15T00:00:00Z')).toISOString(), '2026-02-28T17:00:00.000Z');
  });
});
