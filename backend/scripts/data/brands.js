// DRAFT, NOT YET REVIEWED.
// Editorial text for the 8 brands, written from well-known public facts.
// Check every name, date and claim before publishing. After reviewing a brand,
// set its contentStatus to 'reviewed' and re-run `npm run seed:brands`.
//
// This file is the source of truth for the `brands` collection: the seed script
// overwrites the database with it. `city` / `country` are where the house was
// founded. `signatureProducts[].year` is the year introduced (null when not stated).

export const brands = [
  {
    slug: 'louis-vuitton',
    name: 'Louis Vuitton',
    category: 'fashion',
    order: 1,
    foundedYear: 1854,
    founder: 'Louis Vuitton',
    city: 'Paris',
    country: 'France',
    history:
      'Louis Vuitton, a trunk-maker trained in Paris, opened his own workshop on Rue Neuve-des-Capucines in 1854. ' +
      'His flat-topped, lightweight trunks suited the new age of rail and steamship travel, and in 1859 he moved ' +
      'production to Asnières, just outside Paris, where the house still makes special orders. His son Georges ' +
      'created the Damier canvas in 1888 and the Monogram canvas in 1896, partly to stop counterfeiting. Louis ' +
      'Vuitton has been part of LVMH since the group was formed in 1987.',
    signatureProducts: [
      {
        name: 'Damier canvas',
        year: 1888,
        description: 'Checkerboard canvas, one of the first patterns the house used to set its trunks apart.',
      },
      {
        name: 'Monogram canvas',
        year: 1896,
        description: 'The LV initials with flowers and quatrefoils, designed by Georges Vuitton in tribute to his father.',
      },
      {
        name: 'Keepall',
        year: 1930,
        description: 'Soft travel holdall, a lighter companion to the hard trunk.',
      },
      {
        name: 'Speedy',
        year: 1930,
        description: 'Compact city version of the Keepall, first sold as the Express.',
      },
      {
        name: 'Neverfull',
        year: 2007,
        description: 'Roomy tote with side laces that cinch its shape.',
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'dior',
    name: 'Dior',
    category: 'fashion',
    order: 2,
    foundedYear: 1946,
    founder: 'Christian Dior',
    city: 'Paris',
    country: 'France',
    history:
      'Christian Dior opened his couture house at 30 Avenue Montaigne, Paris, in December 1946, backed by the ' +
      'textile industrialist Marcel Boussac. His first collection, in February 1947, was hailed as the "New Look" ' +
      "by Harper's Bazaar editor Carmel Snow: soft shoulders, cinched waists and full skirts that redefined " +
      'post-war fashion. After Dior died in 1957, the 21-year-old Yves Saint Laurent took over, the first of a ' +
      'line of creative directors. The house is part of LVMH.',
    signatureProducts: [
      {
        name: 'Bar jacket',
        year: 1947,
        description: 'Ivory shantung jacket with a padded peplum, the emblem of the New Look.',
      },
      {
        name: 'Lady Dior',
        year: 1995,
        description: 'Structured bag with Cannage top-stitching and D.I.O.R. charms, named after Diana, Princess of Wales.',
      },
      {
        name: 'Saddle bag',
        year: 1999,
        description: 'Saddle-shaped shoulder bag designed by John Galliano.',
      },
      {
        name: 'Book Tote',
        year: null,
        description: 'Embroidered canvas tote introduced by Maria Grazia Chiuri.',
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'chanel',
    name: 'Chanel',
    category: 'fashion',
    order: 3,
    foundedYear: 1910,
    founder: 'Gabrielle "Coco" Chanel',
    city: 'Paris',
    country: 'France',
    history:
      'Gabrielle "Coco" Chanel opened a millinery shop at 21 Rue Cambon, Paris, in 1910, followed by boutiques in ' +
      'Deauville and Biarritz. Jersey dresses, the little black dress and the No. 5 perfume made relaxed, practical ' +
      'elegance the mark of the house, which settled at 31 Rue Cambon, where it still is. Chanel closed her couture ' +
      'house at the start of the Second World War and returned in 1954. Karl Lagerfeld led the house from 1983 ' +
      'until his death in 2019. Chanel is privately owned by the Wertheimer family.',
    signatureProducts: [
      {
        name: 'Chanel No. 5',
        year: 1921,
        description: 'Perfume created with the perfumer Ernest Beaux.',
      },
      {
        name: 'Tweed jacket',
        year: null,
        description: 'Collarless, braid-trimmed jacket that defined Chanel after her return in the 1950s.',
      },
      {
        name: '2.55 bag',
        year: 1955,
        description: 'Quilted shoulder bag on a chain strap, named after its launch date, February 1955.',
      },
      {
        name: 'Two-tone slingback',
        year: 1957,
        description: 'Beige shoe with a black toe cap.',
      },
      {
        name: 'Classic Flap Bag (11.12)',
        year: null,
        description: "Karl Lagerfeld's update of the 2.55, with the interlocking CC clasp.",
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'cartier',
    name: 'Cartier',
    category: 'jewelry',
    order: 4,
    foundedYear: 1847,
    founder: 'Louis-François Cartier',
    city: 'Paris',
    country: 'France',
    history:
      'Louis-François Cartier took over the Paris jewellery workshop of his master, Adolphe Picard, in 1847. His ' +
      'grandsons Louis, Pierre and Jacques took the house abroad, with branches in London (1902) and New York ' +
      '(1909), and Cartier supplied royal courts across Europe. Louis Cartier was also an early maker of ' +
      'wristwatches, with the Santos (1904) and the Tank (1917). Cartier is part of the Swiss group Richemont.',
    signatureProducts: [
      {
        name: 'Santos',
        year: 1904,
        description: 'Square wristwatch made for the Brazilian aviator Alberto Santos-Dumont.',
      },
      {
        name: 'Tank',
        year: 1917,
        description: 'Rectangular watch inspired by the outline of First World War tanks.',
      },
      {
        name: 'Trinity',
        year: 1924,
        description: 'Ring of three interlaced bands in white, yellow and rose gold.',
      },
      {
        name: 'Love',
        year: 1969,
        description: 'Oval bracelet locked with a small screwdriver, designed by Aldo Cipullo.',
      },
      {
        name: 'Juste un Clou',
        year: 1971,
        description: 'Bracelet in the shape of a bent nail, also designed by Aldo Cipullo.',
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'van-cleef-arpels',
    name: 'Van Cleef & Arpels',
    category: 'jewelry',
    order: 5,
    foundedYear: 1906,
    founder: 'Alfred Van Cleef and Charles Arpels',
    city: 'Paris',
    country: 'France',
    history:
      'The house grew out of the marriage of Alfred Van Cleef, son of a stonecutter, and Estelle Arpels, daughter ' +
      'of a precious-stone dealer. In 1906 Alfred and Estelle\'s brother Charles opened the first boutique at ' +
      '22 Place Vendôme in Paris; her brothers Julien and Louis later joined them. In 1933 the house patented ' +
      'the Mystery Set, a way of setting stones with no visible prongs, and in 1968 it created the Alhambra, ' +
      'inspired by the four-leaf clover. Van Cleef & Arpels is part of Richemont.',
    signatureProducts: [
      {
        name: 'Mystery Set',
        year: 1933,
        description: 'Patented setting in which no prongs are visible between the rubies or sapphires.',
      },
      {
        name: 'Zip necklace',
        year: null,
        description: 'Necklace that unzips into a bracelet, conceived in the 1930s and first made in the 1950s.',
      },
      {
        name: 'Alhambra',
        year: 1968,
        description: 'Four-leaf-clover motif framed by a beaded gold border.',
      },
      {
        name: 'Perlée',
        year: null,
        description: 'Gold jewellery edged with rows of small gold beads.',
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'rolex',
    name: 'Rolex',
    category: 'watches',
    order: 6,
    foundedYear: 1905,
    founder: 'Hans Wilsdorf and Alfred Davis',
    city: 'London',
    country: 'United Kingdom',
    history:
      'Hans Wilsdorf and his brother-in-law Alfred Davis founded Wilsdorf & Davis in London in 1905 to sell ' +
      'Swiss-made watches. Wilsdorf registered the Rolex name in 1908 and moved the company to Geneva in 1919. ' +
      'Rolex introduced the waterproof Oyster case in 1926 and the Perpetual self-winding rotor in 1931. ' +
      'The company is owned by the Hans Wilsdorf Foundation, set up by its founder.',
    signatureProducts: [
      {
        name: 'Datejust',
        year: 1945,
        description: 'Shows the date in a window on the dial; launched for the brand\'s 40th anniversary.',
      },
      {
        name: 'Submariner',
        year: 1953,
        description: 'Divers\' watch, waterproof to 100 metres at launch.',
      },
      {
        name: 'GMT-Master',
        year: 1955,
        description: 'Shows two time zones at once; developed with Pan Am pilots in mind.',
      },
      {
        name: 'Day-Date',
        year: 1956,
        description: 'Shows the day of the week spelled out in full as well as the date.',
      },
      {
        name: 'Cosmograph Daytona',
        year: 1963,
        description: 'Chronograph for motor racing, named after Daytona Beach in Florida.',
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'omega',
    name: 'Omega',
    category: 'watches',
    order: 7,
    foundedYear: 1848,
    founder: 'Louis Brandt',
    city: 'La Chaux-de-Fonds',
    country: 'Switzerland',
    history:
      'Louis Brandt began assembling pocket watches in La Chaux-de-Fonds in 1848. His sons Louis-Paul and César ' +
      'moved the business to Biel/Bienne in 1880, and their Omega calibre of 1894 was so successful that the ' +
      'company took its name in 1903. Omega has often been the official timekeeper of the Olympic Games since ' +
      '1932, and a Speedmaster was worn on the Moon during Apollo 11 in 1969. Omega is part of the Swatch Group.',
    signatureProducts: [
      {
        name: 'Seamaster',
        year: 1948,
        description: 'Water-resistant line launched for the company\'s centenary.',
      },
      {
        name: 'Constellation',
        year: 1952,
        description: 'Line of chronometer-certified dress watches.',
      },
      {
        name: 'Speedmaster',
        year: 1957,
        description: 'Chronograph qualified by NASA in 1965 and worn on the Moon in 1969.',
      },
      {
        name: 'Seamaster Diver 300M',
        year: 1993,
        description: 'Divers\' watch worn by James Bond since GoldenEye (1995).',
      },
    ],
    contentStatus: 'draft',
  },
  {
    slug: 'iwc',
    name: 'IWC Schaffhausen',
    category: 'watches',
    order: 8,
    foundedYear: 1868,
    founder: 'Florentine Ariosto Jones',
    city: 'Schaffhausen',
    country: 'Switzerland',
    history:
      'The American watchmaker Florentine Ariosto Jones founded the International Watch Company in Schaffhausen ' +
      'in 1868, aiming to combine Swiss craftsmanship with American production methods. He chose the town for ' +
      'the hydropower of the Rhine. After Jones returned to America, the Rauschenbach family of Schaffhausen took ' +
      'over the company. IWC is known for its pilot\'s watches and the Portugieser, and is part of Richemont.',
    signatureProducts: [
      {
        name: 'Portugieser',
        year: 1939,
        description: 'Large wristwatch with a pocket-watch movement, ordered by two Portuguese businessmen.',
      },
      {
        name: 'Big Pilot\'s Watch',
        year: 1940,
        description: '55 mm observation watch made for pilots.',
      },
      {
        name: 'Mark 11',
        year: 1948,
        description: 'Navigator\'s watch made for the British Royal Air Force.',
      },
      {
        name: 'Ingenieur',
        year: 1955,
        description: 'Soft-iron inner case protects the movement from magnetic fields.',
      },
    ],
    contentStatus: 'draft',
  },
];
