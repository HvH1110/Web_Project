// Counts API requests that have been waiting a long time. The backend's host
// sleeps when idle and can take about a minute to wake (see ../docs/API.md).
const SLOW_AFTER_MS = 10000

let slowCount = 0
const listeners = new Set()

function setSlowCount(next) {
  const wasSlow = slowCount > 0
  slowCount = next
  if (wasSlow !== slowCount > 0) listeners.forEach((listener) => listener())
}

// Call when a request starts; call what it returns when the request ends.
export function trackRequest() {
  let slow = false
  const timer = setTimeout(() => {
    slow = true
    setSlowCount(slowCount + 1)
  }, SLOW_AFTER_MS)

  return () => {
    clearTimeout(timer)
    if (slow) setSlowCount(slowCount - 1)
  }
}

// For useSyncExternalStore.
export function subscribeSlowRequests(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const hasSlowRequests = () => slowCount > 0
