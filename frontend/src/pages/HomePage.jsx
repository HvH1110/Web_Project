import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, CircleX, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { API_URL, getHealth } from '@/lib/api'

export default function HomePage() {
  const [health, setHealth] = useState({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getHealth({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setHealth({ state: 'success', data })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setHealth({ state: 'error', error })
      })
    return () => controller.abort()
  }, [attempt])

  function refresh() {
    setHealth({ state: 'loading' })
    setAttempt((n) => n + 1)
  }

  const loading = health.state === 'loading'

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>API health</CardTitle>
          <CardDescription className="break-all">
            GET {API_URL}/health
          </CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                data-icon="inline-start"
                className={loading ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {health.state === 'error' ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Could not load health status</AlertTitle>
              <AlertDescription>{health.error.message}</AlertDescription>
            </Alert>
          ) : (
            <dl className="grid gap-3" aria-busy={loading}>
              <HealthRow
                label="Status"
                value={health.data?.status}
                healthy={health.data?.status === 'ok'}
                loading={loading}
              />
              <HealthRow
                label="Database"
                value={health.data?.db}
                healthy={health.data?.db === 'connected'}
                loading={loading}
              />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function HealthRow({ label, value, healthy, loading }) {
  const Icon = healthy ? CircleCheck : CircleX
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        {loading ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          <Badge variant={healthy ? 'secondary' : 'destructive'}>
            <Icon data-icon="inline-start" />
            {value ?? 'unknown'}
          </Badge>
        )}
      </dd>
    </div>
  )
}
