// Placeholder brand copy for the home page until the backend serves brands
// (see ../docs/API.md). Keep it to well-known facts and verify before launch.
// No prices here: the site only shows prices seen on official sources.

export const CATEGORIES = [
  { id: 'fashion', name: 'Fashion & Leather Goods' },
  { id: 'jewelry', name: 'Jewelry' },
  { id: 'watches', name: 'Watches' },
]

// `tone` picks the placeholder backdrop (see ImagePlaceholder).
export const BRANDS = [
  {
    slug: 'louis-vuitton',
    name: 'Louis Vuitton',
    category: 'fashion',
    founded: { year: 1854, place: 'Paris' },
    founder: 'Louis Vuitton',
    headquarters: 'Paris',
    group: 'LVMH',
    tone: 'sand',
    summary:
      'A Paris trunk-maker whose flat-topped, stackable luggage changed how people travelled. The Monogram canvas followed in 1896 and is still the house signature.',
    signatures: [
      { name: 'Speedy', kind: 'Handbag' },
      { name: 'Neverfull', kind: 'Tote' },
      { name: 'Keepall', kind: 'Travel bag' },
    ],
  },
  {
    slug: 'dior',
    name: 'Dior',
    category: 'fashion',
    founded: { year: 1946, place: 'Paris' },
    founder: 'Christian Dior',
    headquarters: 'Paris',
    group: 'LVMH',
    tone: 'stone',
    summary:
      "Christian Dior's first collection in 1947 was soon called the New Look: soft shoulders, a cinched waist and a full skirt. The house still runs from 30 Avenue Montaigne.",
    signatures: [
      { name: 'Lady Dior', kind: 'Handbag' },
      { name: 'Saddle', kind: 'Handbag' },
      { name: 'Book Tote', kind: 'Tote' },
    ],
  },
  {
    slug: 'chanel',
    name: 'Chanel',
    category: 'fashion',
    founded: { year: 1910, place: 'Paris' },
    founder: 'Gabrielle Chanel',
    headquarters: 'Paris',
    group: 'Privately owned',
    tone: 'graphite',
    summary:
      'Gabrielle Chanel opened a millinery at 21 rue Cambon in 1910 and built a house on ease and pared-back elegance. The quilted 2.55 bag arrived in February 1955.',
    signatures: [
      { name: '2.55', kind: 'Handbag' },
      { name: 'Classic 11.12', kind: 'Handbag' },
      { name: 'Boy Chanel', kind: 'Handbag' },
    ],
  },
  {
    slug: 'cartier',
    name: 'Cartier',
    category: 'jewelry',
    founded: { year: 1847, place: 'Paris' },
    founder: 'Louis-François Cartier',
    headquarters: 'Paris',
    group: 'Richemont',
    tone: 'taupe',
    summary:
      "Louis-François Cartier took over his master's Paris workshop in 1847. His grandsons made the name international, and the Love bracelet of 1969 became a modern icon.",
    signatures: [
      { name: 'Love', kind: 'Bracelet' },
      { name: 'Juste un Clou', kind: 'Bracelet' },
      { name: 'Tank', kind: 'Watch' },
    ],
  },
  {
    slug: 'van-cleef-arpels',
    name: 'Van Cleef & Arpels',
    category: 'jewelry',
    founded: { year: 1906, place: 'Paris' },
    founder: 'Alfred Van Cleef & Salomon Arpels',
    headquarters: 'Paris',
    group: 'Richemont',
    tone: 'stone',
    summary:
      'Born of a marriage between two families of gem dealers, the house opened on Place Vendôme in 1906. The four-leaf Alhambra motif dates from 1968.',
    signatures: [
      { name: 'Vintage Alhambra', kind: 'Necklace' },
      { name: 'Perlée', kind: 'Bracelet' },
      { name: 'Frivole', kind: 'Earrings' },
    ],
  },
  {
    slug: 'rolex',
    name: 'Rolex',
    category: 'watches',
    founded: { year: 1905, place: 'London' },
    founder: 'Hans Wilsdorf',
    headquarters: 'Geneva',
    group: 'Hans Wilsdorf Foundation',
    tone: 'graphite',
    summary:
      'Hans Wilsdorf founded the company in London in 1905 and moved it to Geneva in 1919. The Oyster of 1926 was one of the first waterproof wristwatches.',
    signatures: [
      { name: 'Submariner', kind: 'Dive watch' },
      { name: 'Cosmograph Daytona', kind: 'Chronograph' },
      { name: 'Datejust', kind: 'Watch' },
    ],
  },
  {
    slug: 'omega',
    name: 'Omega',
    category: 'watches',
    founded: { year: 1848, place: 'La Chaux-de-Fonds' },
    founder: 'Louis Brandt',
    headquarters: 'Biel/Bienne',
    group: 'Swatch Group',
    tone: 'ink',
    summary:
      'Louis Brandt began assembling watches in La Chaux-de-Fonds in 1848. The company took its name from its Omega calibre of 1894 and became known for precision timing.',
    signatures: [
      { name: 'Speedmaster', kind: 'Chronograph' },
      { name: 'Seamaster', kind: 'Dive watch' },
      { name: 'Constellation', kind: 'Watch' },
    ],
  },
  {
    slug: 'iwc',
    name: 'IWC Schaffhausen',
    category: 'watches',
    founded: { year: 1868, place: 'Schaffhausen' },
    founder: 'Florentine Ariosto Jones',
    headquarters: 'Schaffhausen',
    group: 'Richemont',
    tone: 'graphite',
    summary:
      'An American watchmaker, Florentine Ariosto Jones, set up the International Watch Company on the Rhine in 1868 to combine Swiss craft with modern production.',
    signatures: [
      { name: 'Portugieser', kind: 'Watch' },
      { name: 'Big Pilot', kind: 'Pilot watch' },
      { name: 'Portofino', kind: 'Watch' },
    ],
  },
]

export const brandsIn = (categoryId) => BRANDS.filter((b) => b.category === categoryId)
