// Which queued snapshots the backfill fetches, and in what order. The queue
// holds one capture per page per quarter, far more than the archive lets us
// read (about 1,400 pages a night against 190,000 queued for Louis Vuitton in
// November 2026). A price history needs a price per product over time, so:
// - per product and calendar year, only the earliest capture not yet read,
//   plus the product's newest capture (its last known price);
// - products captured in the most years first: they are the ones with a history.
// Nothing is deleted. A capture that isn't picked stays queued and is picked
// later if the one read for its year shows no price or fails.

// A capture with one of these results settles its year. A page with product
// data but no price doesn't: the price may show later in the year (Dior Hong
// Kong has none before April 2020).
const SETTLED = new Set(['saved', 'no-data']);

const year = (row) => row.timestamp.slice(0, 4);

// rows: every snapshot of one source that still has its URL, as
// { timestamp, status, key }, key naming the product. Returns the pending rows
// to fetch, in order.
export function pickSnapshots(rows, { oldestFirst = false } = {}) {
  const products = new Map();
  for (const row of rows) {
    if (!products.has(row.key)) products.set(row.key, []);
    products.get(row.key).push(row);
  }
  const picked = [];
  for (const captures of products.values()) {
    captures.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const years = new Set(captures.map(year));
    const settled = new Set(captures.filter((c) => SETTLED.has(c.status)).map(year));
    const newest = captures.at(-1);
    for (const capture of captures) {
      if (capture.status !== 'pending') continue;
      if (settled.has(year(capture)) && capture !== newest) continue;
      settled.add(year(capture));
      picked.push({ row: capture, years: years.size });
    }
  }
  const byTime = oldestFirst ? 1 : -1;
  picked.sort((a, b) => b.years - a.years || byTime * a.row.timestamp.localeCompare(b.row.timestamp));
  return picked.map((p) => p.row);
}
