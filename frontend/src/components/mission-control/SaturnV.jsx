// Saturn V SA-506 (Apollo 11), side view, split into the parts that separate in
// flight: S-IC, S-II, S-IVB, the spacecraft and the launch escape tower. Units:
// centered on x = 40, tower tip at y = 0, F-1 nozzle exits at y = 452, roughly
// to scale. Plumes, venting and separation puffs are driven by CSS on the scene.
import { memo } from 'react'

const F1_XS = [40, 28, 52] // center engine first, outer two in front of it
const J2_XS = [32, 40, 48]

// Vertical lettering, one tspan per letter.
function Vertical({ text, y, step = 7.4, size = 7 }) {
  return (
    <text
      fontSize={size}
      fontWeight="700"
      textAnchor="middle"
      fill="#111"
      fontFamily="Arial, Helvetica, sans-serif"
    >
      {[...text].map((ch, i) => (
        <tspan key={i} x="40" y={y + i * step}>
          {ch}
        </tspan>
      ))}
    </text>
  )
}

function Bell({ x, top, bottom, half = 4.5, flare = 2 }) {
  return (
    <path
      d={`M${x - half} ${top} H${x + half} L${x + half + flare} ${bottom} H${x - half - flare} Z`}
      fill="url(#sv-engine)"
    />
  )
}

function SaturnV(props) {
  return (
    <g {...props}>
      <defs>
        {/* Sunlight from the right. */}
        <linearGradient id="sv-hull" x1="0" x2="1">
          <stop offset="0" stopColor="#7d7b75" />
          <stop offset="0.35" stopColor="#dedcd5" />
          <stop offset="0.7" stopColor="#ffffff" />
          <stop offset="0.86" stopColor="#f1f0eb" />
          <stop offset="1" stopColor="#9c9a93" />
        </linearGradient>
        {/* Shared across the stages so the black paint shades like the hull. */}
        <linearGradient id="sv-paint" x1="20" x2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#040404" />
          <stop offset="0.6" stopColor="#2c2c2c" />
          <stop offset="0.78" stopColor="#474747" />
          <stop offset="1" stopColor="#070707" />
        </linearGradient>
        <linearGradient id="sv-engine" x1="0" x2="1">
          <stop offset="0" stopColor="#121212" />
          <stop offset="0.45" stopColor="#3b3835" />
          <stop offset="0.72" stopColor="#6a655f" />
          <stop offset="1" stopColor="#101010" />
        </linearGradient>
        {/* F-1: a dark film-cooled sheath right under the nozzles, then fire. */}
        <linearGradient id="sv-f1-outer" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2a1a0e" />
          <stop offset="0.05" stopColor="#6b3a14" />
          <stop offset="0.1" stopColor="#ffd27a" />
          <stop offset="0.25" stopColor="#ffb02e" />
          <stop offset="0.5" stopColor="#ff7a1a" stopOpacity="0.95" />
          <stop offset="0.78" stopColor="#ff4d0d" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff3d00" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sv-f1-core" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff8e1" stopOpacity="0" />
          <stop offset="0.1" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#fff4c7" />
          <stop offset="0.8" stopColor="#ffd27a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </linearGradient>
        {/* J-2 (hydrogen): a pale, nearly clear plume that fans out in vacuum. */}
        <linearGradient id="sv-j2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f5fbff" stopOpacity="0.95" />
          <stop offset="0.2" stopColor="#c7ecff" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="#7cc8ff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#5ab4ff" stopOpacity="0" />
        </linearGradient>
        <filter id="sv-soft" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id="sv-vapor" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>

      {/* S-IC first stage: F-1 plume, engines, fins, roll pattern, lettering */}
      <g className="sv-s1">
        <g className="sv-plume sv-plume-f1">
          <path d="M16 450 C6 520 10 640 40 790 C70 640 74 520 64 450 Z" fill="url(#sv-f1-outer)" />
          <path
            className="sv-flicker"
            d="M26 452 C22 505 30 580 40 660 C50 580 58 505 54 452 Z"
            fill="url(#sv-f1-core)"
          />
        </g>
        {F1_XS.map((x) => (
          <Bell key={x} x={x} top={436} bottom={452} flare={2} />
        ))}
        <path d="M20 410 L15 440 H23 V410 Z M60 410 L65 440 H57 V410 Z" fill="url(#sv-hull)" />
        <path d="M20 402 L9 428 V441 L20 437 Z" fill="url(#sv-hull)" stroke="#5e5c57" strokeWidth="0.4" />
        <path d="M60 402 L71 428 V441 L60 437 Z" fill="url(#sv-hull)" stroke="#5e5c57" strokeWidth="0.4" />
        <rect x="20" y="272" width="40" height="166" fill="url(#sv-hull)" />
        <path d="M20 272 h10 v10 h-10 Z M40 272 h10 v10 h-10 Z" fill="url(#sv-paint)" />
        <g transform="translate(36.5 285)">
          <rect width="7" height="4.6" fill="#b8323f" />
          <path d="M0 1.3 H7 M0 3 H7" stroke="#f4f4f2" strokeWidth="0.7" />
          <rect width="3" height="2.4" fill="#2e3a6e" />
        </g>
        <Vertical text="UNITED" y={300} />
        <Vertical text="STATES" y={350} />
        <path d="M20 330 h10 v10 h-10 Z M50 330 h10 v10 h-10 Z" fill="url(#sv-paint)" />
        <path d="M20 345 h7 v77 h-7 Z M53 345 h7 v77 h-7 Z" fill="url(#sv-paint)" />
        <path d="M20 422 H60" stroke="#000" strokeOpacity="0.25" strokeWidth="0.6" />
      </g>

      {/* S-II second stage: five J-2s, hidden inside the interstage until staging */}
      <g className="sv-s2">
        <g className="sv-plume sv-plume-s2">
          <path d="M30 284 L50 284 L94 480 L-14 480 Z" fill="url(#sv-j2)" />
          <path className="sv-flicker" d="M34 284 L46 284 L55 390 L25 390 Z" fill="url(#sv-j2)" />
        </g>
        <g className="sv-after-s1">
          {J2_XS.map((x) => (
            <Bell key={x} x={x} top={272} bottom={284} half={2.6} flare={1.6} />
          ))}
        </g>
        <rect x="20" y="176" width="40" height="96" fill="url(#sv-hull)" />
        <Vertical text="USA" y={198} step={8} />
        <rect x="20" y="246" width="40" height="5" fill="url(#sv-paint)" />
        <circle className="sv-puff sv-puff-s1" cx="16" cy="270" r="7" fill="#fff" filter="url(#sv-soft)" />
        <circle className="sv-puff sv-puff-s1" cx="64" cy="270" r="7" fill="#fff" filter="url(#sv-soft)" />
      </g>

      {/* S-IVB third stage and its aft interstage */}
      <g className="sv-s3">
        <g className="sv-plume sv-plume-s3">
          <path d="M36 188 L44 188 L72 340 L8 340 Z" fill="url(#sv-j2)" />
          <path className="sv-flicker" d="M37.5 188 L42.5 188 L47 262 L33 262 Z" fill="url(#sv-j2)" />
        </g>
        <g className="sv-after-s2">
          <Bell x={40} top={176} bottom={188} half={2.8} flare={1.8} />
        </g>
        <rect x="26.8" y="110" width="26.4" height="44" fill="url(#sv-hull)" />
        <path d="M26.8 146 h6.6 v8 h-6.6 Z M40 146 h6.6 v8 h-6.6 Z" fill="url(#sv-paint)" />
        <path d="M26.8 154 H53.2 L60 176 H20 Z" fill="url(#sv-hull)" />
        <circle className="sv-puff sv-puff-s2" cx="17" cy="176" r="6" fill="#fff" filter="url(#sv-soft)" />
        <circle className="sv-puff sv-puff-s2" cx="63" cy="176" r="6" fill="#fff" filter="url(#sv-soft)" />
      </g>

      {/* Instrument unit, spacecraft-LM adapter, service module, command module */}
      <g className="sv-csm">
        <rect x="26.8" y="106" width="26.4" height="4" fill="#cfcdc6" />
        <path d="M32 74 H48 L53.2 106 H26.8 Z" fill="url(#sv-hull)" />
        <path d="M36 74 L33.6 106 M40 74 V106 M44 74 L46.4 106" stroke="#000" strokeOpacity="0.1" strokeWidth="0.5" />
        <rect x="32" y="56" width="16" height="18" fill="url(#sv-hull)" />
        <path d="M32 62 H48 M32 68 H48" stroke="#000" strokeOpacity="0.12" strokeWidth="0.5" />
        <rect x="30.6" y="59" width="1.6" height="3.2" fill="#8d8c87" />
        <rect x="47.8" y="59" width="1.6" height="3.2" fill="#8d8c87" />
        <path d="M37.6 42 H42.4 L48 56 H32 Z" fill="url(#sv-hull)" />
      </g>

      {/* Launch escape system */}
      <g className="sv-les">
        <path className="sv-les-burn" d="M37.6 27 L33 36 L38.6 30 Z M42.4 27 L47 36 L41.4 30 Z" fill="#ffb02e" />
        <path d="M40 0 L41.4 6 H38.6 Z" fill="#d6d5cf" />
        <rect x="38.6" y="6" width="2.8" height="18" fill="url(#sv-hull)" />
        <rect x="37.6" y="24" width="4.8" height="3" fill="#2e2e2e" />
        <path
          d="M38 27 L35.6 42 M42 27 L44.4 42 M38 27 L44.4 42 M42 27 L35.6 42 M36.8 34.5 H43.2"
          stroke="#3b3b3b"
          strokeWidth="0.8"
          fill="none"
        />
      </g>

      {/* Liquid oxygen boiling off through the vents while on the pad */}
      <g className="sv-vents" fill="#f4f8ff" filter="url(#sv-vapor)">
        {[
          [17, 336, 0],
          [63, 336, 1.1],
          [17, 182, 0.5],
          [63, 182, 1.7],
          [24, 150, 2.3],
          [56, 150, 0.8],
        ].map(([cx, cy, delay]) => (
          <ellipse
            key={`${cx}-${cy}`}
            className={cx < 40 ? 'sv-vent-left' : 'sv-vent-right'}
            cx={cx}
            cy={cy}
            rx="6"
            ry="3.5"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </g>
    </g>
  )
}

// Static drawing: skip re-rendering it on every scene tick.
export default memo(SaturnV)
