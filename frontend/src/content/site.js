// Site-wide copy. "Maison Prix" is a working name (see ../docs/PRODUCT.md):
// when it changes, change it here.
export const SITE = {
  name: 'Maison Prix',
  tagline: 'Know the price before you step inside.',
}

// Top-level pages from the product spec. Most are not built yet.
export const PAGES = [
  { to: '/search', label: 'Search' },
  { to: '/deals', label: 'Deals' },
  { to: '/community', label: 'Community' },
  { to: '/account', label: 'Account' },
]

export const MARKETS = [
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
]

// Footer disclaimer required by the spec's "Legal & ethics" section.
export const DISCLAIMER = [
  `${SITE.name} is an independent, non-commercial university project. It is not affiliated with, endorsed by or sponsored by any of the brands shown.`,
  'Prices are indicative. They are collected from official brand websites and authorized dealers, and may be out of date or differ in store. Always confirm the price with the official store before you buy.',
  'Brand names and logos are trademarks of their respective owners. Product images belong to their owners and are credited and linked to their source.',
]
