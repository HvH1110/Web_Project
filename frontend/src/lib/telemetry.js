// Health telemetry rules for the Mission Control page: thresholds, the GO/NO-GO
// stations, and launch timing. Pure functions; polling lives in useHealthTelemetry.
import { formatMs, formatPercent } from '@/lib/format'

export const POLL_INTERVAL_MS = 5000
export const REQUEST_TIMEOUT_MS = 4000
// Samples kept for the chart and the success rate: 36 × 5 s = 3 minutes.
export const WINDOW_SIZE = 36
export const WINDOW_MS = WINDOW_SIZE * POLL_INTERVAL_MS
export const MAX_EVENTS = 50

export const LATENCY_CAUTION_MS = 300
export const LATENCY_NOGO_MS = 1000
export const SUCCESS_RATE_GO = 0.95

// Launch sequence: T-10 countdown once every station is GO. On Apollo 11 the
// ignition sequence started at T-8.9 s.
export const COUNTDOWN_MS = 10_000
export const IGNITION_MS = 8_900
export const LIFTOFF_MS = 8_000

// Apollo 11 ascent, in seconds after liftoff (Apollo 11 mission report, rounded;
// tower clear is approximate). While every station stays GO the launch replays it.
export const ASCENT = {
  TOWER_CLEAR: 12,
  ROLL: 13,
  MAX_Q: 83,
  INBOARD_CUTOFF: 135,
  S1_SEP: 162,
  S2_IGNITION: 164,
  LES_JETTISON: 198,
  S2_SEP: 548,
  S3_IGNITION: 552,
  S3_CUTOFF: 699,
  ORBIT: 709,
}

export const MISSION_EVENTS = [
  { t: 0, label: 'Liftoff', call: 'Liftoff! We have a liftoff.' },
  { t: ASCENT.TOWER_CLEAR, label: 'Tower clear', call: 'Tower cleared. Houston has control.' },
  { t: ASCENT.ROLL, label: 'Roll program', call: 'Roll and pitch program.' },
  { t: ASCENT.MAX_Q, label: 'Max Q', call: 'Max Q. Maximum dynamic pressure.' },
  { t: ASCENT.INBOARD_CUTOFF, label: 'Inboard cutoff', call: 'Inboard engine cutoff.' },
  { t: ASCENT.S1_SEP, label: 'Staging', call: 'Staging. S-IC separation.' },
  { t: ASCENT.S2_IGNITION, label: 'S-II ignition', call: 'S-II ignition. Five J-2 engines burning.' },
  { t: ASCENT.LES_JETTISON, label: 'Tower jettison', call: 'Launch escape tower jettisoned.' },
  { t: ASCENT.S2_SEP, label: 'S-II cutoff', call: 'S-II cutoff. Staging.' },
  { t: ASCENT.S3_IGNITION, label: 'S-IVB ignition', call: 'S-IVB ignition.' },
  { t: ASCENT.S3_CUTOFF, label: 'S-IVB cutoff', call: 'S-IVB cutoff.' },
  { t: ASCENT.ORBIT, label: 'Orbit', call: 'Earth orbit insertion. Apollo 11 is in orbit.' },
]

export const STATIONS = [
  { id: 'booster', callsign: 'BOOSTER', name: 'API server', source: 'status field' },
  { id: 'network', callsign: 'NETWORK', name: 'Database link', source: 'db field' },
  { id: 'comm', callsign: 'COMM', name: 'Response time', source: 'measured round trip' },
  { id: 'guidance', callsign: 'GUIDANCE', name: 'Success rate', source: 'last 3 min' },
]

// Station states: go | caution | nogo | nodata
export const STATE_LABEL = {
  go: 'GO',
  caution: 'CAUTION',
  nogo: 'NO-GO',
  nodata: 'NO DATA',
}

// A check is healthy when the API answers with status "ok" and db "connected".
export const isHealthy = (sample) =>
  sample.ok && sample.status === 'ok' && sample.db === 'connected'

export function successRate(samples) {
  if (!samples.length) return null
  return samples.filter(isHealthy).length / samples.length
}

export function latencyStats(samples) {
  const values = samples
    .map((s) => s.latencyMs)
    .filter((v) => v != null)
    .sort((a, b) => a - b)
  if (!values.length) return null
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  const p95 = values[Math.ceil(values.length * 0.95) - 1]
  return { avg, p95 }
}

// Why an unhealthy check failed, e.g. "HTTP 500: Database query timed out".
export function describeFailure(sample) {
  if (!sample.ok) {
    return sample.httpStatus ? `HTTP ${sample.httpStatus}: ${sample.error}` : sample.error
  }
  if (sample.status !== 'ok') return `status: ${sample.status ?? 'missing'}`
  return `db: ${sample.db ?? 'missing'}`
}

export function evaluateStations(sample, samples) {
  return {
    booster: evaluateBooster(sample),
    network: evaluateNetwork(sample),
    comm: evaluateComm(sample),
    guidance: evaluateGuidance(samples),
  }
}

function evaluateBooster(sample) {
  if (!sample.ok) {
    return {
      state: 'nogo',
      reading: sample.httpStatus ? `HTTP ${sample.httpStatus}` : 'No response',
      detail: sample.error,
    }
  }
  if (sample.status === 'ok') return { state: 'go', reading: 'ok' }
  return {
    state: 'nogo',
    reading: String(sample.status ?? 'missing'),
    detail: 'status is not "ok"',
  }
}

function evaluateNetwork(sample) {
  if (!sample.ok) {
    return { state: 'nodata', reading: null, detail: 'No health response' }
  }
  if (sample.db === 'connected') return { state: 'go', reading: 'connected' }
  return {
    state: 'nogo',
    reading: String(sample.db ?? 'missing'),
    detail: 'Database is not connected',
  }
}

function evaluateComm(sample) {
  if (sample.latencyMs == null) {
    return { state: 'nogo', reading: 'No signal', detail: sample.error }
  }
  const reading = formatMs(sample.latencyMs)
  if (sample.latencyMs >= LATENCY_NOGO_MS) {
    return { state: 'nogo', reading, detail: `${formatMs(LATENCY_NOGO_MS)} or slower` }
  }
  if (sample.latencyMs >= LATENCY_CAUTION_MS) {
    return { state: 'caution', reading, detail: `${formatMs(LATENCY_CAUTION_MS)} or slower` }
  }
  return { state: 'go', reading }
}

// Caution at most: a past failure shouldn't hold a launch the other stations clear.
function evaluateGuidance(samples) {
  const rate = successRate(samples)
  const reading = formatPercent(rate)
  if (rate >= SUCCESS_RATE_GO) return { state: 'go', reading }
  return {
    state: 'caution',
    reading,
    detail: `Under ${formatPercent(SUCCESS_RATE_GO)} of recent checks were healthy`,
  }
}

// Any NO-GO or NO DATA station holds the launch; CAUTION does not.
export function overallState(stations) {
  const clear = Object.values(stations).every(
    (s) => s.state === 'go' || s.state === 'caution',
  )
  return clear ? 'go' : 'hold'
}

// "NETWORK NO-GO: disconnected" for the first station holding the launch.
export function holdReason(stations) {
  const { id, callsign } = STATIONS.find(
    ({ id }) => stations[id].state === 'nogo' || stations[id].state === 'nodata',
  )
  const { state, reading, detail } = stations[id]
  return `${callsign} ${STATE_LABEL[state]}: ${reading ?? detail}`
}

// Where the launch is at `now`. `t` is milliseconds relative to T-0.
export function launchPhase(overall, goSince, now) {
  if (overall === 'acquiring') return { phase: 'acquiring' }
  if (overall !== 'go' || goSince == null) return { phase: 'hold' }
  const t = now - (goSince + COUNTDOWN_MS)
  if (t < 0) return { phase: 'countdown', t }
  if (t < LIFTOFF_MS) return { phase: 'liftoff', t }
  return { phase: 'flight', t }
}
