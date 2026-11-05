import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router'

const STORAGE_KEY = 'maison-prix-scroll'
const GIVE_UP_AFTER_MS = 30000
const USER_INPUT = ['wheel', 'touchmove', 'keydown', 'mousedown']

function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

const positions = readSaved()

// Opened from a link or a typed address, this page starts at the top even if
// this tab saw it earlier. Reloading or coming back keeps the place.
if (performance.getEntriesByType('navigation')[0]?.type === 'navigate') {
  delete positions[window.location.pathname]
}

// Finishes what <ScrollRestoration> starts. Pages load their data after they
// mount, so going back finds the page too short and the position is cut off at
// the footer. This re-applies it as the page grows, until it fits or the visitor
// scrolls. Scroll anchoring is off in index.css, or the browser would keep the
// footer in view as content arrives. Render before <ScrollRestoration>.
export default function RestoreScroll({ getKey }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const key = getKey(location)

  useLayoutEffect(() => {
    const target = positions[key]
    let restoring = navigationType === 'POP' && target > 0
    let finish = () => {}

    if (restoring) {
      const apply = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo({ top: Math.min(target, max), behavior: 'instant' })
        if (max >= target) finish()
      }
      const observer = new ResizeObserver(apply)
      observer.observe(document.body)
      const timer = setTimeout(() => finish(), GIVE_UP_AFTER_MS)
      finish = () => {
        restoring = false
        observer.disconnect()
        clearTimeout(timer)
        USER_INPUT.forEach((type) => window.removeEventListener(type, finish))
      }
      USER_INPUT.forEach((type) => window.addEventListener(type, finish, { passive: true }))
    }

    const remember = () => {
      if (!restoring) positions[key] = window.scrollY
    }
    const persist = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
      } catch {
        // Storage is blocked: a reload just won't restore the position.
      }
    }
    window.addEventListener('scroll', remember, { passive: true })
    window.addEventListener('pagehide', persist)
    return () => {
      finish()
      window.removeEventListener('scroll', remember)
      window.removeEventListener('pagehide', persist)
    }
  }, [key, navigationType])

  return null
}
