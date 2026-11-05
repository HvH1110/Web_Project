// Registry of archive (Wayback Machine) adapters for `npm run backfill`. An
// archive adapter is { id, name, type, market, prefixes, isProductUrl(url),
// parse(html, url), firstYear? }; parse returns the same item shape as a live
// source, firstYear is the oldest year to index when it isn't the default.
// The id is the source id its price points are filed under.
import { diorArchive } from './dior.js';
import { iwcArchive } from './iwc.js';
import { louisVuittonArchive } from './louisvuitton.js';

export const archives = [
  louisVuittonArchive({ market: 'SG', hosts: ['sg.louisvuitton.com', 'ap.louisvuitton.com'], locale: 'eng-sg', currency: 'SGD' }),
  louisVuittonArchive({ market: 'HK', hosts: ['hk.louisvuitton.com'], locale: 'eng-hk', currency: 'HKD' }),
  diorArchive({ market: 'SG', locale: 'en_sg', currency: 'SGD' }),
  diorArchive({ market: 'HK', locale: 'en_hk', currency: 'HKD' }),
  iwcArchive({ market: 'SG', path: 'sg/en', currency: 'SGD' }),
  iwcArchive({ market: 'HK', path: 'hk/en', currency: 'HKD' }),
];
