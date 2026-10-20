import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Search, User } from 'lucide-react'
import SiteMenu from '@/components/layout/SiteMenu'
import { useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/lib/utils'
import { SITE } from '@/content/site'

// Announcement bar, then a sticky header: menu and search on the left, the
// wordmark centred, quick links on the right. On the home page it starts
// transparent over the hero and turns solid once the page scrolls.
export default function SiteHeader() {
  const { pathname } = useLocation()
  const scrolled = useScrolled(24)
  const [menuOpen, setMenuOpen] = useState(false)
  const overHero = pathname === '/' && !scrolled && !menuOpen

  return (
    <>
      <aside aria-label="Announcement" className="bg-ink text-ivory">
        <p className="page-container eyebrow flex h-bar items-center justify-center text-center text-[0.625rem] tracking-[0.24em]">
          <span className="sm:hidden">Official prices · VN · SG · HK</span>
          <span className="max-sm:hidden">Official prices · Vietnam · Singapore · Hong Kong</span>
        </p>
      </aside>

      <header
        className={cn(
          'sticky top-0 z-40 h-header border-b transition-[background-color,border-color,color] duration-500 ease-lux',
          overHero
            ? 'dark border-transparent bg-transparent text-foreground'
            : 'border-border bg-background/95 text-foreground backdrop-blur-md',
        )}
      >
        <div className="page-container grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-4 md:gap-8">
            <SiteMenu open={menuOpen} onOpenChange={setMenuOpen} />
            <HeaderLink to="/search" icon={Search} label="Search" />
          </div>

          <Link
            to="/"
            className="font-serif text-lg font-medium tracking-[0.3em] whitespace-nowrap uppercase sm:text-2xl"
          >
            {/* Trailing letter-spacing would push the name off centre. */}
            <span className="-mr-[0.3em]">{SITE.name}</span>
          </Link>

          <nav aria-label="Quick links" className="flex items-center justify-end gap-8">
            <HeaderLink to="/deals" label="Deals" className="hidden lg:flex" />
            <HeaderLink to="/community" label="Community" className="hidden lg:flex" />
            <HeaderLink to="/account" icon={User} label="Account" />
          </nav>
        </div>
      </header>
    </>
  )
}

// With an icon, the label shows from md up and is screen-reader text below.
function HeaderLink({ to, icon: Icon, label, className }) {
  return (
    <NavLink to={to} className={cn('eyebrow flex h-10 items-center gap-2.5', className)}>
      {Icon && <Icon className="size-4.5" strokeWidth={1.25} aria-hidden="true" />}
      <span className={cn('link-underline', Icon && 'max-md:sr-only')}>{label}</span>
    </NavLink>
  )
}
