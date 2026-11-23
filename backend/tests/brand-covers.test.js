import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { startApp } from './helpers.js';

const app = await startApp();
after(() => app.stop());
// Imported only now: the app reads the environment on import (helpers.js).
const { clearBrandCoversCache, loadBrandCovers } = await import('../src/services/brand-covers.service.js');
const { toImageDtos } = await import('../src/utils/images.js');

const WORKING = 'https://assets.christiandior.com/img';
const DEAD = 'https://wwws.dior.com/img';
const image = (url, sourceId = 'dior-sg') => ({ url, sourceId, alt: 'alt' });
const photo = {
  url: 'https://thumb.wikimedia.org/x/1280px-y.jpg',
  alt: 'A boutique',
  credit: 'A photographer',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:y.jpg',
  license: 'CC0',
};
const day = (n) => new Date(Date.UTC(2026, 0, n));
const refsOf = (covers) => covers.map((cover) => cover.ref);
const piecesOf = (covers) => covers.map((cover) => [cover.piece, cover.ref]);

before(async () => {
  await app.db.collection('brands').insertMany([
    { slug: 'dior', name: 'Dior', category: 'fashion', order: 1, signatureProducts: [{ name: 'Lady Dior' }, { name: 'Saddle bag' }] },
    { slug: 'iwc', name: 'IWC Schaffhausen', category: 'watches', order: 2, signatureProducts: [{ name: 'Pilot' }], photo },
    { slug: 'chanel', name: 'Chanel', category: 'fashion', order: 3, signatureProducts: [{ name: 'Classic Flap Bag' }] },
  ]);
  const { insertedIds } = await app.db.collection('products').insertMany([
    { brand: 'dior', ref: 'D1', name: 'Lady Dior Bag', collection: 'Lady Dior', createdAt: day(9), images: [image(`${DEAD}/d1.jpg`), image(`${DEAD}/d1b.jpg`)] },
    { brand: 'dior', ref: 'D2', name: 'Lady Dior Pouch', collection: 'Lady Dior', createdAt: day(2), images: [image(`${WORKING}/d2.jpg`), image(`${WORKING}/d2b.jpg`)] },
    { brand: 'dior', ref: 'D3', name: 'Saddle Bag', collection: 'Saddle', createdAt: day(3), images: [image(`${WORKING}/d3 front view.jpg`, 'other')] },
    { brand: 'dior', ref: 'D4', name: 'Book Tote', collection: 'Book Tote', createdAt: day(8), images: [image('https://player.example.com/embed/1')] },
    { brand: 'dior', ref: 'D5', name: 'Bar Jacket', collection: 'Bar', createdAt: day(7), images: [image(`${DEAD}/d5.jpg`)] },
    { brand: 'dior', ref: 'D6', name: 'Saddle Pouch', collection: 'Saddle', createdAt: day(10), images: [] },
    ...Array.from({ length: 15 }, (_, i) => ({
      brand: 'iwc',
      ref: `I${i}`,
      name: `Pilot ${i}`,
      collection: 'Pilot',
      createdAt: day(i + 1),
      images: [image(`https://www.iwc.com/i${i}.png`, 'iwc')],
    })),
  ]);
  await app.db.collection('offers').insertOne({
    productId: insertedIds[1],
    source: { id: 'dior-sg', market: 'SG', name: 'Dior Singapore', type: 'official' },
    currency: 'SGD',
    price: 1,
    lastSeenAt: new Date(),
  });
});
beforeEach(() => clearBrandCoversCache());

describe('brand covers', () => {
  it('picks products per signature piece, then for the house, working hosts first', async () => {
    const { body } = await app.client().get('/brands/dior');
    // D2 before the newer D1 for "Lady Dior": D1's pictures are on a host known to
    // fail. D5's too, so it comes last. D4 has only a video, D6 no picture.
    assert.deepEqual(piecesOf(body.brand.covers), [
      ['Lady Dior', 'D2'],
      ['Lady Dior', 'D1'],
      ['Saddle bag', 'D3'],
      [null, 'D5'],
    ]);
  });

  it('gives each cover its product, first picture and credit', async () => {
    const { body } = await app.client().get('/brands');
    const [first, , second] = body.items.find((brand) => brand.slug === 'dior').covers;
    assert.deepEqual(first, {
      piece: 'Lady Dior',
      brand: 'dior',
      ref: 'D2',
      name: 'Lady Dior Pouch',
      collection: 'Lady Dior',
      image: { url: `${WORKING}/d2.jpg`, alt: 'alt', sourceId: 'dior-sg' },
      credit: 'Dior Singapore',
    });
    assert.equal(second.image.url, `${WORKING}/d3%20front%20view.jpg`);
    assert.equal(second.credit, 'Dior', 'no store for the picture: the brand');
  });

  it('gives at most 3 per piece and 6 more, and none for a brand without pictures', async () => {
    const { body } = await app.client().get('/brands');
    const covers = Object.fromEntries(body.items.map((brand) => [brand.slug, brand.covers]));
    assert.deepEqual(piecesOf(covers.iwc), [
      ['Pilot', 'I14'],
      ['Pilot', 'I13'],
      ['Pilot', 'I12'],
      ...[11, 10, 9, 8, 7, 6].map((i) => [null, `I${i}`]),
    ]);
    assert.deepEqual(covers.chanel, []);
  });

  it('keeps the covers for a while, shared between requests', async () => {
    const before = await loadBrandCovers();
    assert.equal(loadBrandCovers(), loadBrandCovers());
    await app.db.collection('products').insertOne({ brand: 'chanel', ref: 'C1', name: 'Classic Flap Bag', createdAt: day(1), images: [image('https://www.chanel.com/c1.jpg', 'chanel')] });
    assert.deepEqual((await loadBrandCovers()).get('chanel'), before.get('chanel'));
    clearBrandCoversCache();
    assert.deepEqual(refsOf((await loadBrandCovers()).get('chanel')), ['C1']);
    await app.db.collection('products').deleteOne({ ref: 'C1' });
  });
});

describe('brand photo', () => {
  it('gives the house photo with its credit and license, or null', async () => {
    const { body } = await app.client().get('/brands');
    const photos = Object.fromEntries(body.items.map((brand) => [brand.slug, brand.photo]));
    assert.deepEqual(photos.iwc, { ...photo, licenseUrl: null });
    assert.equal(photos.dior, null);
    assert.deepEqual((await app.client().get('/brands/iwc')).body.brand.photo, { ...photo, licenseUrl: null });
  });

  it('seeds a valid, credited photo for every house', async () => {
    const { brands } = await import('../scripts/data/brands.js');
    const { Brand } = await import('../src/models/brand.model.js');
    for (const brand of brands) {
      await new Brand(brand).validate();
      assert.ok(brand.photo.url.startsWith('https://thumb.wikimedia.org/'), brand.slug);
      assert.ok(brand.photo.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'), brand.slug);
      assert.match(brand.photo.license, /^(CC0|CC BY(-SA)? \d\.\d)$/, brand.slug);
      assert.ok(brand.photo.credit, brand.slug);
    }
  });
});

describe('product images', () => {
  it('serves only pictures, percent-encoded and without duplicates', async () => {
    const { body } = await app.client().get('/products?brand=dior&q=tote');
    assert.deepEqual(body.items[0].images, []);
    assert.deepEqual(
      toImageDtos([
        image('https://a.test/x y.jpg'),
        image('https://a.test/x%20y.jpg'),
        image('javascript:alert(1)'),
        image('not a url'),
        { url: 'https://player.vendor.test/v/1' },
        { url: 'https://cdn.test/embed/2' },
        { url: 'http://b.test/ok.png' },
        null,
      ]),
      [
        { url: 'https://a.test/x%20y.jpg', alt: 'alt', sourceId: 'dior-sg' },
        { url: 'http://b.test/ok.png', alt: null, sourceId: null },
      ],
    );
  });
});
