import { useCallback, useEffect, useReducer, useState } from 'react'
import { ApiError, getHealth } from '@/lib/api'
import {
  ASCENT,
  COUNTDOWN_MS,
  MAX_EVENTS,
  MISSION_EVENTS,
  POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  STATE_LABEL,
  STATIONS,
  WINDOW_SIZE,
  evaluateStations,
  holdReason,
  overallState,
} from '@/lib/telemetry'

const initialState = {
  samples: [], // oldest first, last WINDOW_SIZE checks
  checks: 0,
  stations: null,
  overall: 'acquiring', // acquiring | go | hold
  goSince: null, // when the current all-GO streak started
  lastHold: null, // { at, reason }
  events: [], // by insertion; mission calls are logged ahead with future times
}

function reducer(state, { sample }) {
  const samples = [...state.samples, sample].slice(-WINDOW_SIZE)
  const stations = evaluateStations(sample, samples)
  const overall = overallState(stations)
  const goSince =
    overall === 'go' ? (state.overall === 'go' ? state.goSince : sample.at) : null

  const added = []
  const log = (source, tone, message, at = sample.at) =>
    added.push({ id: `${sample.at}-${added.length}`, at, source, tone, message })

  if (!state.stations) log('FLIGHT', 'info', 'Telemetry acquired.')
  for (const { id, callsign } of STATIONS) {
    const prev = state.stations?.[id]
    const next = stations[id]
    if (prev ? prev.state === next.state : next.state === 'go') continue
    const was = prev ? ` (was ${STATE_LABEL[prev.state]})` : ''
    const message = [`${STATE_LABEL[next.state]}${was}`, next.reading, next.detail]
    log(callsign, next.state, message.filter(Boolean).join(' · '))
  }

  if (overall !== state.overall) {
    if (overall === 'go') {
      log('FLIGHT', 'go', 'All stations GO. Launch sequence start, T−10.')
      // Launch Control at KSC calls the launch until tower clear, then Houston.
      for (const { t, call } of MISSION_EVENTS) {
        const source = t < ASCENT.TOWER_CLEAR ? 'KSC' : 'HOUSTON'
        log(source, t === 0 ? 'go' : 'info', call, goSince + COUNTDOWN_MS + t * 1000)
      }
    } else {
      log('FLIGHT', 'nogo', state.overall === 'go' ? 'Hold called.' : 'Hold. Not all stations are GO.')
    }
  }

  // A hold cancels the mission calls that haven't happened yet.
  const kept = overall === 'go' ? state.events : state.events.filter((e) => e.at <= sample.at)

  return {
    samples,
    checks: state.checks + 1,
    stations,
    overall,
    goSince,
    lastHold: overall === 'hold' ? { at: sample.at, reason: holdReason(stations) } : state.lastHold,
    events: [...kept, ...added].slice(-MAX_EVENTS),
  }
}

// Polls GET /api/health every POLL_INTERVAL_MS (never overlapping) and keeps
// a rolling window of samples plus the derived GO/NO-GO state.
export function useHealthTelemetry() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [nextPollAt, setNextPollAt] = useState(null)
  const [inFlight, setInFlight] = useState(false)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer

    async function poll() {
      setInFlight(true)
      const signal = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ])
      const t0 = performance.now()
      let sample
      try {
        const data = await getHealth({ signal })
        sample = {
          ok: true,
          latencyMs: performance.now() - t0,
          status: data?.status,
          db: data?.db,
        }
      } catch (error) {
        if (controller.signal.aborted) return
        // The server answered with an error status: the round trip still counts.
        const answered = error instanceof ApiError && error.status > 0
        sample = {
          ok: false,
          latencyMs: answered ? performance.now() - t0 : null,
          httpStatus: answered ? error.status : null,
          error:
            error.name === 'TimeoutError'
              ? `No response within ${REQUEST_TIMEOUT_MS / 1000} s`
              : error.message,
        }
      }
      if (controller.signal.aborted) return

      const at = Date.now()
      dispatch({ sample: { ...sample, at } })
      setInFlight(false)
      setNextPollAt(at + POLL_INTERVAL_MS)
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timer = setTimeout(poll, 0)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [run])

  const pollNow = useCallback(() => setRun((n) => n + 1), [])

  return {
    ...state,
    lastSample: state.samples.at(-1) ?? null,
    nextPollAt,
    inFlight,
    pollNow,
  }
}
