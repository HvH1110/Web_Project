import { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router'
import LoadError from '@/components/LoadError'
import PriceSource from '@/components/product/PriceSource'
import Segmented from '@/components/Segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/useApi'
import { getProductHistory } from '@/lib/api'
import { formatDate, formatDayUtc, formatPrice } from '@/lib/format'
import { RATE_SOURCE } from '@/lib/catalog'
import { DEFAULT_RANGE, RANGES, hasVndValues, justStarted, seriesName } from '@/lib/history'
import { cn } from '@/lib/utils'

const CURRENCIES = [
  { value: 'vnd', label: 'In VND' },
  { value: 'original', label: 'Original currency' },
]
const VIEWS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

// Recharts is large, and many products have no line to draw yet.
const PriceCharts = lazy(() => import('@/components/product/PriceCharts'))

// Price history, one step line per source (normally one per market).
// In VND all markets share one axis; in their own currencies they can't, so
// each gets its own small chart. Range, currency and view live in the URL
// (?range=5y&currency=original&view=table). `defaultRange` is `all` for a
// product with no current offer, whose last price can be years old.
export default function PriceHistory({ brand, productRef, defaultRange = DEFAULT_RANGE }) {
  const [params, setParams] = useSearchParams()
  const range = params.get('range') ?? defaultRange
  const asked = params.get('currency') ?? 'vnd'
  const view = params.get('view') ?? 'chart'
  const history = useApi(`${brand}/${productRef}/${range}`, (signal) =>
    getProductHistory(brand, productRef, range, { signal }),
  )
  const data = history.data ?? (history.loading ? history.previous : undefined)
  // With no exchange rate for any date, VND has nothing to show.
  const noVnd = Boolean(data?.series.length) && !hasVndValues(data.series)
  const currency = noVnd ? 'original' : asked

  const set = (name, value, fallback) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <section id="history" aria-labelledby="history-title" className="scroll-mt-header border-t">
      <div className="page-container py-section">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="grid gap-3">
            <h2 id="history-title" className="font-serif text-display-lg">
              Price history
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Official prices change a few times a year. Each line holds a price until the next
              change we recorded.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Segmented label="Range" options={RANGES} value={range} onChange={(v) => set('range', v, defaultRange)} />
            {!noVnd && (
              <Segmented label="Currency" options={CURRENCIES} value={currency} onChange={(v) => set('currency', v, 'vnd')} />
            )}
            <Segmented label="View" options={VIEWS} value={view} onChange={(v) => set('view', v, 'chart')} />
          </div>
        </div>

        <div className="mt-12">
          {history.error ? (
            <LoadError error={history.error} onRetry={history.retry} />
          ) : !data ? (
            <Skeleton className="h-96" aria-label="Loading price history" />
          ) : !data.series.length ? (
            <div className="grid justify-items-center gap-3 bg-secondary px-6 py-16 text-center">
              <p className="eyebrow text-muted-foreground">
                {range === 'all' ? 'No history yet' : 'No prices in this range'}
              </p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {range === 'all'
                  ? 'History starts with the first daily crawl of this product, and older prices are added from the Internet Archive where it captured them.'
                  : 'No price was recorded for this product in this range. Try a longer one.'}
              </p>
            </div>
          ) : (
            <div
              aria-busy={history.loading || undefined}
              className={cn('transition-opacity duration-300', history.loading && 'opacity-40')}
            >
              {view === 'table' ? (
                <HistoryTable series={data.series} />
              ) : justStarted(data.series) ? (
                <FirstPrices series={data.series} />
              ) : (
                <Suspense fallback={<Skeleton className="h-96" aria-label="Loading chart" />}>
                  <PriceCharts data={data} currency={currency} />
                </Suspense>
              )}
              {!(view === 'chart' && justStarted(data.series)) && (
                <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                  {formatDate(data.from)} to {formatDate(data.to)}.
                  {!noVnd && (view === 'table' || currency === 'vnd') && ` VND prices use ${RATE_SOURCE} of each day.`}
                  {currency === 'vnd' && view === 'chart' && ' Gaps mean no rate was known.'}
                  {noVnd && ' Prices are in their original currency because no exchange rates are stored for these dates.'}
                  {view === 'chart' && currency !== 'vnd' && markerNote(data.series)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// What the markers on the original-currency charts mean, for those present.
function markerNote(series) {
  const origins = new Set(series.flatMap((s) => s.points.map((p) => p.origin)))
  const meanings = [
    origins.has('wayback') && 'Hollow circles are Internet Archive snapshots',
    origins.has('manual') && `${origins.has('wayback') ? 'hollow' : 'Hollow'} squares are prices checked by hand`,
  ].filter(Boolean)
  return meanings.length ? ` ${meanings.join(' and ')}; the table links to each one.` : ''
}

// Before there is any line: each store's only price so far: the start of daily
// tracking, a single Internet Archive snapshot, or a price checked by hand.
function FirstPrices({ series }) {
  const started = series.map((s) => s.points[0].date).sort()[0]
  const firstOrigins = new Set(series.map((s) => s.points[0].origin))
  const archived = firstOrigins.size === 1 && firstOrigins.has('wayback')
  const tracked = firstOrigins.size === 1 && firstOrigins.has('crawl')
  return (
    <div className="grid gap-6 bg-secondary px-6 py-12 sm:px-10">
      <div className="grid gap-2">
        <p className="eyebrow text-muted-foreground">
          {archived
            ? 'One archived price per store so far'
            : tracked
              ? `Tracking started ${formatDate(started)}`
              : 'One price per store so far'}
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {archived
            ? 'A line appears once the Internet Archive has captured a store at more than one date. Captured so far:'
            : tracked
              ? 'The chart appears once prices have been checked over a few days. First prices recorded:'
              : 'A line appears once a store has prices from more than one date. Recorded so far:'}
        </p>
      </div>
      <ul className="grid max-w-2xl border-b">
        {series.map((s) => {
          const first = s.points[0]
          return (
            <li key={`${s.market}-${s.source.id}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t py-3 text-sm">
              <span>{seriesName(s)}</span>
              <span className="tabular-nums">
                {first.price != null ? formatPrice(first.price, s.currency) : '—'}
                <span className="ml-3 text-xs text-muted-foreground">
                  {first.origin === 'manual' ? (
                    <>
                      <PriceSource {...first} /> on {formatDayUtc(first.date)}
                    </>
                  ) : (
                    formatDate(first.date)
                  )}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Every recorded price change, newest first, with where it came from.
function HistoryTable({ series }) {
  const rows = series
    .flatMap((s) =>
      s.points
        .filter((p) => !p.carried)
        .map((p) => ({ ...p, s, vnd: s.vnd.find((v) => v.date === p.date)?.priceVnd })),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No price changes recorded in this range.</p>
  }
  return (
    // Focusable so keyboard users can scroll it sideways on small screens.
    // Relative, or the hidden link text escapes the scrolling and widens the page.
    <div role="region" aria-label="Recorded price changes" tabIndex={0} className="relative overflow-x-auto">
      <table className="w-full min-w-[40rem] border-b text-sm">
        <caption className="sr-only">Recorded price changes</caption>
        <thead>
          <tr className="eyebrow text-left text-[0.625rem] text-muted-foreground">
            <th scope="col" className="py-3 pr-4 font-medium">Date</th>
            <th scope="col" className="py-3 pr-4 font-medium">Market and store</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">Price</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">In VND that day</th>
            <th scope="col" className="py-3 text-right font-medium">Recorded by</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.s.market}-${r.s.source.id}-${r.date}`} className="border-t">
              <td className="py-3 pr-4 whitespace-nowrap tabular-nums">
                {r.origin === 'manual' ? formatDayUtc(r.date) : formatDate(r.date)}
              </td>
              <td className="py-3 pr-4">{seriesName(r.s)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">
                {r.price != null ? formatPrice(r.price, r.s.currency) : '—'}
              </td>
              <td className="py-3 pr-4 text-right text-muted-foreground tabular-nums">
                {r.vnd != null ? formatPrice(r.vnd, 'VND') : '—'}
              </td>
              <td className="py-3 text-right">
                <PriceSource {...r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
