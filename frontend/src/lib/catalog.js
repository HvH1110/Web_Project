import { formatDayUtc } from '@/lib/format'

// Helpers for catalog data from the API (shapes in ../docs/API.md).

export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name, A to Z' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
]
export const DEFAULT_SORT = 'newest'

export const productPath = (product) =>
  `/products/${product.brand}/${encodeURIComponent(product.ref)}`

// The price a product card leads with: the lowest VND price, or, when no
// exchange rate is known, the first offer that shows any price. `origin` and
// `lastSeenAt` say how and when it was read (see handChecked).
export function leadPrice(product) {
  const priced = product.offers.filter((o) => o.price != null)
  if (product.lowestPriceVnd != null) {
    const offer = priced.find((o) => o.priceVnd === product.lowestPriceVnd)
    return {
      value: product.lowestPriceVnd,
      currency: 'VND',
      market: offer?.market ?? null,
      origin: offer?.origin,
      lastSeenAt: offer?.lastSeenAt,
    }
  }
  const offer = priced[0]
  return offer
    ? {
        value: offer.price,
        currency: offer.currency,
        market: offer.market,
        origin: offer.origin,
        lastSeenAt: offer.lastSeenAt,
      }
    : null
}

// For a price a person read from the official site: it can be weeks old, so it
// always shows this rather than passing as a live price.
export const handChecked = (iso) => `Checked by hand on ${formatDayUtc(iso)}`

// Lowercase, accents removed: "Perlée" -> "perlee".
const fold = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// The brand collection a signature product belongs to, e.g. "Saddle bag" ->
// "Saddle", or undefined.
export function matchCollection(name, collections) {
  const target = fold(name)
  return collections.find(({ name: collection }) => {
    const c = fold(collection)
    return target === c || target.startsWith(`${c} `)
  })
}

// Product categories the crawler uses today; the API may add more.
export const PRODUCT_CATEGORIES = [
  { value: 'bags', label: 'Bags' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'watches', label: 'Watches' },
]

// Price filter shortcuts, in VND (null = open-ended).
export const PRICE_PRESETS = [
  { label: 'Under 50 million', min: null, max: 50_000_000 },
  { label: '50 to 200 million', min: 50_000_000, max: 200_000_000 },
  { label: '200 to 500 million', min: 200_000_000, max: 500_000_000 },
  { label: '500 million to 1 billion', min: 500_000_000, max: 1_000_000_000 },
  { label: 'Over 1 billion', min: 1_000_000_000, max: null },
]

// Images credit the store they came from (Image.sourceId = Offer.source.id),
// or the brand when no store has a current offer.
export const imageCredit = (product, image) =>
  product.offers.find((o) => o.source.id === image.sourceId)?.source.name ??
  product.brandName ??
  product.brand

export const NO_CURRENT_PRICE = 'No current online price'

// A house with no tracked products has no usable source (see ../docs/PRODUCT.md).
export const pricesUnavailable = (name) =>
  `${name}’s website doesn’t allow automated access, so we can’t collect its official prices, and we don’t work around that. For a price, please ask a ${name} boutique.`

// The stock flag only covers online stock: the boutique may still have the piece.
export const OUT_OF_STOCK = 'Out of stock online'

// Where every converted VND price comes from (fx_rates in ../docs/DATA.md).
export const RATE_SOURCE = 'Vietcombank’s sell rate'
