// Where everything in the launch scene is at a given moment. Pure: the scene
// re-renders a few times a second and CSS smooths between poses.
import { ASCENT, IGNITION_MS, MISSION_EVENTS } from '@/lib/telemetry'

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (x) => {
  const k = clamp01(x)
  return k * k * (3 - 2 * k)
}
const lerp = (a, b, k) => a + (b - a) * k

// The rocket pitches about the full stack's center (scene units).
export const PIVOT = { x: 400, y: 392 }
// How far the remaining stack's center sits above PIVOT once stages drop away.
const S2_STACK_OFFSET = -72
const S3_STACK_OFFSET = -95

const PAD = {
  snap: false,
  ground: 0,
  rocket: { x: 0, y: 0, pitch: 0 },
  sky: 1,
  stars: 0,
  clouds: 0,
  earth: 0,
  plume: { f1: 0, f1sx: 1, f1sy: 1, s2: 0, s3: 0 },
  flags: {},
}

// Gravity turn, drawn as a tracking shot: upright through the roll program,
// leaning over stage by stage, horizontal in orbit.
function pitchAt(s) {
  const { ROLL, S1_SEP, S2_SEP, S3_CUTOFF } = ASCENT
  if (s < ROLL) return 0
  if (s < S1_SEP) return lerp(0, 25, smooth((s - ROLL) / (S1_SEP - ROLL)))
  if (s < S2_SEP) return lerp(25, 45, smooth((s - S1_SEP) / (S2_SEP - S1_SEP)))
  if (s < S3_CUTOFF) return lerp(45, 60, smooth((s - S2_SEP) / (S3_CUTOFF - S2_SEP)))
  return lerp(60, 90, smooth((s - S3_CUTOFF) / 10))
}

// phase/t come from launchPhase(); t is ms relative to T-0.
export function launchPose(phase, t, reducedMotion) {
  if (phase === 'acquiring' || phase === 'hold') return { ...PAD, snap: true }

  if (phase === 'countdown') {
    const ignited = -t <= IGNITION_MS
    const build = clamp01((IGNITION_MS + t) / IGNITION_MS)
    return {
      ...PAD,
      plume: { ...PAD.plume, f1: ignited ? 0.9 : 0, f1sy: 0.2 + 0.5 * build },
      flags: { ignition: ignited, shake: ignited },
    }
  }

  // Seconds since liftoff. With reduced motion, skip the climb off the pad.
  const s = reducedMotion ? Math.max(t / 1000, ASCENT.TOWER_CLEAR) : t / 1000
  const { S1_SEP, S2_IGNITION, LES_JETTISON, S2_SEP, S3_IGNITION, S3_CUTOFF } = ASCENT

  const pitch = pitchAt(s)
  const rad = (pitch * Math.PI) / 180
  // Re-frame on the shorter stack after each staging, over a few seconds.
  const offset =
    lerp(0, S2_STACK_OFFSET, smooth((s - S1_SEP) / 4)) +
    lerp(0, S3_STACK_OFFSET - S2_STACK_OFFSET, smooth((s - S2_SEP) / 4))
  const lift = -70 * smooth((s - 0.5) / 6)
  const targetY = PIVOT.y + lift + lerp(0, -30, smooth((s - S3_CUTOFF) / 10))
  const altitude = smooth((s - 30) / 130)

  return {
    snap: false,
    ground: 720 * clamp01((s - 0.5) / 7.5) ** 2,
    rocket: {
      x: offset * Math.sin(rad),
      y: targetY - PIVOT.y - offset * Math.cos(rad),
      pitch,
    },
    sky: 1 - smooth((s - 15) / 135),
    stars: smooth((s - 90) / 70),
    // The cloud deck streams past and leaves the frame well before space.
    clouds: 2600 * smooth((s - 9) / 30),
    earth: smooth((s - S3_CUTOFF + 5) / 15),
    plume: {
      f1: s < S1_SEP ? 1 : 0,
      // The F-1 plume balloons as the air thins.
      f1sx: 1 + 1.3 * altitude,
      f1sy: 1 + 0.5 * altitude,
      s2: s >= S2_IGNITION && s < S2_SEP ? 1 : 0,
      s3: s >= S3_IGNITION && s < S3_CUTOFF ? 1 : 0,
    },
    flags: {
      launched: true,
      shake: s < ASCENT.TOWER_CLEAR,
      ice: s < 10,
      drift: s > 60 && s < S3_CUTOFF,
      s1sep: s >= S1_SEP,
      les: s >= LES_JETTISON,
      s2sep: s >= S2_SEP,
    },
  }
}

// Latest call made and the next one coming, at s seconds after liftoff.
export function missionCalls(s) {
  let last = null
  let next = null
  for (const event of MISSION_EVENTS) {
    if (event.t <= s) last = event
    else if (!next) next = event
  }
  return { last, next }
}

// Ascent segments for the progress strip, in seconds after liftoff.
export const SEGMENTS = [
  { label: 'S-IC', from: 0, to: ASCENT.S1_SEP },
  { label: 'S-II', from: ASCENT.S1_SEP, to: ASCENT.S2_SEP },
  { label: 'S-IVB', from: ASCENT.S2_SEP, to: ASCENT.ORBIT },
]
