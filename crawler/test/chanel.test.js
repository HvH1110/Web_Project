import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archives } from '../src/archives/index.js';

const source = (id) => archives.find((a) => a.id === id);
const IMG = 'https://www.chanel.com/images//t_one///q_auto:good,f_auto,fl_lossy,dpr_1.1';

// A product page as archived, cut down to what the adapter reads (2021 to 2024
// pages are laid out the same way).
function page({ ld, crumbs = [], price, code, pictures = [], extra = '' }) {
  const priceBlock = price
    ? `<p class="product-details__price" data-test="lblProductPrice_EditProduct">
        ${price}<a class="disclaimer-indicator" id="priceAnchorId-${code}" href="#disclaimer-text">*</a>
      </p>`
    : '';
  const crumbList = {
    '@context': 'http://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, id], i) => ({ '@type': 'ListItem', position: i + 1, item: { '@id': id, name } })),
  };
  return `<html><head><title>x | CHANEL</title>
    <script type="application/ld+json">${ld}</script>
    <script type="application/ld+json">${JSON.stringify(crumbList)}</script>
    </head><body>
    <div class="product-details">${priceBlock}</div>
    <div class="sticky-bar">${priceBlock}</div>
    ${pictures.map((src) => `<img src="${src}">`).join('\n')}
    ${extra}
    </body></html>`;
}

const flapBag = {
  code: 'A92991B0340394305',
  url: 'https://www.chanel.com/sg/fashion/p/A92991B0340394305/large-flap-bag-with-top-handle-grained-calfskin-black-metal/',
  ld: JSON.stringify({
    '@context': 'http://schema.org',
    '@type': 'Product',
    name: 'Large Flap Bag With Top Handle',
    color: 'Black',
    material: 'Grained Calfskin & Black Metal',
    image: `${IMG}/w_620/large-flap-bag-black-packshot-default-a92991b0340394305-8826165755934.jpg`,
    description: 'Grained Calfskin & Black Metal, Black',
    sku: 'A92991B0340394305',
  }),
  crumbs: [
    ['Global Home Page', '/sg/'],
    ['Fashion', '/sg/fashion/'],
    ['Handbags', '/sg/fashion/handbags/c/1x1x1/'],
    ['Flap Bags', '/sg/fashion/handbags/c/1x1x1x1/flap-bags/'],
  ],
  pictures: [
    `${IMG}/w_620/large-flap-bag-black-packshot-default-a92991b0340394305-8826165755934.jpg`,
    `${IMG}/w_1240/large-flap-bag-black-packshot-default-a92991b0340394305-8826165755934.jpg`,
    `${IMG}/w_620/large-flap-bag-black-packshot-alternative-a92991b0340394305-8826163822622.jpg`,
    `${IMG}/w_620/large-flap-bag-black-packshot-other-a92991b0340394305-8826162216990.jpg`,
    // A related product further down the page.
    `${IMG}/w_620/flap-bag-black-packshot-default-as2215b0458694305-8826111111111.jpg`,
  ],
};

test('Chanel: a bag page gives its printed price, gallery, category and family', () => {
  const html = page({ ...flapBag, price: 'SGD 6,920' });
  const item = source('chanel-sg').parse(html, flapBag.url);
  assert.equal(item.brand, 'chanel');
  assert.equal(item.ref, 'A92991B0340394305');
  assert.equal(item.name, 'Large Flap Bag With Top Handle, Grained Calfskin & Black Metal, Black');
  assert.equal(item.category, 'bags');
  assert.equal(item.collection, 'Flap Bags');
  assert.deepEqual(item.specs, { Material: 'Grained Calfskin & Black Metal', Colour: 'Black' });
  assert.equal(item.currency, 'SGD');
  assert.equal(item.price, 6920);
  assert.equal(item.lang, undefined);
  const files = item.images.map((i) => i.url.split('/').at(-1));
  assert.deepEqual(files, [
    'large-flap-bag-black-packshot-default-a92991b0340394305-8826165755934.jpg',
    'large-flap-bag-black-packshot-alternative-a92991b0340394305-8826163822622.jpg',
    'large-flap-bag-black-packshot-other-a92991b0340394305-8826162216990.jpg',
  ]);
  assert.match(item.images[0].url, /\/w_1240\//, 'the 1240 px picture when the page lists it');
});

test('Chanel: a page with no price still gives the product, with price null', () => {
  const item = source('chanel-sg').parse(page(flapBag), flapBag.url);
  assert.equal(item.price, null);
  assert.equal(item.images.length, 3);
  assert.equal(source('chanel-sg').keepWithoutPrice, true);
});

test('Chanel: watch Offer price, JSON-LD with a stray comma, collection crumb', () => {
  const code = 'H6672';
  const url = 'https://www.chanel.com/sg/watches/p/H6672/monsieur-watch/';
  const ld = `{ "@context": "http://schema.org", "@type": "Product", "name": "Monsieur Watch", "material": "White gold",
    "description": "White gold, opaline dial with jumping hour and 240° retrograde minute", "sku": "H6672", ,
    "offers" : { "@type": "Offer", "priceCurrency": "SGD", "price": "69500.0" } }`;
  const crumbs = [
    ['Watches', '/sg/watches/'],
    ['MONSIEUR', '/sg/watches/monsieur/c/4x2x6/'],
    ['Monsieur Gold', '/sg/watches/monsieur/c/4x2x6x1/monsieur-gold/'],
  ];
  const item = source('chanel-sg').parse(page({ ld, crumbs, code, price: 'SGD 69,500' }), url);
  assert.equal(item.name, 'Monsieur Watch, White gold');
  assert.equal(item.category, 'watches');
  assert.equal(item.collection, 'MONSIEUR');
  assert.equal(item.price, 69500);
});

test('Chanel: two different prices for the product give no price', () => {
  const ld = flapBag.ld.replace('"sku"', '"offers":{"@type":"Offer","priceCurrency":"SGD","price":"7000"},"sku"');
  const item = source('chanel-sg').parse(page({ ...flapBag, ld, price: 'SGD 6,920' }), flapBag.url);
  assert.equal(item.price, null);
});

test('Chanel: a price in another currency is an error, not a price', () => {
  assert.throws(() => source('chanel-sg').parse(page({ ...flapBag, price: 'HKD 52,000' }), flapBag.url), /expected SGD/);
});

test('Chanel: Vietnam pages give VND prices and details marked as Vietnamese', () => {
  const code = 'J11334';
  const url = 'https://www.chanel.com/vn/trang-suc/p/J11334/nhan-camelia-precieux/';
  const ld = JSON.stringify({ '@type': 'Product', name: 'Nhẫn Camélia Précieux', material: 'Vàng trắng', description: 'Vàng trắng 18K, đính kim cương', sku: code });
  const crumbs = [
    ['Trang sức', '/vn/trang-suc/'],
    ['Camélia', '/vn/trang-suc/camelia/c/3x2x1/'],
    ['Nhẫn', '/vn/trang-suc/nhan/c/3x1x2/'],
  ];
  const stones = `<script type="application/ld+json">{ "@type": "ImageObject", "contentUrl": "/_ui/responsive/theme-onechanel/assets/media/diamond.png",
    "description": "Đính 32 viên kim cương|Đính 1 viên kim cương", "name": "Kim cương" }</script>`;
  const item = source('chanel-vn').parse(page({ ld, crumbs, code, price: 'VND 464 470 000', extra: stones }), url);
  assert.equal(item.currency, 'VND');
  assert.equal(item.price, 464470000);
  assert.equal(item.category, 'jewelry');
  assert.equal(item.collection, 'Camélia');
  assert.equal(item.lang, 'vi');
  assert.equal(item.specs['Kim cương'], 'Đính 32 viên kim cương; Đính 1 viên kim cương');
});

test('Chanel: only bags, ready-to-wear, jewellery and watches pages are product pages', () => {
  const sg = source('chanel-sg');
  assert.ok(sg.isProductUrl('https://www.chanel.com/sg/fine-jewellery/p/J10571/coco-crush-ring/'));
  assert.ok(!sg.isProductUrl('https://www.chanel.com/sg/fragrance/p/126520/chance-eau-de-parfum/'));
  assert.ok(!sg.isProductUrl('https://www.chanel.com/hk-en/fashion/p/A1/x/'), 'another market');
  assert.ok(!source('chanel-hk').isProductUrl('https://www.chanel.com/hk-en/fashion/p/23N-COMMERCIAL-023/look-23/'), 'a runway look');
  assert.ok(!source('chanel-vn').isProductUrl('https://www.chanel.com/vn/nuoc-hoa/p/126520/chance/'));
  assert.equal(sg.productKey('https://www.chanel.com/sg/fashion/p/a92991b0340394305/x/'), 'A92991B0340394305');
});

test('Chanel: a page whose JSON-LD is another product gives nothing', () => {
  const ld = flapBag.ld.replace('"sku":"A92991B0340394305"', '"sku":"AS2215B0458694305"');
  assert.equal(source('chanel-sg').parse(page({ ...flapBag, ld }), flapBag.url), null);
});

test('Dior: jewellery without a colour gets its gallery pictures', () => {
  const pic = (file) => `<img src="https://assets.christiandior.com/is/image/diorprod/${file}?$default_GH$&crop=1,2,3,4">`;
  const ld = JSON.stringify({ '@type': 'Product', name: 'Rose des Vents Ring', sku: 'JRDV95205_0000', offers: { priceCurrency: 'SGD', price: 5150 } });
  const crumbs = JSON.stringify({ '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'Fine Jewellery' }, { position: 2, name: 'Ring' }] });
  const html = `<script type="application/ld+json">${ld}</script><script type="application/ld+json">${crumbs}</script>
    ${pic('JRDV95205_E01')}${pic('JRDV95205_E06')}${pic('JRDV95205_E01')}${pic('JRDV95206_E01')}`;
  const item = source('dior-sg').parse(html, 'https://www.dior.com/en_sg/fashion/products/JRDV95205_0000');
  assert.deepEqual(item.images.map((i) => new URL(i.url).pathname), ['/is/image/diorprod/JRDV95205_E01', '/is/image/diorprod/JRDV95205_E06']);
});
