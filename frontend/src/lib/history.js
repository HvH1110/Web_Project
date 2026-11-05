// Shapes GET /api/products/:brand/:ref/history for the price chart.
// Prices only change at recorded points, so every line is a step line.

import { MARKETS } from '@/content/site'

export const RANGES = [
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
]
export const DEFAULT_RANGE = '1y'

// Validated set in index.css; colour follows the market, never its rank.
export const MARKET_COLOR = {
  VN: 'var(--color-market-vn)',
  SG: 'var(--color-market-sg)',
  HK: 'var(--color-market-hk)',
}

const marketName = (code) => MARKETS.find((m) => m.code === code)?.name ?? code

// "Singapore · Rolex Boutique Singapore"; archive-only sources have no name.
export const seriesName = (s) => [marketName(s.market), s.source.name].filter(Boolean).join(' · ')

const time = (iso) => Date.parse(iso)

// A second source in the same market keeps the market's colour, dashed.
export function seriesStyles(series) {
  const seen = {}
  return series.map((s) => {
    const nth = (seen[s.market] = (seen[s.market] ?? 0) + 1)
    return { color: MARKET_COLOR[s.market] ?? 'var(--color-mist)', dashed: nth > 1 }
  })
}

// Rows for the shared VND chart: one per sample date of any series, holding
// each series' latest sample at or before it (key s0, s1…). Undefined before a
// series starts and after its line ends; null where no exchange rate was known,
// so the line breaks there.
export function vndRows(series) {
  const times = [...new Set(series.flatMap((s) => s.vnd.map((p) => time(p.date))))].sort((a, b) => a - b)
  const cursor = series.map(() => 0)
  return times.map((t) => {
    const row = { t }
    series.forEach((s, i) => {
      const samples = s.vnd
      while (cursor[i] < samples.length && time(samples[cursor[i]].date) <= t) cursor[i]++
      const sample = samples[cursor[i] - 1]
      const ended = samples.length && t > time(samples.at(-1).date)
      row[`s${i}`] = sample && !ended ? sample.priceVnd : undefined
    })
    return row
  })
}

// Rows for one series in its own currency: its price changes, plus the last
// price held until `lastSeenAt` (until when it is known to hold).
export function currencyRows(s) {
  const rows = s.points.map((p) => ({ t: time(p.date), v: p.price, origin: p.origin, carried: p.carried }))
  const end = s.lastSeenAt && time(s.lastSeenAt)
  if (end && rows.length && end > rows.at(-1).t) rows.push({ t: end, v: rows.at(-1).v, held: true })
  return rows
}

// The last price each source showed, for products with no current offer:
// [{ market, sourceId, currency, price, date, origin, archiveUrl, sourceUrl }], in series
// order (VN, SG, HK). Expects the range `all`, so nothing is carried.
export function lastKnownPrices(series) {
  return series.flatMap((s) => {
    const point = s.points.findLast((p) => p.price != null)
    if (!point) return []
    const { price, date, origin, archiveUrl, sourceUrl } = point
    return [{ market: s.market, sourceId: s.source.id, currency: s.currency, price, date, origin, archiveUrl, sourceUrl }]
  })
}

// Whether any sample has a VND value: none does when no exchange rate is known.
export const hasVndValues = (series) => series.some((s) => s.vnd.some((v) => v.priceVnd != null))

// When the exchange-rate source starts (fx_rates in ../docs/DATA.md).
export const RATES_START = 'February 2020'

// What the VND view can show: the first date with a VND value (ms, or null),
// whether some prices are older than that, and whether a rate is missing
// between known values.
export function vndCoverage(series) {
  const starts = series
    .map((s) => s.vnd.find((v) => v.priceVnd != null)?.date)
    .filter(Boolean)
    .map(time)
  const from = starts.length ? Math.min(...starts) : null
  const earliest = Math.min(...series.flatMap((s) => s.points.filter((p) => !p.carried).map((p) => time(p.date))))
  const hasGaps = series.some((s) => {
    const known = s.vnd.flatMap((v, i) => (v.priceVnd != null ? [i] : []))
    return known.length > 0 && known.at(-1) - known[0] + 1 !== known.length
  })
  return { from, hasEarlierPrices: from != null && earliest < from, hasGaps }
}

// Time axis ticks on calendar boundaries: the 1st of every second month for a
// range up to about a year, else every 1 January (thinned to at most ~7).
// `yearly` says which label format fits.
export function timeTicks(fromIso, toIso) {
  const from = time(fromIso)
  const to = time(toIso)
  const yearly = to - from > 400 * 86400000
  const ticks = []
  const d = new Date(from)
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  if (yearly) d.setUTCMonth(0)
  while (d.getTime() <= to) {
    if (d.getTime() >= from) ticks.push(d.getTime())
    d.setUTCMonth(d.getUTCMonth() + (yearly ? 12 : 2))
  }
  const every = Math.ceil(ticks.length / 7)
  return { ticks: ticks.filter((_, i) => i % every === 0), yearly }
}

const DAY = 86400000

// True while no series has a line to draw yet: each has a single price,
// known to hold for less than two days (tracking has only just started).
export const justStarted = (series) =>
  series.every((s) => {
    if (s.points.length > 1) return false
    const start = time(s.points[0].date)
    const end = s.lastSeenAt ? time(s.lastSeenAt) : start
    return end - start < 2 * DAY
  })

// Y axis props for `values`: rounded automatic ticks, or for a price that
// never changed in range, room around it and a single tick at the price.
export function priceScale(values) {
  const known = values.filter((v) => v != null)
  const lo = Math.min(...known)
  const hi = Math.max(...known)
  if (!known.length || lo !== hi) return { domain: ['auto', 'auto'], tickCount: 5 }
  return { domain: [lo * 0.9, hi * 1.1], ticks: [lo] }
}
