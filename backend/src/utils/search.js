// Accent-insensitive search terms, so "panthere" finds "Panthère" and "dong ho"
// finds "đồng hồ". Covers French and Vietnamese letters.
const ACCENTS = {
  a: 'aàáâãäåảạăằắẳẵặầấẩẫậ',
  c: 'cç',
  d: 'dđ',
  e: 'eèéêëẻẽẹềếểễệ',
  i: 'iìíîïỉĩị',
  n: 'nñ',
  o: 'oòóôõöøỏọồốổỗộơờớởỡợ',
  u: 'uùúûüủũụưừứửữự',
  y: 'yýÿỳỷỹỵ',
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
    .toLowerCase()
    // "đ" has no decomposed form, so stripping accents leaves it as is.
    .replace(/đ/g, 'd');
  const pattern = [...plain]
    .map((char) => (ACCENTS[char] ? `[${ACCENTS[char]}]` : escapeRegex(char)))
    .join('');
  return new RegExp(pattern, 'i');
}
