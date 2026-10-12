import { Link } from 'react-router'
import { Menu, X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { BRANDS, CATEGORIES, brandsIn } from '@/content/brands'
import { MARKETS, PAGES } from '@/content/site'

// Left drawer with the full navigation, as on the maison sites: the houses by
// category, then the site pages. Used at every screen size.
export default function SiteMenu({ open, onOpenChange }) {
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger className="eyebrow -ml-2 flex h-10 items-center gap-2.5 px-2">
        <Menu className="size-4.5" strokeWidth={1.25} aria-hidden="true" />
        <span className="link-underline max-sm:sr-only">Menu</span>
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton={false}
        className="gap-0 overflow-y-auto p-0 data-[side=left]:w-full data-[side=left]:border-r-0 data-[side=left]:sm:max-w-md"
      >
        <div className="flex h-header shrink-0 items-center justify-between px-8">
          <SheetTitle className="eyebrow font-sans font-medium">Menu</SheetTitle>
          <SheetClose className="-mr-2 grid size-10 place-items-center">
            <X className="size-4.5" strokeWidth={1.25} aria-hidden="true" />
            <span className="sr-only">Close menu</span>
          </SheetClose>
          <SheetDescription className="sr-only">
            The {BRANDS.length} houses and the main pages of the site.
          </SheetDescription>
        </div>

        <nav aria-label="Main" className="grid gap-12 px-8 pt-6 pb-12">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="grid gap-4">
              <p className="eyebrow text-muted-foreground">{category.name}</p>
              <ul className="grid gap-1">
                {brandsIn(category.id).map((brand) => (
                  <li key={brand.slug}>
                    <Link
                      to={`/brands/${brand.slug}`}
                      onClick={close}
                      className="font-serif text-3xl leading-tight hover:italic"
                    >
                      {brand.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <ul className="grid gap-4 border-t pt-10">
            {PAGES.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} onClick={close} className="eyebrow link-underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="eyebrow mt-auto border-t px-8 py-6 text-[0.625rem] text-muted-foreground">
          {MARKETS.map((m) => `${m.name} · ${m.currency}`).join('   /   ')}
        </p>
      </SheetContent>
    </Sheet>
  )
}
