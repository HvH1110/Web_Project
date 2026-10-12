// Accent-insensitive search terms, so "panthere" finds "Panthère".
const ACCENTS = {
  a: 'aàáâãäå',
  c: 'cç',
  e: 'eèéêë',
  i: 'iìíîï',
  n: 'nñ',
  o: 'oòóôõöø',
  u: 'uùúûü',
  y: 'yýÿ',
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Words of a search query. Punctuation-only words (e.g. "&") are dropped.
export function searchTerms(query) {
  return query.split(/\s+/).filter((term) => /[\p{L}\p{N}]/u.test(term));
}

// Case- and accent-insensitive regex matching the term anywhere in a string.
export function termRegex(term) {
  const plain = term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const pattern = [...plain]
    .map((char) => (ACCENTS[char] ? `[${ACCENTS[char]}]` : escapeRegex(char)))
    .join('');
  return new RegExp(pattern, 'i');
}
