import { useSyncExternalStore } from 'react'

function subscribe(onChange) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

// True once the page has scrolled more than `offset` pixels.
export function useScrolled(offset = 0) {
  return useSyncExternalStore(subscribe, () => window.scrollY > offset)
}
