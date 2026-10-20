import { useSearchParams } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import LoadError from '@/components/LoadError'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { MARKETS } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { getProductHistory } from '@/lib/api'
import { formatCompact, formatDate, formatMonth, formatPrice, formatYear } from '@/lib/format'
import {
  DEFAULT_RANGE,
  RANGES,
  currencyRows,
  justStarted,
  priceScale,
  seriesStyles,
  timeTicks,
  vndRows,
} from '@/lib/history'
import { cn } from '@/lib/utils'

const CURRENCIES = [
  { value: 'vnd', label: 'In VND' },
  { value: 'original', label: 'Original currency' },
]
const VIEWS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

const marketName = (code) => MARKETS.find((m) => m.code === code)?.name ?? code
const seriesName = (s) => [marketName(s.market), s.source.name].filter(Boolean).join(' · ')

// Price history, one step line per source (normally one per market).
// In VND all markets share one axis; in their own currencies they can't, so
// each gets its own small chart. Range, currency and view live in the URL
// (?range=5y&currency=original&view=table).
export default function PriceHistory({ brand, productRef }) {
  const [params, setParams] = useSearchParams()
  const range = params.get('range') ?? DEFAULT_RANGE
  const currency = params.get('currency') ?? 'vnd'
  const view = params.get('view') ?? 'chart'
  const history = useApi(`${brand}/${productRef}/${range}`, (signal) =>
    getProductHistory(brand, productRef, range, { signal }),
  )
  const data = history.data ?? (history.loading ? history.previous : undefined)

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
            <Segmented label="Range" options={RANGES} value={range} onChange={(v) => set('range', v, DEFAULT_RANGE)} />
            <Segmented label="Currency" options={CURRENCIES} value={currency} onChange={(v) => set('currency', v, 'vnd')} />
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
              <p className="eyebrow text-muted-foreground">No history yet</p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                History starts with the first daily crawl of this product, and older prices are
                added from the Internet Archive where it captured them.
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
              ) : currency === 'vnd' ? (
                <VndChart data={data} />
              ) : (
                <CurrencyCharts data={data} />
              )}
              {!(view === 'chart' && justStarted(data.series)) && (
                <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                  {formatDate(data.from)} to {formatDate(data.to)}.
                  {currency === 'vnd' &&
                    view === 'chart' &&
                    " VND values use each day's exchange rate; gaps mean no rate was known."}
                  {' '}Hollow points are Internet Archive snapshots; the table links to each one.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'eyebrow -ml-px h-10 border px-4 text-[0.625rem] tracking-[0.16em] transition-colors first:ml-0',
              active
                ? 'relative z-10 border-foreground bg-foreground text-background'
                : 'border-border hover:border-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Line keys and names; always shown, so identity never rests on colour alone.
function Legend({ series, styles }) {
  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
      {series.map((s, i) => (
        <li key={`${s.market}-${s.source.id}`} className="flex items-center gap-2.5">
          <LineKey {...styles[i]} />
          {seriesName(s)}
        </li>
      ))}
    </ul>
  )
}

function LineKey({ color, dashed }) {
  return (
    <svg width="18" height="4" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="2" x2="18" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
  )
}

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11 },
}

function timeAxis(data) {
  const { ticks, yearly } = timeTicks(data.from, data.to)
  return (
    <XAxis
      dataKey="t"
      type="number"
      scale="time"
      domain={[Date.parse(data.from), Date.parse(data.to)]}
      ticks={ticks}
      tickFormatter={yearly ? formatYear : formatMonth}
      {...axisProps}
    />
  )
}

// Rounded ticks around the data rather than from zero, so changes show.
const priceAxis = (width, values) => (
  <YAxis {...priceScale(values)} tickFormatter={formatCompact} width={width} {...axisProps} />
)

// Before there is any line: when tracking began and each store's first price.
function FirstPrices({ series }) {
  const started = series.map((s) => s.points[0].date).sort()[0]
  return (
    <div className="grid gap-6 bg-secondary px-6 py-12 sm:px-10">
      <div className="grid gap-2">
        <p className="eyebrow text-muted-foreground">Tracking started {formatDate(started)}</p>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          The chart appears once prices have been checked over a few days. First prices recorded:
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
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function VndChart({ data }) {
  const { series } = data
  const styles = seriesStyles(series)
  const rows = vndRows(series)
  const config = Object.fromEntries(series.map((s, i) => [`s${i}`, { label: seriesName(s), color: styles[i].color }]))

  return (
    <div className="grid gap-6">
      <Legend series={series} styles={styles} />
      <ChartContainer config={config} className="aspect-auto h-80 w-full sm:h-96">
        <LineChart data={rows} margin={{ top: 8, right: 40, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          {timeAxis(data)}
          {priceAxis(56, rows.flatMap((r) => series.map((_, i) => r[`s${i}`])))}
          <ChartTooltip
            cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeOpacity: 0.3 }}
            content={<VndTooltip series={series} styles={styles} />}
          />
          {series.map((s, i) => (
            <Line
              key={`s${i}`}
              dataKey={`s${i}`}
              type="stepAfter"
              stroke={styles[i].color}
              strokeWidth={2}
              strokeDasharray={styles[i].dashed ? '6 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
              isAnimationActive={false}
              label={<EndLabel rows={rows} dataKey={`s${i}`} text={s.market} />}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}

// Market code at the end of its line, in text ink (never the line colour).
function EndLabel({ rows, dataKey, text, index, x, y }) {
  let last = rows.length - 1
  while (last >= 0 && rows[last][dataKey] == null) last--
  if (index !== last) return null
  return (
    <text x={x + 8} y={y} dy={4} fontSize={11} fill="var(--muted-foreground)" letterSpacing="0.1em">
      {text}
    </text>
  )
}

function VndTooltip({ active, payload, label, series, styles }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox date={label}>
      {series.map((s, i) => {
        const value = payload[0].payload[`s${i}`]
        if (value === undefined) return null
        return (
          <TooltipRow key={i} style={styles[i]} name={seriesName(s)}>
            {value === null ? 'No rate' : formatPrice(value, 'VND')}
          </TooltipRow>
        )
      })}
    </TooltipBox>
  )
}

function TooltipBox({ date, children }) {
  return (
    <div className="grid min-w-56 gap-2 border bg-background px-4 py-3 text-xs shadow-md">
      <p className="eyebrow text-[0.625rem] text-muted-foreground">{formatDate(date)}</p>
      {children}
    </div>
  )
}

// Value first, name after, a line key for identity.
function TooltipRow({ style, name, children }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5">
      <LineKey {...style} />
      <span className="font-medium tabular-nums">{children}</span>
      <span />
      <span className="text-muted-foreground">{name}</span>
    </div>
  )
}

// Small multiples: one chart per source, each on its own currency's axis.
function CurrencyCharts({ data }) {
  const styles = seriesStyles(data.series)
  return (
    <ul className="grid gap-12 md:grid-cols-2 xl:grid-cols-3">
      {data.series.map((s, i) => {
        const rows = currencyRows(s)
        const latest = rows.at(-1)?.v
        return (
          <li key={`${s.market}-${s.source.id}`} className="grid content-start gap-4 border-t pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="flex items-center gap-2.5 text-xs">
                <LineKey {...styles[i]} />
                {seriesName(s)}
              </p>
              <p className="text-sm tabular-nums">{latest != null ? formatPrice(latest, s.currency) : '—'}</p>
            </div>
            <ChartContainer
              config={{ v: { label: s.currency, color: styles[i].color } }}
              className="aspect-auto h-48 w-full"
            >
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                {timeAxis(data)}
                {priceAxis(48, rows.map((r) => r.v))}
                <ChartTooltip
                  cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeOpacity: 0.3 }}
                  content={<CurrencyTooltip series={s} style={styles[i]} />}
                />
                <Line
                  dataKey="v"
                  type="stepAfter"
                  stroke={styles[i].color}
                  strokeWidth={2}
                  strokeDasharray={styles[i].dashed ? '6 4' : undefined}
                  dot={<ArchiveDot color={styles[i].color} />}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </li>
        )
      })}
    </ul>
  )
}

// Hollow marker on prices that came from an Internet Archive snapshot.
function ArchiveDot({ cx, cy, payload, color }) {
  if (payload?.origin !== 'wayback' || cx == null) return null
  return <circle cx={cx} cy={cy} r={4} fill="var(--background)" stroke={color} strokeWidth={2} />
}

function CurrencyTooltip({ active, payload, label, series, style }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <TooltipBox date={label}>
      <TooltipRow style={style} name={row.origin === 'wayback' ? 'Internet Archive snapshot' : seriesName(series)}>
        {row.v != null ? formatPrice(row.v, series.currency) : 'No price shown'}
      </TooltipRow>
    </TooltipBox>
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
    <div role="region" aria-label="Recorded price changes" tabIndex={0} className="overflow-x-auto">
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
              <td className="py-3 pr-4 whitespace-nowrap tabular-nums">{formatDate(r.date)}</td>
              <td className="py-3 pr-4">{seriesName(r.s)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">
                {r.price != null ? formatPrice(r.price, r.s.currency) : '—'}
              </td>
              <td className="py-3 pr-4 text-right text-muted-foreground tabular-nums">
                {r.vnd != null ? formatPrice(r.vnd, 'VND') : '—'}
              </td>
              <td className="py-3 text-right">
                {r.origin === 'wayback' && r.archiveUrl ? (
                  <a href={r.archiveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                    <span className="link-underline">Internet Archive</span>
                    <ArrowUpRight className="size-3" strokeWidth={1.5} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  'Daily crawl'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
