import { Link, NavLink, Outlet } from 'react-router'
import Emblem from '@/components/mission-control/Emblem'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/mission-control', label: 'Mission Control' },
]

// Root layout: control-room header, then the matched page.
export default function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-(--phosphor)/20 bg-[#050b16]/70 shadow-[0_1px_24px_rgb(255_255_255/0.08)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Emblem className="size-10" />
            <span className="grid gap-1 leading-none">
              <span className="mc-plate">Ground control</span>
              <span className="mc-glow font-crt text-3xl tracking-wider">WEB PROJECT</span>
            </span>
          </Link>
          <nav className="ml-auto flex gap-2">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className="mc-tab">
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
