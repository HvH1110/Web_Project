import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import FactList from '@/components/FactList'
import LoadError from '@/components/LoadError'
import ProductResults from '@/components/product/ProductResults'
import SortSelect from '@/components/product/SortSelect'
import Reveal from '@/components/Reveal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BRANDS, CATEGORIES } from '@/content/brands'
import { SITE } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { useProducts } from '@/hooks/useProducts'
import { getBrand } from '@/lib/api'
import { DEFAULT_SORT, matchCollection } from '@/lib/catalog'
import { pad2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import NotFoundPage from '@/pages/NotFoundPage'

// /brands/:slug: masthead, history, signature pieces, then every tracked
// product with collection and sort filters kept in the URL
// (?collection=…&sort=…). Remounted per brand so no state leaks across.
export default function BrandPage() {
  const { slug } = useParams()
  return <Brand key={slug} slug={slug} />
}

function Brand({ slug }) {
  const brand = useApi(slug, (signal) => getBrand(slug, { signal }).then((d) => d.brand))
  const [params, setParams] = useSearchParams()
  const collection = params.get('collection') ?? ''
  const sort = params.get('sort') ?? DEFAULT_SORT
  const products = useProducts({ brand: slug, collection, sort: sort === DEFAULT_SORT ? '' : sort })

  // A link like /brands/rolex#products arrives before its section exists, so
  // scroll to the anchor once the brand has rendered.
  const { hash } = useLocation()
  const loaded = Boolean(brand.data)
  useEffect(() => {
    if (loaded && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [loaded, hash])

  // Filters replace the history entry and keep the scroll position.
  const setFilter = (name, value, fallback = '') => {
    const next = new URLSearchParams(params)
    if (value && value !== fallback) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  if (brand.error?.status === 404) return <NotFoundPage />
  if (brand.error) {
    return (
      <div className="page-container py-section">
        <LoadError error={brand.error} onRetry={brand.retry} />
      </div>
    )
  }
  if (brand.loading) return <MastheadSkeleton />

  const b = brand.data
  return (
    <>
      <title>{`${b.name} · ${SITE.name}`}</title>
      <Masthead brand={b} />
      <History brand={b} />
      {b.signatureProducts.length > 0 && <Signatures brand={b} />}

      <section id="products" aria-labelledby="products-title" className="scroll-mt-header border-t">
        <div className="page-container py-section">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="grid gap-3">
              <h2 id="products-title" className="font-serif text-display-lg">
                All products
              </h2>
              <p className="text-sm text-muted-foreground">
                {b.productCount} {b.productCount === 1 ? 'piece' : 'pieces'} tracked across Vietnam,
                Singapore and Hong Kong
              </p>
            </div>
            <SortSelect value={sort} onChange={(value) => setFilter('sort', value, DEFAULT_SORT)} />
          </div>

          {b.collections.length > 1 && (
            <CollectionFilter
              collections={b.collections}
              total={b.productCount}
              value={collection}
              onChange={(value) => setFilter('collection', value)}
            />
          )}

          <div className="mt-12">
            <ProductResults
              products={products}
              empty={
                <EmptyProducts
                  brand={b}
                  collection={collection}
                  onShowAll={() => setFilter('collection', '')}
                />
              }
            />
          </div>
        </div>
      </section>

      <HouseNav slug={slug} />
    </>
  )
}

function Masthead({ brand }) {
  const category = CATEGORIES.find((c) => c.id === brand.category)
  const facts = [
    ['Founded', `${brand.city}, ${brand.country}, ${brand.foundedYear}`],
    ['Founder', brand.founder],
    ['Products tracked', brand.productCount || 'None yet'],
    ['Collections', brand.collections.length || '—'],
  ]

  return (
    <header className={category?.ground}>
      <div className="page-container pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb">
          <ol className="eyebrow flex flex-wrap gap-x-3 text-muted-foreground">
            <li>
              <Link to="/" className="link-underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/#houses" className="link-underline">
                The Houses
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {brand.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-12 pt-20 pb-16 lg:grid-cols-12 lg:items-end lg:pt-28">
          <div className="grid gap-6 lg:col-span-7">
            <Reveal as="p" className="eyebrow text-muted-foreground">
              {category?.name ?? brand.category} · Since {brand.foundedYear}
            </Reveal>
            <Reveal as="h1" delay={100} className="font-serif text-display-2xl font-light text-balance">
              {brand.name}
            </Reveal>
          </div>
          <Reveal delay={200} className="lg:col-span-4 lg:col-start-9">
            <FactList items={facts} />
          </Reveal>
        </div>

        <nav aria-label="On this page" className="eyebrow flex flex-wrap gap-x-8 gap-y-3 border-t py-5">
          <a href="#history" className="link-underline">
            History
          </a>
          {brand.signatureProducts.length > 0 && (
            <a href="#signatures" className="link-underline">
              Signature pieces
            </a>
          )}
          <a href="#products" className="link-underline">
            All products <span className="text-muted-foreground">{brand.productCount}</span>
          </a>
        </nav>
      </div>
    </header>
  )
}

function History({ brand }) {
  return (
    <section
      id="history"
      aria-labelledby="history-title"
      className="page-container grid scroll-mt-header gap-8 py-section lg:grid-cols-12"
    >
      <Reveal as="h2" id="history-title" className="eyebrow lg:col-span-3">
        History
      </Reveal>
      <Reveal delay={100} className="grid gap-8 lg:col-span-8 lg:col-start-5">
        <p className="font-serif text-display-sm leading-[1.45] font-light text-pretty">{brand.history}</p>
        {brand.contentStatus === 'draft' && (
          <p className="text-xs text-muted-foreground">Draft text: these facts have not been reviewed yet.</p>
        )}
      </Reveal>
    </section>
  )
}

// Each piece links to its collection below when the brand has one by that
// name, otherwise to a search for it.
function Signatures({ brand }) {
  return (
    <section id="signatures" aria-labelledby="signatures-title" className="scroll-mt-header border-t">
      <div className="page-container py-section">
        <Reveal as="h2" id="signatures-title" className="font-serif text-display-lg">
          Signature pieces
        </Reveal>
        <ol className="mt-14 border-b">
          {brand.signatureProducts.map((piece, i) => {
            const collection = matchCollection(piece.name, brand.collections)
            return (
              <Reveal
                as="li"
                key={piece.name}
                delay={i * 80}
                className="grid gap-x-8 gap-y-2 border-t py-8 md:grid-cols-12 md:items-baseline"
              >
                <span className="eyebrow text-muted-foreground md:col-span-1">{pad2(i + 1)}</span>
                <h3 className="font-serif text-display-sm md:col-span-4">{piece.name}</h3>
                <p className="eyebrow text-muted-foreground md:col-span-2">
                  {piece.year && `Since ${piece.year}`}
                </p>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:col-span-3">
                  {piece.description}
                </p>
                <Link
                  to={
                    collection
                      ? { search: `?collection=${encodeURIComponent(collection.name)}`, hash: '#products' }
                      : `/search?brand=${brand.slug}&q=${encodeURIComponent(piece.name)}`
                  }
                  className="eyebrow group mt-3 inline-flex items-center gap-2 justify-self-start md:col-span-2 md:mt-0 md:justify-self-end"
                >
                  <span className="link-underline">
                    {collection ? `View ${collection.productCount}` : 'Search'}
                  </span>
                  <ArrowRight
                    className="size-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                </Link>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

// Collections shown before "Show all": enough for one or two lines.
const COLLAPSED_COLLECTIONS = 10

// One button per collection, wrapping onto lines so the page's own scroll
// reaches them all. Long lists start collapsed; a chosen collection stays
// visible either way.
function CollectionFilter({ collections, total, value, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = collections.length > COLLAPSED_COLLECTIONS + 2
  let shown = collections
  if (collapsible && !expanded) {
    shown = collections.slice(0, COLLAPSED_COLLECTIONS)
    const chosen = collections.find((c) => c.name === value)
    if (chosen && !shown.includes(chosen)) shown = [...shown, chosen]
  }
  const options = [{ name: '', label: 'All', productCount: total }, ...shown]

  return (
    <div className="mt-10 grid justify-items-start gap-4">
      <div role="group" aria-label="Collection" id="collection-filter" className="flex flex-wrap gap-2">
        {options.map((c) => {
          const active = value === c.name
          return (
            <Button
              key={c.name || 'all'}
              variant="outline"
              aria-pressed={active}
              onClick={() => onChange(c.name)}
              className={cn(
                'h-10 gap-2 px-4 text-[0.6875rem] tracking-[0.16em] uppercase',
                active && 'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background',
              )}
            >
              {c.label ?? c.name}
              <span className={active ? 'text-background/60' : 'text-muted-foreground'}>{c.productCount}</span>
            </Button>
          )
        })}
      </div>
      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="collection-filter"
          onClick={() => setExpanded((e) => !e)}
          className="eyebrow link-underline"
        >
          {expanded ? 'Show fewer collections' : `Show all ${collections.length} collections`}
        </button>
      )}
    </div>
  )
}

function EmptyProducts({ brand, collection, onShowAll }) {
  return (
    <div className="grid justify-items-center gap-4 bg-secondary px-6 py-20 text-center">
      <p className="eyebrow text-muted-foreground">Nothing here yet</p>
      <p className="max-w-xl font-serif text-display-sm text-balance">
        {collection
          ? `No ${brand.name} products in ${collection}.`
          : `We haven't tracked any ${brand.name} products yet.`}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        Prices appear here once the daily crawl has collected them from official stores and
        authorized dealers.
      </p>
      {collection && (
        <CtaButton variant="outline" onClick={onShowAll} className="mt-4">
          Show all products
        </CtaButton>
      )}
    </div>
  )
}

// Previous and next house, in home page order.
function HouseNav({ slug }) {
  const i = BRANDS.findIndex((b) => b.slug === slug)
  if (i === -1) return null
  const prev = BRANDS.at(i - 1)
  const next = BRANDS[(i + 1) % BRANDS.length]

  return (
    <nav aria-label="Other houses" className="border-t">
      <div className="page-container grid sm:grid-cols-2">
        <Link to={`/brands/${prev.slug}`} className="group grid gap-4 py-14 sm:border-r sm:pr-10">
          <span className="eyebrow flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="size-3.5" strokeWidth={1.25} aria-hidden="true" />
            Previous house
          </span>
          <span className="font-serif text-display-md group-hover:italic">{prev.name}</span>
        </Link>
        <Link
          to={`/brands/${next.slug}`}
          className="group grid justify-items-end gap-4 border-t py-14 text-right sm:border-t-0 sm:pl-10"
        >
          <span className="eyebrow flex items-center gap-2 text-muted-foreground">
            Next house
            <ArrowRight className="size-3.5" strokeWidth={1.25} aria-hidden="true" />
          </span>
          <span className="font-serif text-display-md group-hover:italic">{next.name}</span>
        </Link>
      </div>
    </nav>
  )
}

function MastheadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="page-container pt-14 pb-section">
      <Skeleton className="h-3 w-48" />
      <div className="grid gap-12 pt-24 lg:grid-cols-12 lg:items-end">
        <div className="grid gap-6 lg:col-span-7">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-24 w-3/4" />
        </div>
        <div className="grid gap-4 lg:col-span-4 lg:col-start-9">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      </div>
    </div>
  )
}
