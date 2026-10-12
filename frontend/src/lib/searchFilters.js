// Search page state lives in the URL, using the same names as the API's
// GET /api/products params, e.g. /search?q=sub&brand=rolex,omega&market=VN.
import { BRANDS } from '@/content/brands'
import { MARKETS } from '@/content/site'
import { DEFAULT_SORT, PRODUCT_CATEGORIES } from '@/lib/catalog'

const LISTS = ['brand', 'category', 'collection', 'market']
const list = (value) => (value ? value.split(',').filter(Boolean) : [])

export function readFilters(params) {
  return {
    q: params.get('q') ?? '',
    ...Object.fromEntries(LISTS.map((key) => [key, list(params.get(key))])),
    minPriceVnd: params.get('minPriceVnd') ?? '',
    maxPriceVnd: params.get('maxPriceVnd') ?? '',
    sort: params.get('sort') ?? DEFAULT_SORT,
  }
}

// `params` with `patch` applied. Empty values and the default sort are
// removed, so URLs stay short.
export function withFilters(params, patch) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(patch)) {
    const text = Array.isArray(value) ? value.join(',') : String(value ?? '')
    if (text && !(key === 'sort' && text === DEFAULT_SORT)) next.set(key, text)
    else next.delete(key)
  }
  return next
}

// Query for useProducts. The default sort is left to the API, and a price
// range written the wrong way round (by hand, in the URL) is swapped.
export function toProductQuery({ sort, minPriceVnd, maxPriceVnd, ...filters }) {
  const reversed = minPriceVnd && maxPriceVnd && Number(minPriceVnd) > Number(maxPriceVnd)
  return {
    ...filters,
    minPriceVnd: reversed ? maxPriceVnd : minPriceVnd,
    maxPriceVnd: reversed ? minPriceVnd : maxPriceVnd,
    sort: sort === DEFAULT_SORT ? '' : sort,
  }
}

// Number of filters set, not counting the text search or sort.
export const countFilters = (f) =>
  LISTS.reduce((n, key) => n + f[key].length, 0) + (f.minPriceVnd || f.maxPriceVnd ? 1 : 0)

const millions = (vnd) => `${(Number(vnd) / 1e6).toLocaleString('en-US')} million`

export function priceRangeLabel(min, max) {
  if (min && max) {
    const [lo, hi] = [Number(min), Number(max)].sort((a, b) => a - b)
    return `${millions(lo)} to ${millions(hi)} VND`
  }
  if (min) return `From ${millions(min)} VND`
  return `Up to ${millions(max)} VND`
}

// Removable chips for every active filter: { key, label, patch }.
export function activeFilterChips(f) {
  const nameOf = (items, value, field = 'label') =>
    items.find((item) => item.value === value)?.[field] ?? value
  return [
    f.q && { key: 'q', label: `“${f.q}”`, patch: { q: '' } },
    ...f.brand.map((slug) => ({
      key: `brand-${slug}`,
      label: BRANDS.find((b) => b.slug === slug)?.name ?? slug,
      patch: { brand: f.brand.filter((s) => s !== slug), collection: [] },
    })),
    ...f.collection.map((name) => ({
      key: `collection-${name}`,
      label: name,
      patch: { collection: f.collection.filter((c) => c !== name) },
    })),
    ...f.category.map((value) => ({
      key: `category-${value}`,
      label: nameOf(PRODUCT_CATEGORIES, value),
      patch: { category: f.category.filter((c) => c !== value) },
    })),
    ...f.market.map((code) => ({
      key: `market-${code}`,
      label: `Sold in ${MARKETS.find((m) => m.code === code)?.name ?? code}`,
      patch: { market: f.market.filter((m) => m !== code) },
    })),
    (f.minPriceVnd || f.maxPriceVnd) && {
      key: 'price',
      label: priceRangeLabel(f.minPriceVnd, f.maxPriceVnd),
      patch: { minPriceVnd: '', maxPriceVnd: '' },
    },
  ].filter(Boolean)
}

// Patch that clears every filter and the text search, keeping the sort.
export const CLEAR_ALL = Object.fromEntries(
  ['q', ...LISTS, 'minPriceVnd', 'maxPriceVnd'].map((key) => [key, '']),
)
