import { useId } from 'react'
import { cn } from '@/lib/utils'

// Generic mission emblem (not the official Apollo 11 patch): crescent moon and an 11.
export default function Emblem({ className }) {
  const maskId = `${useId()}-crescent`
  return (
    <svg viewBox="0 0 48 48" className={cn('size-11 shrink-0', className)} aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <circle cx="19" cy="24" r="10" fill="#fff" />
          <circle cx="23.5" cy="21.5" r="9" fill="#000" />
        </mask>
      </defs>
      <circle cx="24" cy="24" r="22" fill="#07090e" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke="#f5c86b" strokeOpacity="0.6" strokeWidth="0.75" />
      <circle cx="19" cy="24" r="10" fill="#f4f7fc" mask={`url(#${maskId})`} />
      <text x="25" y="31" fontSize="14" fontFamily="VT323, monospace" fill="#ffffff">
        11
      </text>
    </svg>
  )
}
