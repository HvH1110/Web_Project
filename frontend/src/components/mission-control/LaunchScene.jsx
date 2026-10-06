import { Card } from '@/components/ui/card'
import { useNow } from '@/hooks/useNow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { formatMet, formatMinSec } from '@/lib/format'
import { ASCENT, IGNITION_MS, holdReason, launchPhase } from '@/lib/telemetry'
import { cn } from '@/lib/utils'
import SaturnV from './SaturnV'
import { PIVOT, SEGMENTS, launchPose, missionCalls } from './launchPose'
import './launch-scene.css'

// The viewBox frames the pad (deck at y = 580, rocket centered on x = 400) and is
// always shown whole. Sky, stars and ground are drawn far past it, so whatever
// shape the card has, the extra room shows more scenery instead of cropping.
const VIEW_BOX = '190 70 420 575'
const TOWER = '#c4472b'
const ROCKET_TRANSFORM = 'translate(366 200) scale(0.85)'

// Deterministic pseudo-random numbers for stars, ice and the tree line.
function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

const STARS = (() => {
  const rand = seeded(506)
  return Array.from({ length: 56 }, () => ({
    x: rand() * 400,
    y: rand() * 320,
    r: 0.4 + rand() * 1.2,
    o: 0.35 + rand() * 0.65,
  }))
})()

const ICE = (() => {
  const rand = seeded(1969)
  return Array.from({ length: 26 }, () => ({
    x: 384 + rand() * 32,
    y: 330 + rand() * 230,
    delay: rand() * 1.8,
  }))
})()

const TREELINE = (() => {
  const rand = seeded(39)
  const bumps = Array.from({ length: 50 }, () => `q6 ${-(3 + rand() * 6).toFixed(1)} 12 0`)
  return `M-1200 568 L100 568 ${bumps.join(' ')} L2000 568 V580 H-1200 Z`
})()

// Launch umbilical tower lattice, x 319-355, y 110-580.
const TOWER_FRAME = ['M319 580 V110 M355 580 V110']
const TOWER_BRACES = []
for (let y = 110; y < 580; y += 23.5) {
  TOWER_FRAME.push(`M319 ${y} H355`)
  TOWER_BRACES.push(`M319 ${y} L355 ${y + 23.5} M355 ${y} L319 ${y + 23.5}`)
}

// Swing arms from the tower to the S-IC, S-II, S-IVB and service module.
const ARMS = [
  { y: 455, x2: 383 },
  { y: 412, x2: 383 },
  { y: 361, x2: 383 },
  { y: 310, x2: 389 },
  { y: 254, x2: 393 },
]

// Exhaust clouds billowing out of the flame trench along the deck.
const SMOKE = [
  [240, 606, 34],
  [280, 596, 40],
  [320, 588, 46],
  [360, 598, 50],
  [400, 610, 56],
  [440, 598, 50],
  [480, 588, 46],
  [520, 596, 40],
  [560, 606, 34],
  [300, 622, 36],
  [500, 622, 36],
]

// Cloud deck the rocket climbs through, parked above the frame until liftoff.
const CLOUDS = [
  [250, -260, 1.2],
  [560, -420, 1],
  [330, -640, 1.4],
  [520, -860, 1.1],
  [200, -1000, 0.9],
]

const DEFS = (
  <defs>
    <linearGradient id="lc-sky" x1="0" x2="0" y1="70" y2="580" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#0a3d8f" />
      <stop offset="0.55" stopColor="#2a7fd4" />
      <stop offset="1" stopColor="#a6d8f7" />
    </linearGradient>
    <radialGradient id="lc-sun">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.08" stopColor="#fffdf5" />
      <stop offset="0.3" stopColor="#fff6dc" stopOpacity="0.35" />
      <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>
    <pattern id="lc-star-tile" width="400" height="320" patternUnits="userSpaceOnUse">
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
    </pattern>
    <radialGradient id="lc-fire">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="0.25" stopColor="#fff1b8" />
      <stop offset="0.55" stopColor="#ffb02e" stopOpacity="0.85" />
      <stop offset="1" stopColor="#ff4d0d" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="lc-jet-left" x1="1" x2="0">
      <stop offset="0" stopColor="#fff1b8" />
      <stop offset="0.4" stopColor="#ff9a1f" stopOpacity="0.9" />
      <stop offset="1" stopColor="#ff4d0d" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="lc-jet-right" x1="0" x2="1">
      <stop offset="0" stopColor="#fff1b8" />
      <stop offset="0.4" stopColor="#ff9a1f" stopOpacity="0.9" />
      <stop offset="1" stopColor="#ff4d0d" stopOpacity="0" />
    </linearGradient>
    {/* Exhaust clouds, lit orange from below by the engines. */}
    <linearGradient id="lc-cloud" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#fbf8f2" />
      <stop offset="0.6" stopColor="#e2dcd2" />
      <stop offset="1" stopColor="#ffb36b" />
    </linearGradient>
    <radialGradient id="lc-earth" cx="0.5" cy="0" r="0.75">
      <stop offset="0" stopColor="#3f8fe0" />
      <stop offset="0.35" stopColor="#1757a8" />
      <stop offset="1" stopColor="#061b3f" />
    </radialGradient>
    <filter id="lc-soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
    <filter id="lc-haze" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="9" />
    </filter>
  </defs>
)

const SUN = <circle cx="585" cy="118" r="230" fill="url(#lc-sun)" />

const EARTH = (
  <g>
    <circle cx="400" cy="1650" r="1150" fill="url(#lc-earth)" />
    <g fill="#fff" opacity="0.55" filter="url(#lc-soft)">
      <ellipse cx="300" cy="530" rx="90" ry="10" />
      <ellipse cx="520" cy="545" rx="120" ry="12" />
      <ellipse cx="410" cy="600" rx="160" ry="16" />
    </g>
    <circle
      cx="400"
      cy="1650"
      r="1158"
      fill="none"
      stroke="#7dd3fc"
      strokeOpacity="0.7"
      strokeWidth="14"
      filter="url(#lc-soft)"
    />
  </g>
)

const CLOUD_DECK = CLOUDS.map(([x, y, k]) => (
  <g key={y} transform={`translate(${x} ${y}) scale(${k})`} fill="#fff" opacity="0.9" filter="url(#lc-soft)">
    <ellipse cx="0" cy="0" rx="70" ry="18" />
    <ellipse cx="-30" cy="-10" rx="34" ry="16" />
    <ellipse cx="22" cy="-14" rx="40" ry="20" />
  </g>
))

const GROUND_BACK = (
  <>
    {/* Atlantic, beach, scrub and the Vehicle Assembly Building on the horizon */}
    <rect x="-1200" y="550" width="3200" height="14" fill="#1d6fb8" />
    <rect x="-1200" y="550" width="3200" height="2" fill="#7cc4f0" />
    <rect x="-1200" y="562" width="3200" height="4" fill="#dcc690" />
    <rect x="-1200" y="566" width="3200" height="200" fill="#2b4a2f" />
    <path d={TREELINE} fill="#1d3a24" />
    <rect x="198" y="512" width="40" height="56" fill="#d4d6d9" />
    <rect x="198" y="512" width="12" height="56" fill="#b3b6ba" />
    <path d="M216 512 V568 M224 512 V568 M232 512 V568" stroke="#a3a7ac" strokeWidth="0.6" />
    {/* Pad 39A hardstand, mobile launcher deck, flame trench */}
    <path d="M170 600 L230 584 H570 L630 600 L740 766 H60 Z" fill="#76787b" />
    <path d="M170 600 L230 584 H570 L630 600 Z" fill="#8a8c8f" />
    <rect x="250" y="580" width="300" height="24" fill="#7b7d80" />
    <rect x="250" y="580" width="300" height="2" fill="#a2a4a7" />
    <rect x="386" y="582" width="28" height="22" fill="#2a2b2e" />
    {/* Launch umbilical tower */}
    <path d={TOWER_FRAME.join(' ')} stroke={TOWER} strokeWidth="2" fill="none" />
    <path d={TOWER_BRACES.join(' ')} stroke={TOWER} strokeWidth="0.8" fill="none" />
    <path d="M308 102 H380 V110 H308 Z M327 92 H347 V102 H327 Z" fill={TOWER} />
    <path d="M376 110 V128" stroke={TOWER} strokeWidth="1" />
    {ARMS.map(({ y, x2 }) => (
      <rect key={y} className="lc-arm" x="355" y={y - 2} width={x2 - 355} height="4" fill={TOWER} />
    ))}
  </>
)

const GROUND_FRONT = (
  <>
    <path
      className="lc-jet"
      d="M392 596 C340 590 280 598 214 618 C280 614 340 610 392 608 Z"
      fill="url(#lc-jet-left)"
    />
    <path
      className="lc-jet"
      d="M408 596 C460 590 520 598 586 618 C520 614 460 610 408 608 Z"
      fill="url(#lc-jet-right)"
    />
    <g className="lc-smoke" fill="url(#lc-cloud)" filter="url(#lc-soft)">
      {SMOKE.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </g>
    <ellipse className="lc-fire" cx="400" cy="600" rx="110" ry="30" fill="url(#lc-fire)" filter="url(#lc-haze)" />
    <g className="lc-ice" fill="#eef6ff">
      {ICE.map(({ x, y, delay }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.4" height="2.6" style={{ animationDelay: `${delay}s` }} />
      ))}
    </g>
  </>
)

const SCENE_LABEL = {
  acquiring: 'Saturn V on the pad at Launch Complex 39A, waiting for telemetry.',
  hold: 'Saturn V on the pad at Launch Complex 39A. Launch on hold.',
  countdown: 'Saturn V on the pad, counting down to launch.',
  liftoff: 'Saturn V lifting off from Launch Complex 39A.',
  flight: 'Apollo 11 in flight. All stations GO.',
}

function readout(phase, t, stations) {
  if (phase === 'acquiring') {
    return { label: 'Launch status', value: 'STANDBY', tone: 'idle', caption: 'Waiting for the first health check.' }
  }
  if (phase === 'hold') {
    return { label: 'Launch status', value: 'HOLD', tone: 'hold', caption: holdReason(stations) }
  }
  if (phase === 'countdown') {
    return {
      label: 'Countdown',
      value: `T−${String(Math.min(10, Math.ceil(-t / 1000))).padStart(2, '0')}`,
      tone: 'count',
      caption: -t <= IGNITION_MS ? 'Ignition sequence start.' : 'All stations GO. Launch sequence start.',
      next: { label: 'Liftoff', in: -t },
    }
  }
  const { last, next } = missionCalls(t / 1000)
  return {
    label: 'Mission elapsed time',
    value: `T+${formatMet(t)}`,
    tone: 'met',
    caption: last.call,
    next: next && { label: next.label, in: next.t * 1000 - t },
  }
}

function AscentStrip({ s }) {
  const inOrbit = s >= ASCENT.ORBIT
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {SEGMENTS.map(({ label, from, to }) => {
        const fill = Math.min(1, Math.max(0, (s - from) / (to - from)))
        const active = s >= from && s < to
        return (
          <div key={label} className="grid gap-1" style={{ flexGrow: to - from, flexBasis: 0 }}>
            <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(255_255_255/0.12)]">
              <div
                className="h-full rounded-full bg-(--phosphor) shadow-[0_0_8px_var(--phosphor-glow)]"
                style={{ width: `${fill * 100}%` }}
              />
            </div>
            <span className={cn('font-mono text-[10px] tracking-widest', active ? 'text-(--phosphor)' : 'text-muted-foreground')}>
              {label}
            </span>
          </div>
        )
      })}
      <span
        className={cn(
          'mb-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-widest',
          inOrbit ? 'bg-(--phosphor) text-[#05070c] shadow-[0_0_10px_var(--phosphor-glow)]' : 'text-muted-foreground ring-1 ring-border',
        )}
      >
        ORBIT
      </span>
    </div>
  )
}

// The launch scene drawing for a given pose.
function SceneView({ phase, pose, label, className }) {
  const flag = (on) => (on ? '' : undefined)
  const { x, y, pitch } = pose.rocket

  return (
    <svg
      className={cn('lc-scene', className)}
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMax meet"
      data-phase={phase}
      data-snap={flag(pose.snap)}
      data-ignition={flag(pose.flags.ignition)}
      data-launched={flag(pose.flags.launched)}
      data-shake={flag(pose.flags.shake)}
      data-ice={flag(pose.flags.ice)}
      data-drift={flag(pose.flags.drift)}
      data-s1sep={flag(pose.flags.s1sep)}
      data-les={flag(pose.flags.les)}
      data-s2sep={flag(pose.flags.s2sep)}
      style={{
        '--f1': pose.plume.f1,
        '--f1sx': pose.plume.f1sx,
        '--f1sy': pose.plume.f1sy,
        '--s2': pose.plume.s2,
        '--s3': pose.plume.s3,
      }}
      role="img"
      aria-label={label}
    >
      {DEFS}
      <rect x="-1200" y="-2000" width="3200" height="3000" fill="#02040a" />
      <g className="lc-camera">
        <g className="lc-smooth" style={{ opacity: pose.stars }}>
          <rect className="lc-star-drift" x="-1200" y="-2000" width="3200" height="2700" fill="url(#lc-star-tile)" />
        </g>
        <rect
          className="lc-smooth"
          style={{ opacity: pose.sky }}
          x="-1200"
          y="-2000"
          width="3200"
          height="3200"
          fill="url(#lc-sky)"
        />
        {SUN}
        <g className="lc-smooth" style={{ opacity: pose.earth }}>
          {EARTH}
        </g>
        <g className="lc-smooth" style={{ transform: `translateY(${pose.clouds}px)`, opacity: pose.sky }}>
          {CLOUD_DECK}
        </g>
        <g className="lc-smooth" style={{ transform: `translateY(${pose.ground}px)` }}>
          {GROUND_BACK}
        </g>
        <g
          className="lc-smooth"
          style={{
            transform: `translate(${x}px, ${y}px) rotate(${pitch}deg)`,
            transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
          }}
        >
          <g transform={ROCKET_TRANSFORM}>
            <SaturnV />
          </g>
        </g>
        <g className="lc-smooth" style={{ transform: `translateY(${pose.ground}px)` }}>
          {GROUND_FRONT}
        </g>
      </g>
    </svg>
  )
}

export default function LaunchScene({ overall, goSince, stations, className }) {
  const now = useNow(250)
  const reducedMotion = usePrefersReducedMotion()
  const { phase, t } = launchPhase(overall, goSince, now)
  const pose = launchPose(phase, t, reducedMotion)
  const { label, value, tone, caption, next } = readout(phase, t, stations)

  return (
    <Card className={cn('mc-panel gap-0 overflow-hidden py-0', className)}>
      <div className="relative min-h-[460px] flex-1 overflow-hidden bg-[#02040a]">
        <SceneView
          className="absolute inset-0 size-full"
          phase={phase}
          pose={pose}
          label={SCENE_LABEL[phase]}
        />

        <p className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] tracking-widest text-(--plate) uppercase ring-1 ring-white/10">
          SA-506 · Launch Complex 39A
        </p>
      </div>

      <div className="mc-crt grid gap-3 border-t px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="mc-plate">{label}</p>
            <p className="mc-glow font-crt text-5xl leading-none tabular-nums sm:text-6xl" data-tone={tone}>
              {value}
            </p>
          </div>
          {next && (
            <div className="text-right">
              <p className="mc-plate">Next · {next.label}</p>
              <p className="mc-glow font-crt text-3xl leading-none tabular-nums">{formatMinSec(next.in)}</p>
            </div>
          )}
        </div>
        <p className="min-h-5 font-mono text-sm text-(--phosphor)">{caption}</p>
        <AscentStrip s={phase === 'liftoff' || phase === 'flight' ? t / 1000 : -1} />
      </div>
    </Card>
  )
}
