// Image hosts whose stored pictures mostly fail to load in a browser today
// (checked 2026-11-23: Dior's old hosts answer 403/503 or don't resolve, IWC's
// old URLs give 404). Covers (src/services/brand-covers.service.js) take
// pictures from these only after every other one, and search lists products
// whose pictures are all on these with the ones without a picture (see
// products.controller.js). Remove a host here once the
// crawler stores working URLs for it.
export const UNRELIABLE_IMAGE_HOSTS = new Set(['wwws.dior.com', 'www.dior.com', 'media.dior.com', 'www.iwc.com']);

export function isUnreliableImage(url) {
  try {
    return UNRELIABLE_IMAGE_HOSTS.has(new URL(url).hostname);
  } catch {
    return true;
  }
}

// Matches a URL on one of UNRELIABLE_IMAGE_HOSTS, for a MongoDB $regexMatch.
export const UNRELIABLE_IMAGE_URL = new RegExp(
  `^\\s*https?://(?:${[...UNRELIABLE_IMAGE_HOSTS].map((h) => h.replace(/\./g, '\\.')).join('|')})(?:[:/]|$)`,
  'i',
);
