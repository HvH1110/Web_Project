import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { POLL_INTERVAL_MS, STATIONS } from '@/lib/telemetry'
import { cn } from '@/lib/utils'
import StatusLamp from './StatusLamp'

const AWAITING = { state: 'nodata', reading: null, detail: 'Awaiting telemetry' }

export default function PollBoard({ stations, className }) {
  return (
    <Card className={cn('mc-panel', className)}>
      <CardHeader>
        <CardTitle className="mc-plate">Go / no-go poll</CardTitle>
        <CardDescription>
          Polled every {POLL_INTERVAL_MS / 1000} s. Any NO-GO or NO DATA holds the
          launch; CAUTION does not.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {STATIONS.map(({ id, callsign, name, source }) => {
            const { state, reading, detail } = stations?.[id] ?? AWAITING
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="font-crt text-2xl leading-none tracking-wider text-foreground">
                    {callsign}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground sm:truncate">
                    {name} · {source}
                  </p>
                  {state !== 'go' && detail && (
                    <p className="truncate text-xs text-muted-foreground" title={detail}>
                      {detail}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <span className="mc-glow font-crt text-2xl tabular-nums">{reading ?? '—'}</span>
                  <StatusLamp state={state} />
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
