import { Outlet, ScrollRestoration } from 'react-router'
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
      <ScrollRestoration getKey={scrollKey} />
    </div>
  )
}
