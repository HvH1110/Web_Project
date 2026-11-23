import { isUnreliableImage } from '../config/image-hosts.js';
import { Brand } from '../models/brand.model.js';
import { Offer } from '../models/offer.model.js';
import { Product } from '../models/product.model.js';
import { toImageDtos } from '../utils/images.js';
import { searchTerms, termRegex } from '../utils/search.js';

// Covers per brand: products with pictures to show for the house. Up to
// PER_PIECE per signature piece, then up to GENERAL more for the house itself.
export const PER_PIECE = 3;
export const GENERAL = 6;
// Products looked at per signature piece, and for the rest.
const CANDIDATES = 60;
const CACHE_MS = 60 * 60 * 1000;

const COVER_FIELDS = 'brand ref name collection images';
const hasImages = { 'images.0': { $exists: true } };

// A product matching a signature piece the way GET /api/products?q= would find it.
function pieceMatch(name) {
  const terms = searchTerms(name);
  if (terms.length === 0) {
    return null;
  }
  return { $and: terms.map((term) => ({ $or: [{ name: termRegex(term) }, { collection: termRegex(term) }] })) };
}

function findCandidates(filter) {
  return Product.find(filter).sort({ createdAt: -1, _id: -1 }).limit(CANDIDATES).select(COVER_FIELDS).lean();
}

// A product's pictures: all of them, and those not on a host known to fail.
function withPictures(products) {
  return products.map((product) => {
    const pictures = toImageDtos(product.images);
    return { ...product, pictures, reliable: pictures.filter((picture) => !isUnreliableImage(picture.url)) };
  });
}

// The first product in `products` (newest first), not taken yet, with a picture
// in `listOf` it. Prefers two or more, as those come from a full product page.
function pickBest(products, taken, listOf) {
  const usable = products.filter((product) => !taken.has(String(product._id)) && listOf(product).length > 0);
  return usable.find((product) => listOf(product).length > 1) ?? usable[0] ?? null;
}

const reliableOf = (product) => product.reliable;
const picturesOf = (product) => product.pictures;

async function coversForBrand(brand) {
  const pieces = (brand.signatureProducts ?? [])
    .map(({ name }) => ({ name, match: pieceMatch(name) }))
    .filter(({ match }) => match);
  const [byPiece, others] = await Promise.all([
    Promise.all(
      pieces.map(({ match }) => findCandidates({ brand: brand.slug, ...hasImages, ...match }).then(withPictures)),
    ),
    findCandidates({ brand: brand.slug, ...hasImages }).then(withPictures),
  ]);

  // Each product is used once. Within a group, products with a picture on a
  // working host come first.
  const taken = new Set();
  const chosen = [];
  const pickInto = (group, max, products, nextOf) => {
    for (const listOf of [reliableOf, picturesOf]) {
      while (group.length < max) {
        const product = nextOf(products, listOf);
        if (!product) {
          break;
        }
        group.push(product);
        taken.add(String(product._id));
      }
    }
    return group;
  };
  pieces.forEach(({ name }, i) => {
    const group = pickInto([], PER_PIECE, byPiece[i], (products, listOf) => pickBest(products, taken, listOf));
    chosen.push(...group.map((product) => ({ product, piece: name })));
  });
  // General picks: one per collection first, then the newest.
  const collections = new Set();
  const general = [];
  pickInto(general, GENERAL, others, (products, listOf) => {
    const fresh = products.filter((product) => !collections.has(product.collection));
    const product = pickBest(fresh, taken, listOf);
    if (product) {
      collections.add(product.collection);
    }
    return product;
  });
  pickInto(general, GENERAL, others, (products, listOf) => pickBest(products, taken, listOf));
  chosen.push(...general.map((product) => ({ product, piece: null })));

  // Credit like the frontend's: the store the picture came from, else the brand.
  const offers = await Offer.find({ productId: { $in: chosen.map(({ product }) => product._id) } })
    .select('source.id source.name -_id')
    .lean();
  const storeNames = new Map(offers.map(({ source }) => [source?.id, source?.name]));
  return chosen.map(({ product, piece }) => {
    const image = product.reliable[0] ?? product.pictures[0];
    return {
      piece,
      brand: product.brand,
      ref: product.ref,
      name: product.name,
      collection: product.collection ?? null,
      image,
      credit: storeNames.get(image.sourceId) ?? brand.name,
    };
  });
}

async function buildCovers() {
  const brands = await Brand.find().select('slug name signatureProducts -_id').lean();
  const covers = await Promise.all(brands.map(coversForBrand));
  return new Map(brands.map((brand, i) => [brand.slug, covers[i]]));
}

let cached = null;

// Brand slug -> its covers (BrandCover in docs/API.md), rebuilt at most every
// CACHE_MS. Requests arriving during a build share it. Failures aren't kept.
export function loadBrandCovers(now = Date.now()) {
  if (cached && cached.expiresAt > now) {
    return cached.covers;
  }
  const entry = { expiresAt: now + CACHE_MS, covers: buildCovers() };
  cached = entry;
  entry.covers.catch(() => {
    if (cached === entry) {
      cached = null;
    }
  });
  return entry.covers;
}

export function clearBrandCoversCache() {
  cached = null;
}
