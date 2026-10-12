import { useEffect, useRef, useState } from 'react'

// Fades and lifts its content in the first time it scrolls into view.
// `delay` (ms) staggers siblings. Styles live in index.css ([data-reveal])
// and switch off under prefers-reduced-motion.
export default function Reveal({ as: Tag = 'div', delay = 0, style, ...props }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? 'shown' : 'hidden'}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...props}
    />
  )
}
