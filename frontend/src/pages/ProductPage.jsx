import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import FactList from '@/components/FactList'
import LoadError from '@/components/LoadError'
import OfferTable from '@/components/product/OfferTable'
import PriceHistory from '@/components/product/PriceHistory'
import ProductCard from '@/components/product/ProductCard'
import ProductGallery from '@/components/product/ProductGallery'
import { Skeleton } from '@/components/ui/skeleton'
import { MARKETS, SITE } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { getProduct, getProducts } from '@/lib/api'
import { leadPrice } from '@/lib/catalog'
import { formatDate, formatPrice } from '@/lib/format'
import NotFoundPage from '@/pages/NotFoundPage'

// /products/:brand/:ref: gallery, price in every market with where to buy,
// description and specs, price history, then more from the same collection.
// Remounted per product so no state leaks across.
export default function ProductPage() {
  const { brand, ref } = useParams()
  return <Product key={`${brand}/${ref}`} brand={brand} productRef={ref} />
}

function Product({ brand, productRef }) {
  const result = useApi(`${brand}/${productRef}`, (signal) => getProduct(brand, productRef, { signal }))

  // A link like …#history arrives before its section exists.
  const { hash } = useLocation()
  const loaded = Boolean(result.data)
  useEffect(() => {
    if (loaded && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [loaded, hash])

  if (result.error?.status === 404) return <NotFoundPage />
  if (result.error) {
    return (
      <div className="page-container py-section">
        <LoadError error={result.error} onRetry={result.retry} />
      </div>
    )
  }
  if (result.loading) return <ProductSkeleton />

  const { product, fx } = result.data
  const brandName = product.brandName ?? product.brand
  const hasDetails = product.description || Object.keys(product.specs ?? {}).length > 0

  return (
    <>
      <title>{`${product.name} · ${brandName} · ${SITE.name}`}</title>

      <div className="page-container pt-10 sm:pt-14">
        <nav aria-label="Breadcrumb">
          <ol className="eyebrow flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
            <li>
              <Link to="/" className="link-underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/brands/${product.brand}`} className="link-underline">
                {brandName}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-12 pt-10 pb-section lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <ProductGallery product={product} />
          </div>
          <div className="grid content-start gap-10 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)] lg:col-span-5 lg:self-start lg:pl-8">
            <div className="grid gap-3">
              <p className="eyebrow text-muted-foreground">
                {[brandName, product.collection].filter(Boolean).join(' · ')}
              </p>
              <h1 className="font-serif text-display-lg text-balance">{product.name}</h1>
              <p className="text-xs text-muted-foreground tabular-nums">Ref. {product.ref}</p>
            </div>
            <LeadPrice product={product} />
            <div className="grid gap-4">
              <OfferTable product={product} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {fx ? `VND equivalents use the rates of ${formatDate(fx.date)}. ` : ''}
                Prices are indicative: always confirm with the store before you buy.
              </p>
            </div>
            <a href="#history" className="eyebrow group inline-flex items-center gap-2 justify-self-start">
              <span className="link-underline">Price history</span>
              <ArrowDown className="size-3.5 transition-transform duration-500 ease-lux group-hover:translate-y-0.5" strokeWidth={1.25} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {hasDetails && (
        <section aria-label="Details" className="border-t">
          <div className="page-container grid gap-12 py-section lg:grid-cols-12 lg:gap-8">
            {product.description && (
              <div className="grid content-start gap-6 lg:col-span-6">
                <h2 className="eyebrow">Description</h2>
                <p className="text-lede whitespace-pre-line text-pretty">{product.description}</p>
                <p className="text-xs text-muted-foreground">From the official product page.</p>
              </div>
            )}
            {Object.keys(product.specs ?? {}).length > 0 && (
              <div className="grid content-start gap-6 lg:col-span-5 lg:col-start-8">
                <h2 className="eyebrow">Specifications</h2>
                <FactList items={Object.entries(product.specs)} />
              </div>
            )}
          </div>
        </section>
      )}

      <PriceHistory brand={product.brand} productRef={product.ref} />
      <MoreFrom product={product} brandName={brandName} />
    </>
  )
}

// The headline price, the market it's from, and a link to that store.
function LeadPrice({ product }) {
  const price = leadPrice(product)
  if (!price) {
    return (
      <div className="grid gap-2">
        <p className="eyebrow text-muted-foreground">Price</p>
        <p className="font-serif text-display-sm">Price on request</p>
      </div>
    )
  }
  const offer =
    price.currency === 'VND'
      ? product.offers.find((o) => o.priceVnd === product.lowestPriceVnd)
      : product.offers.find((o) => o.price === price.value && o.currency === price.currency)
  const markets = new Set(product.offers.filter((o) => o.price != null).map((o) => o.market))
  const market = MARKETS.find((m) => m.code === price.market)?.name

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <p className="eyebrow text-muted-foreground">{markets.size > 1 ? 'Lowest price' : 'Price'}</p>
        <p className="text-2xl tabular-nums">{formatPrice(price.value, price.currency)}</p>
        {market && (
          <p className="text-sm text-muted-foreground">
            {markets.size > 1 ? `In ${market}, of ${markets.size} markets` : `In ${market}`}
          </p>
        )}
      </div>
      {offer && (
        <CtaButton
          render={<a href={offer.url} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
          className="justify-self-start"
        >
          View at {offer.source.name}
          <ArrowUpRight className="size-3.5" strokeWidth={1.25} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </CtaButton>
      )}
    </div>
  )
}

function MoreFrom({ product, brandName }) {
  const query = product.collection
    ? { brand: product.brand, collection: product.collection }
    : { brand: product.brand }
  const more = useApi(JSON.stringify(query), (signal) => getProducts({ ...query, limit: 5 }, { signal }))
  const items = (more.data?.items ?? []).filter((p) => p.id !== product.id).slice(0, 4)
  if (!items.length) return null

  const all = product.collection
    ? `/brands/${product.brand}?collection=${encodeURIComponent(product.collection)}#products`
    : `/brands/${product.brand}#products`
  return (
    <section aria-labelledby="more-title" className="border-t">
      <div className="page-container py-section">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="more-title" className="font-serif text-display-lg">
            More from {product.collection ?? brandName}
          </h2>
          <Link to={all} className="eyebrow group inline-flex items-center gap-2">
            <span className="link-underline">View all</span>
            <ArrowRight className="size-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1" strokeWidth={1.25} aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ProductSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="page-container grid gap-12 pt-24 pb-section lg:grid-cols-12 lg:gap-8">
      <Skeleton className="aspect-4/5 lg:col-span-7" />
      <div className="grid content-start gap-5 lg:col-span-5 lg:pl-8">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-14 w-4/5" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-6 h-40" />
      </div>
    </div>
  )
}
