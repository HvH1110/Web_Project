import { useEffect, useEffectEvent } from 'react'

// Calls `check()` every `ms` while the tab is visible, and as soon as it is
// shown again after being hidden, so a page left open picks up what other
// members did. Nothing runs while `enabled` is false.
export function usePoll(check, ms, enabled = true) {
  const run = useEffectEvent(() => check())

  useEffect(() => {
    if (!enabled) return
    let timer
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(tick, ms)
    }
    function tick() {
      if (document.visibilityState === 'visible') run()
      schedule()
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      run()
      schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms, enabled])
}
