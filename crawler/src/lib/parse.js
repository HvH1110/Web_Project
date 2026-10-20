// Small helpers shared by the source adapters.

// All schema.org objects of a given @type in the page's JSON-LD, including
// those nested in @graph arrays.
export function jsonLdOfType($, type) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if ([].concat(node['@type'] ?? []).includes(type)) found.push(node);
    if (node['@graph']) visit(node['@graph']);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });
  return found;
}

// "S$ 580", "HK$ 3,200", "VND 11,400,000", "863260000" -> number.
// Assumes English formatting (comma thousands, dot decimals). Returns null
// when there is no number at all.
export function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const digits = String(value).replace(/[^\d.]/g, '').replace(/^\.+|\.+$/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

// Collapses whitespace; returns undefined for empty strings.
export function clean(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t || undefined;
}

// "WATER RESISTANCE" -> "Water resistance"
export function labelCase(label) {
  const t = clean(label) ?? '';
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
}

// schema.org availability URL -> true / false / null.
export function ldAvailability(value) {
  if (!value) return null;
  if (/InStock|LimitedAvailability|OnlineOnly|InStoreOnly/i.test(value)) return true;
  if (/OutOfStock|SoldOut|Discontinued/i.test(value)) return false;
  return null;
}
