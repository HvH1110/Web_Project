import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNow } from '@/hooks/useNow'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import { STATUS_META } from './status'

export default function FlightLog({ events, className }) {
  const now = useNow(1000)
  // Mission calls are logged ahead of time; show each once its moment has passed.
  const visible = events.filter((e) => e.at <= now).toSorted((a, b) => b.at - a.at)

  return (
    <Card className={cn('mc-panel', className)}>
      <CardHeader>
        <CardTitle className="mc-plate">Flight log · air-to-ground loop</CardTitle>
        <CardDescription>State changes this session, newest first</CardDescription>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ScrollArea className="mc-crt h-[284px] rounded-lg px-3 py-2">
            <ol className="grid gap-3">
              {visible.map((e) => {
                const { icon: Icon, color } = STATUS_META[e.tone]
                return (
                  <li key={e.id} className="grid grid-cols-[auto_1fr] gap-x-3 font-mono text-[13px]">
                    <Icon className="mt-0.5 size-4" style={{ color }} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-(--phosphor) tabular-nums">{formatClock(e.at)}</span>
                        <span className="tracking-widest text-(--plate)">{e.source}</span>
                      </p>
                      <p className="break-words">{e.message}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
