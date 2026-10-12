import { useLayoutEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import SiteFooter from '@/components/layout/SiteFooter'
import SiteHeader from '@/components/layout/SiteHeader'

// The first page of a visit always has key "default", whatever its URL, so
// key that one by path or a typed URL would inherit another page's scroll.
const scrollKey = (location) => (location.key === 'default' ? location.pathname : location.key)

// Root layout: announcement bar and sticky header, the matched page, footer.
export default function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <InstantPageScroll />
      <ScrollRestoration getKey={scrollKey} />
    </div>
  )
}

// Smooth scrolling (index.css) is meant for in-page anchors. On a new page,
// turn it off for the frame in which ScrollRestoration jumps to the top or
// restores a position. Must render before <ScrollRestoration> so this layout
// effect runs first.
function InstantPageScroll() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const html = document.documentElement
    html.style.scrollBehavior = 'auto'
    // Flush styles now: Chrome otherwise scrolls with the old, smooth value.
    void getComputedStyle(html).scrollBehavior
    const frame = requestAnimationFrame(() => html.style.removeProperty('scroll-behavior'))
    return () => cancelAnimationFrame(frame)
  }, [pathname])
  return null
}
