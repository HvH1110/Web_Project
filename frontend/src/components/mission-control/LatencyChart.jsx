import { Area, CartesianGrid, ComposedChart, ReferenceLine, Scatter, XAxis, YAxis } from 'recharts'
import { TriangleAlert } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatClock, formatClockShort, formatMs } from '@/lib/format'
import {
  LATENCY_CAUTION_MS,
  LATENCY_NOGO_MS,
  WINDOW_MS,
  describeFailure,
  isHealthy,
} from '@/lib/telemetry'
import StatusBadge from './StatusBadge'

const chartConfig = { latency: { label: 'Round trip', color: 'var(--series-1)' } }
const NICE_MAX = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

function FailMarker({ cx, cy }) {
  if (cx == null || cy == null) return null
  return (
    <path
      d={`M${cx} ${cy - 10} l5.5 9 h-11 Z`}
      fill="var(--status-critical)"
      stroke="var(--card)"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  )
}

// End-of-line marker with the latest value; other points stay unmarked.
function EndDot({ cx, cy, index, value, lastIndex }) {
  if (index !== lastIndex || value == null || cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="var(--color-latency)" stroke="var(--card)" strokeWidth={2} />
      <text
        x={cx - 8}
        y={cy - 10}
        textAnchor="end"
        fill="var(--foreground)"
        fontSize={12}
        fontWeight={500}
      >
        {formatMs(value)}
      </text>
    </g>
  )
}

function LatencyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="grid min-w-36 gap-1.5 rounded-lg border border-(--phosphor)/30 bg-[#07090e] px-2.5 py-1.5 text-xs shadow-xl">
      <p className="text-muted-foreground tabular-nums">{formatClock(row.at)}</p>
      {row.latency != null && (
        <p className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full bg-(--series-1)" />
          <span className="font-medium text-(--phosphor) tabular-nums">{formatMs(row.latency)}</span>
          <span className="text-muted-foreground">round trip</span>
        </p>
      )}
      {row.failure && (
        <p className="flex items-center gap-2">
          <TriangleAlert className="size-3 shrink-0 text-(--status-critical)" aria-hidden="true" />
          <span className="text-foreground">{row.failure}</span>
        </p>
      )}
    </div>
  )
}

export default function LatencyChart({ samples, className }) {
  const end = samples.at(-1)?.at ?? 0
  const start = end - WINDOW_MS
  const rows = samples.map((s) => ({
    at: s.at,
    latency: s.latencyMs != null ? Math.round(s.latencyMs) : null,
    failed: isHealthy(s) ? null : 0,
    failure: isHealthy(s) ? null : describeFailure(s),
  }))
  const peak = Math.max(0, ...rows.map((r) => r.latency ?? 0))
  const yMax = NICE_MAX.find((n) => n >= peak * 1.2) ?? Math.ceil(peak / 1000) * 1000
  const ticks = []
  for (let t = Math.ceil(start / 60_000) * 60_000; t <= end; t += 60_000) ticks.push(t)

  return (
    <Tabs defaultValue="chart" className={className}>
      <Card className="mc-panel h-full">
        <CardHeader>
          <CardTitle className="mc-plate">Round-trip time</CardTitle>
          <CardDescription>GET /api/health, last 3 minutes, in ms</CardDescription>
          <CardAction>
            <TabsList>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="grid h-[260px] place-items-center text-sm text-muted-foreground">
              Acquiring telemetry…
            </p>
          ) : (
            <>
              <TabsContent value="chart">
                <ChartContainer config={chartConfig} className="mc-crt mc-plot aspect-auto h-[236px] w-full rounded-lg">
                  <ComposedChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid />
                    <XAxis
                      dataKey="at"
                      type="number"
                      scale="time"
                      domain={[start, end]}
                      ticks={ticks}
                      tickFormatter={formatClockShort}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      padding={{ right: 12 }}
                      allowDataOverflow
                    />
                    <YAxis
                      domain={[0, yMax]}
                      ticks={[0, yMax / 2, yMax]}
                      width={40}
                      tickLine={false}
                      axisLine={false}
                      allowDataOverflow
                    />
                    <ReferenceLine
                      y={LATENCY_CAUTION_MS}
                      stroke="var(--status-warning)"
                      label={{
                        value: `Caution ${formatMs(LATENCY_CAUTION_MS)}`,
                        position: 'insideTopRight',
                        fill: 'var(--muted-foreground)',
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      y={LATENCY_NOGO_MS}
                      stroke="var(--status-critical)"
                      label={{
                        value: `No-go ${formatMs(LATENCY_NOGO_MS)}`,
                        position: 'insideTopRight',
                        fill: 'var(--muted-foreground)',
                        fontSize: 11,
                      }}
                    />
                    <ChartTooltip
                      cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                      content={<LatencyTooltip />}
                    />
                    <Area
                      dataKey="latency"
                      type="linear"
                      stroke="var(--color-latency)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="var(--color-latency)"
                      fillOpacity={0.1}
                      dot={({ cx, cy, index, payload }) => (
                        <EndDot
                          key={index}
                          cx={cx}
                          cy={cy}
                          index={index}
                          value={payload.latency}
                          lastIndex={rows.length - 1}
                        />
                      )}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                      isAnimationActive={false}
                    />
                    <Scatter dataKey="failed" shape={<FailMarker />} isAnimationActive={false} />
                  </ComposedChart>
                </ChartContainer>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <TriangleAlert className="size-3.5 text-(--status-critical)" aria-hidden="true" />
                  Unhealthy check: no response, HTTP error, status not “ok” or db not “connected”
                </p>
              </TabsContent>

              <TabsContent value="table">
                <ScrollArea className="h-[260px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Round trip</TableHead>
                        <TableHead>status</TableHead>
                        <TableHead>db</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {samples.toReversed().map((s) => (
                        <TableRow key={s.at}>
                          <TableCell className="tabular-nums">{formatClock(s.at)}</TableCell>
                          <TableCell>
                            {isHealthy(s) ? (
                              <StatusBadge state="go" label="OK" />
                            ) : (
                              <span title={describeFailure(s)}>
                                <StatusBadge state="nogo" label="UNHEALTHY" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.latencyMs != null ? formatMs(s.latencyMs) : '—'}
                          </TableCell>
                          <TableCell>{s.status ?? '—'}</TableCell>
                          <TableCell>{s.db ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Card>
    </Tabs>
  )
}
