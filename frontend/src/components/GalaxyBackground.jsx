import { useEffect, useRef, useState } from 'react'
import milkyWay1600 from '@/assets/milky-way/milky-way-1600.webp'
import milkyWay2560 from '@/assets/milky-way/milky-way-2560.webp'
import milkyWay4800 from '@/assets/milky-way/milky-way-4800.webp'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { startMeteorShower } from '@/lib/meteors'

// ESO's Milky Way panorama (eso0932a, CC BY 4.0), cropped to the galactic
// core and contrast-boosted. The photo is drawn tilted and much wider than the
// viewport (see .galaxy-photo), so `sizes` asks for roughly that width.
const SRC_SET = `${milkyWay1600} 1600w, ${milkyWay2560} 2560w, ${milkyWay4800} 4800w`
const SIZES = '(max-width: 600px) 160vw, (orientation: portrait) 300vw, 170vw'

// Deterministic twinkling stars, placed in percent of the viewport.
const TWINKLES = (() => {
  let seed = 11
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 40 }, (_, i) => (
    <span
      key={i}
      style={{
        left: `${(rand() * 100).toFixed(2)}%`,
        top: `${(rand() * 100).toFixed(2)}%`,
        '--d': `${(3 + rand() * 5).toFixed(1)}s`,
        '--delay': `${(-rand() * 8).toFixed(1)}s`,
      }}
    />
  ))
})()

// Milky Way backdrop shared by every page, with ambient glow, drift, twinkle and
// a meteor shower. Fixed behind all content; purely decorative.
export default function GalaxyBackground() {
  const meteorsRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    return startMeteorShower(meteorsRef.current)
  }, [reducedMotion])

  return (
    <div className="galaxy" aria-hidden="true">
      <img
        className="galaxy-photo"
        src={milkyWay2560}
        srcSet={SRC_SET}
        sizes={SIZES}
        alt=""
        decoding="async"
        data-loaded={loaded ? '' : undefined}
        onLoad={() => setLoaded(true)}
      />
      <div className="galaxy-glow" />
      <div className="galaxy-twinkle">{TWINKLES}</div>
      <div className="galaxy-vignette" />
      <div ref={meteorsRef} className="galaxy-meteors" />
    </div>
  )
}

// Credit line for the backdrop photo, required by its CC BY 4.0 licence.
// Rendered after the pages so it sits at the bottom of every page.
export function GalaxyCredit() {
  return (
    <p className="galaxy-credit">
      Milky Way:{' '}
      <a href="https://www.eso.org/public/images/eso0932a/" target="_blank" rel="noreferrer">
        ESO/S. Brunier
      </a>{' '}
      ·{' '}
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
        CC BY 4.0
      </a>{' '}
      · cropped, toned
    </p>
  )
}
