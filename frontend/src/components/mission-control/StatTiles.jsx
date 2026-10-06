import { Card, CardContent } from '@/components/ui/card'
import { useNow } from '@/hooks/useNow'
import { formatElapsed, formatMs, formatPercent } from '@/lib/format'
import { POLL_INTERVAL_MS, isHealthy, latencyStats, successRate } from '@/lib/telemetry'
import { cn } from '@/lib/utils'

function Tile({ label, value, sub, tone }) {
  return (
    <Card size="sm" className="mc-panel">
      <CardContent className="grid gap-1.5">
        <p className="mc-plate">{label}</p>
        <p className="mc-crt rounded-md px-2.5 py-1">
          <span className="mc-glow font-crt text-4xl leading-none" data-tone={tone}>
            {value}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground" title={sub}>
          {sub}
        </p>
      </CardContent>
    </Card>
  )
}

export default function StatTiles({
  overall,
  samples,
  lastSample,
  lastHold,
  checks,
  nextPollAt,
  inFlight,
  className,
}) {
  const now = useNow(1000)
  const stats = latencyStats(samples)
  const rate = successRate(samples)

  return (
    <div className={cn('grid grid-cols-2 gap-4 xl:grid-cols-4', className)}>
      <Tile
        label="Round trip"
        value={lastSample?.latencyMs != null ? formatMs(lastSample.latencyMs) : '—'}
        sub={stats ? `avg ${formatMs(stats.avg)} · p95 ${formatMs(stats.p95)}` : 'No responses yet'}
      />
      <Tile
        label="Success rate"
        value={rate == null ? '—' : formatPercent(rate)}
        sub={`${samples.filter(isHealthy).length} of ${samples.length} checks, last 3 min`}
      />
      <Tile
        label="Since last hold"
        value={overall === 'hold' ? 'NOW' : lastHold ? formatElapsed(now - lastHold.at) : 'None'}
        tone={overall === 'hold' ? 'hold' : undefined}
        sub={lastHold?.reason ?? 'No holds this session'}
      />
      <Tile
        label="Next check"
        value={
          inFlight || nextPollAt == null
            ? 'Polling…'
            : `in ${Math.max(0, Math.ceil((nextPollAt - now) / 1000))} s`
        }
        sub={`${checks} checks · every ${POLL_INTERVAL_MS / 1000} s`}
      />
    </div>
  )
}
