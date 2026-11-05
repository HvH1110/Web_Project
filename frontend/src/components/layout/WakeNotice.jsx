import { useSyncExternalStore } from 'react'
import { hasSlowRequests, subscribeSlowRequests } from '@/lib/slowRequests'

// One quiet line while a page's data is taking long, whatever the page. The
// live region is always rendered so screen readers announce the text when it
// appears.
export default function WakeNotice() {
  const slow = useSyncExternalStore(subscribeSlowRequests, hasSlowRequests)

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {slow && (
        <p className="border bg-background px-4 py-2.5 text-center text-xs text-muted-foreground shadow-sm animate-in fade-in duration-500">
          Waking up the server, this can take a minute.
        </p>
      )}
    </div>
  )
}
