import { useEffect, useState } from 'react'

// Tells screen readers when the page changes, which a client-side route change
// doesn't do by itself. Follows the title, because pages that load their data
// only know their real title once it arrives.
export default function PageAnnouncer() {
  const [announced, setAnnounced] = useState('')

  useEffect(() => {
    let current = document.title
    let timer
    const observer = new MutationObserver(() => {
      if (document.title === current) return
      current = document.title
      clearTimeout(timer)
      // A short wait, so only the last of several quick changes is read out.
      timer = setTimeout(() => setAnnounced(current), 300)
    })
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return (
    <p role="status" className="sr-only">
      {announced}
    </p>
  )
}
