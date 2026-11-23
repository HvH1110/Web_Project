import { useState } from 'react'
import { cn } from '@/lib/utils'

// A product picture from a store, a brand site or the web archive. It stays
// hidden until it has loaded, then fades in, so a slow or dead link never shows
// a broken-image icon or its alt text over the backdrop behind it. `onFail` is
// told when it doesn't load, so the caller can try the next picture (see
// hooks/useWorkingImages.js).
export default function Photo({ src, onFail, onLoad, className, ...props }) {
  const [loaded, setLoaded] = useState(null)
  return (
    <img
      src={src}
      decoding="async"
      {...props}
      onLoad={(event) => {
        setLoaded(src)
        onLoad?.(event)
      }}
      onError={onFail}
      className={cn('transition-opacity duration-700 ease-lux', className, loaded !== src && 'invisible opacity-0')}
    />
  )
}
