// The houses the site covers, for navigation and layout: menu, footer, home
// sections and previous/next links render from this without waiting for the
// API. Everything editorial (history, facts, signature pieces) comes from
// GET /api/brands. Slugs must match the API's. No prices here: the site only
// shows prices seen on official sources.

// Brand categories. `ground` is each category's section colour, used by the
// home page chapters and the brand page masthead: paper, ivory, then ink.
export const CATEGORIES = [
  { id: 'fashion', name: 'Fashion & Leather Goods', ground: 'bg-background' },
  { id: 'jewelry', name: 'Jewelry', ground: 'bg-secondary' },
  { id: 'watches', name: 'Watches', ground: 'dark bg-background text-foreground' },
]

// In home page order. `tone` picks the placeholder backdrop (see ImagePlaceholder).
export const BRANDS = [
  { slug: 'louis-vuitton', name: 'Louis Vuitton', category: 'fashion', tone: 'sand' },
  { slug: 'dior', name: 'Dior', category: 'fashion', tone: 'stone' },
  { slug: 'chanel', name: 'Chanel', category: 'fashion', tone: 'graphite' },
  { slug: 'cartier', name: 'Cartier', category: 'jewelry', tone: 'taupe' },
  { slug: 'van-cleef-arpels', name: 'Van Cleef & Arpels', category: 'jewelry', tone: 'stone' },
  { slug: 'rolex', name: 'Rolex', category: 'watches', tone: 'graphite' },
  { slug: 'omega', name: 'Omega', category: 'watches', tone: 'ink' },
  { slug: 'iwc', name: 'IWC Schaffhausen', category: 'watches', tone: 'graphite' },
]

export const brandsIn = (categoryId) => BRANDS.filter((b) => b.category === categoryId)
