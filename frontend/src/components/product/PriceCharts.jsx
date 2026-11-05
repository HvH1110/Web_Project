import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { formatCompact, formatDate, formatMonth, formatPrice, formatYear } from '@/lib/format'
import { currencyRows, priceScale, seriesName, seriesStyles, timeTicks, vndCoverage, vndRows } from '@/lib/history'

// The chart is for looking at. The table view gives the same prices to keyboards
// and screen readers, so this is one named image rather than a focus stop.
const TABLE_HINT = 'Chart of these prices over time. Switch to the table view to read every price.'

// The price history charts, loaded on demand by PriceHistory. In VND all
// markets share one axis; in their own currencies they can't, so each gets its
// own small chart.
export default function PriceCharts({ data, currency }) {
  return currency === 'vnd' ? <VndChart data={data} /> : <CurrencyCharts data={data} />
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

function timeAxis(data, from = Date.parse(data.from)) {
  const { ticks, yearly } = timeTicks(new Date(from).toISOString(), data.to)
  return (
    <XAxis
      dataKey="t"
      type="number"
      scale="time"
      domain={[from, Date.parse(data.to)]}
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

// Starts at the first VND value and leaves out sources with none: years of
// empty axis would read as missing data, when those prices simply predate the
// exchange rates. PriceHistory's note says where they are.
function VndChart({ data }) {
  const allStyles = seriesStyles(data.series)
  const shown = data.series.flatMap((s, i) => (s.vnd.some((v) => v.priceVnd != null) ? [{ s, style: allStyles[i] }] : []))
  const series = shown.map((x) => x.s)
  const styles = shown.map((x) => x.style)
  const { from } = vndCoverage(data.series)
  const start = Math.max(from, Date.parse(data.from))
  const rows = vndRows(series).filter((r) => r.t >= start)
  const config = Object.fromEntries(series.map((s, i) => [`s${i}`, { label: seriesName(s), color: styles[i].color }]))

  return (
    <div className="grid gap-6">
      <Legend series={series} styles={styles} />
      <ChartContainer config={config} role="img" aria-label={TABLE_HINT} className="aspect-auto h-80 w-full sm:h-96">
        <LineChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 40, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          {timeAxis(data, start)}
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
              dot={<LoneDot rows={rows} dataKey={`s${i}`} color={styles[i].color} />}
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

// A value with no neighbour has no line to draw, so it would vanish: mark it.
function LoneDot({ rows, dataKey, color, index, cx, cy }) {
  if (cx == null || cy == null || rows[index - 1]?.[dataKey] != null || rows[index + 1]?.[dataKey] != null) return null
  return <circle cx={cx} cy={cy} r={3} fill={color} />
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
              role="img"
              aria-label={TABLE_HINT}
              className="aspect-auto h-48 w-full"
            >
              <LineChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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

// Hollow marker on prices not from the daily crawl, told apart by shape so it
// doesn't rest on colour: a circle for an Internet Archive snapshot, a square
// for a price checked by hand.
function ArchiveDot({ cx, cy, payload, color }) {
  if (cx == null) return null
  const marker = { fill: 'var(--background)', stroke: color, strokeWidth: 2 }
  if (payload?.origin === 'wayback') return <circle cx={cx} cy={cy} r={4} {...marker} />
  if (payload?.origin === 'manual') return <rect x={cx - 4} y={cy - 4} width={8} height={8} {...marker} />
  return null
}

const MARKER_NAME = { wayback: 'Internet Archive snapshot', manual: 'Checked by hand' }

function CurrencyTooltip({ active, payload, label, series, style }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <TooltipBox date={label}>
      <TooltipRow style={style} name={MARKER_NAME[row.origin] ?? seriesName(series)}>
        {row.v != null ? formatPrice(row.v, series.currency) : 'No price shown'}
      </TooltipRow>
    </TooltipBox>
  )
}
