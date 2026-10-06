const clock = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const clockShort = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const pad = (n) => String(n).padStart(2, '0')

// 14:03:27
export const formatClock = (ms) => clock.format(ms)

// 14:03
export const formatClockShort = (ms) => clockShort.format(ms)

// Mission elapsed time in the Apollo hhh:mm:ss style, e.g. 000:02:13
export function formatMet(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return `${String(h).padStart(3, '0')}:${pad(m)}:${pad(total % 60)}`
}

// Time remaining as mm:ss, e.g. 01:12
export function formatMinSec(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

// 42s, 3m 05s, 1h 12m
export function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${pad(s % 60)}s`
  return `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`
}

export const formatMs = (ms) => `${Math.round(ms).toLocaleString()} ms`

// 100%, 97.2%
export function formatPercent(ratio) {
  const pct = ratio * 100
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`
}
