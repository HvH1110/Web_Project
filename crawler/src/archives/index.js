// Registry of archive (Wayback Machine) adapters for `npm run backfill`. An
// archive adapter is { id, name, type, market, prefixes, isProductUrl(url),
// parse(html, url) }; parse returns the same item shape as a live source.
// The id is the source id its price points are filed under.
import { diorArchive } from './dior.js';
import { iwcArchive } from './iwc.js';
import { louisVuittonArchive } from './louisvuitton.js';

export const archives = [
  louisVuittonArchive({ market: 'SG', host: 'sg.louisvuitton.com', locale: 'eng-sg', currency: 'SGD' }),
  louisVuittonArchive({ market: 'HK', host: 'hk.louisvuitton.com', locale: 'eng-hk', currency: 'HKD' }),
  diorArchive({ market: 'SG', locale: 'en_sg', currency: 'SGD' }),
  diorArchive({ market: 'HK', locale: 'en_hk', currency: 'HKD' }),
  iwcArchive({ market: 'SG', path: 'sg/en', currency: 'SGD' }),
  iwcArchive({ market: 'HK', path: 'hk/en', currency: 'HKD' }),
];
