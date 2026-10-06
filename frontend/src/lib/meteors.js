// Meteor shower for the galaxy backdrop. Meteors stream across the screen away
// from a radiant far off the top-right corner (like the Perseids), at random
// intervals with the odd burst; some are bright fireballs. Each meteor is one
// element animated on the compositor, removed when it finishes.

const MAX_ACTIVE = 6
const FIREBALL_HEADS = ['#b9ffd6', '#ffe1a8', '#cfe3ff']

const between = (a, b) => a + Math.random() * (b - a)

function launch(container) {
  const w = window.innerWidth
  const h = window.innerHeight
  // Far up and to the right, so meteors sweep across rather than drop.
  const radiant = { x: w * 1.45, y: -h * 0.45 }

  // Start somewhere in the upper part of the screen and fly away from the radiant.
  const sx = between(w * 0.25, w * 1.05)
  const sy = between(-h * 0.05, h * 0.5)
  const angle = Math.atan2(sy - radiant.y, sx - radiant.x)
  const distance = between(0.55, 1.05) * Math.hypot(w, h)
  const dx = Math.cos(angle) * distance
  const dy = Math.sin(angle) * distance

  const fireball = Math.random() < 0.12
  const length = fireball ? between(320, 520) : between(180, 380)
  const duration = (distance / (fireball ? between(650, 900) : between(1000, 1700))) * 1000

  const el = document.createElement('span')
  el.className = fireball ? 'meteor meteor-fireball' : 'meteor'
  if (fireball) el.style.setProperty('--head', FIREBALL_HEADS[Math.floor(Math.random() * FIREBALL_HEADS.length)])
  // The element's right end is the head; it is anchored on the start point.
  el.style.left = `${sx - length}px`
  el.style.top = `${sy}px`
  el.style.width = `${length}px`
  container.append(el)

  const at = (k, stretch) => `translate(${dx * k}px, ${dy * k}px) rotate(${angle}rad) scaleX(${stretch})`
  const animation = el.animate(
    [
      { transform: at(0, 0.15), opacity: 0 },
      { transform: at(0.12, 1), opacity: 1, offset: 0.12 },
      { transform: at(0.75, 1), opacity: 1, offset: 0.75 },
      { transform: at(1, 0.5), opacity: 0 },
    ],
    { duration, easing: 'cubic-bezier(0.25, 0.5, 0.4, 1)' },
  )
  animation.onfinish = animation.oncancel = () => el.remove()
}

// Starts the shower in `container`; returns a function that stops it.
export function startMeteorShower(container) {
  let timer

  function schedule(delay) {
    timer = setTimeout(tick, delay)
  }

  function tick() {
    if (!document.hidden && container.childElementCount < MAX_ACTIVE) {
      launch(container)
      // Now and then a short burst of two or three.
      if (Math.random() < 0.22) {
        const extra = Math.random() < 0.5 ? 1 : 2
        for (let i = 1; i <= extra; i++) setTimeout(() => launch(container), i * between(140, 420))
      }
    }
    schedule(between(700, 3200))
  }

  schedule(between(400, 1500))
  return () => {
    clearTimeout(timer)
    container.getAnimations({ subtree: true }).forEach((a) => a.cancel())
  }
}
