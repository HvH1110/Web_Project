import { useEffect, useEffectEvent, useState } from 'react'

// Runs `load(signal)` for `key`, and again whenever `key` changes or on
// retry(). The request for an old key is aborted and its answer ignored.
// `previous` is the last successful data, from any key, for showing while
// the next load runs.
export function useApi(key, load) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ id: null })
  const [previous, setPrevious] = useState(undefined)
  const id = `${key}#${attempt}`
  const run = useEffectEvent((signal) => load(signal))

  useEffect(() => {
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setResult({ id, data })
        setPrevious(data)
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ id, error })
      },
    )
    return () => controller.abort()
  }, [id])

  const current = result.id === id
  return {
    data: current ? result.data : undefined,
    error: current ? result.error : undefined,
    loading: !current,
    previous,
    retry: () => setAttempt((n) => n + 1),
  }
}
