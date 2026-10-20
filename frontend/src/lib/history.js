// Shapes GET /api/products/:brand/:ref/history for the price chart.
// Prices only change at recorded points, so every line is a step line.

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
