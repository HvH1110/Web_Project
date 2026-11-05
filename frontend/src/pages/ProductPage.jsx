import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import FactList from '@/components/FactList'
import LoadError from '@/components/LoadError'
import OfferTable from '@/components/product/OfferTable'
import PageMeta from '@/components/PageMeta'
import PriceHistory from '@/components/product/PriceHistory'
import ProductCard from '@/components/product/ProductCard'
import ProductGallery from '@/components/product/ProductGallery'
import PriceSource from '@/components/product/PriceSource'
import { Skeleton } from '@/components/ui/skeleton'
import { MARKETS } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { getProduct, getProductHistory, getProducts } from '@/lib/api'
import { NO_CURRENT_PRICE, RATE_SOURCE, handChecked, leadPrice } from '@/lib/catalog'
import { formatDate, formatDayUtc, formatPrice } from '@/lib/format'
import { lastKnownPrices } from '@/lib/history'
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
  // With no current offer, the last prices come from the full history.
  const noOffers = result.data?.product.offers.length === 0
  const history = useApi(noOffers ? `${brand}/${productRef}` : 'not-needed', (signal) =>
    noOffers ? getProductHistory(brand, productRef, 'all', { signal }) : Promise.resolve(null),
  )
  const archived = noOffers && history.data ? lastKnownPrices(history.data.series) : []

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
      <PageMeta
        title={`${product.name} · ${brandName}`}
        description={`${brandName} ${product.name}, ref. ${product.ref}: ${
          noOffers ? 'last known prices' : 'official prices and where to buy'
        } in Vietnam, Singapore and Hong Kong, with price history.`}
      />
      <ProductData product={product} brandName={brandName} />

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

        <div className="grid grid-cols-1 gap-12 pt-10 pb-section lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <ProductGallery product={product} archived={archived} />
          </div>
          <div className="grid min-w-0 grid-cols-1 content-start gap-10 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)] lg:col-span-5 lg:self-start lg:pl-8">
            <div className="grid gap-3">
              <p className="eyebrow text-muted-foreground">
                {[brandName, product.collection].filter(Boolean).join(' · ')}
              </p>
              <h1 className="font-serif text-display-lg text-balance">{product.name}</h1>
              <p className="text-xs text-muted-foreground tabular-nums">Ref. {product.ref}</p>
            </div>
            {noOffers ? (
              <ArchivedPrices prices={archived} history={history} />
            ) : (
              <>
                <LeadPrice product={product} />
                <div className="grid gap-4">
                  <OfferTable product={product} />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {fx && product.offers.some((o) => o.currency !== 'VND' && o.priceVnd != null)
                      ? `VND prices are converted at ${RATE_SOURCE} of ${formatDate(fx.date)}. `
                      : ''}
                    Prices are indicative: always confirm with the store before you buy.
                  </p>
                </div>
              </>
            )}
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

      <PriceHistory brand={product.brand} productRef={product.ref} defaultRange={noOffers ? 'all' : undefined} />
      <MoreFrom product={product} brandName={brandName} />
    </>
  )
}

// schema.org data for search results, only with a current price: past prices
// and prices read by hand, which can be weeks old, must never read as today's.
// "<" is escaped so text can't close the script tag.
function ProductData({ product, brandName }) {
  const offers = product.offers.filter((o) => o.price != null && o.origin !== 'manual')
  if (!offers.length) return null
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.ref,
    brand: { '@type': 'Brand', name: brandName },
    image: product.images.map((i) => i.url),
    offers: offers.map((o) => ({
      '@type': 'Offer',
      url: o.url,
      price: o.price,
      priceCurrency: o.currency,
      seller: { '@type': 'Organization', name: o.source.name },
      ...(o.available != null && {
        availability: `https://schema.org/${o.available ? 'InStock' : 'OutOfStock'}`,
      }),
    })),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
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
        {price.origin === 'manual' && (
          <p className="text-sm text-muted-foreground">{handChecked(price.lastSeenAt)}</p>
        )}
      </div>
      {offer && (
        <CtaButton
          render={<a href={offer.url} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
          // Dealer names can be long: wrap rather than widen the page on a phone.
          className="h-auto min-h-12 justify-self-start py-3 text-left whitespace-normal"
        >
          View at {offer.source.name}
          <ArrowUpRight className="size-3.5" strokeWidth={1.25} aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </CtaButton>
      )}
    </div>
  )
}

// For a product no store currently lists online: says so first, then the last
// price seen in each market with its date and where it was seen. These are
// past prices, so they are never shown as the product's price.
function ArchivedPrices({ prices, history }) {
  const archivedOnly = prices.every((p) => p.origin === 'wayback')
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="eyebrow text-muted-foreground">Price</p>
        <p className="font-serif text-display-sm">{NO_CURRENT_PRICE}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We can’t check this house’s website daily, so we don’t know today’s price. Ask the
          boutique for it.
        </p>
      </div>

      {history.error ? (
        <LoadError error={history.error} onRetry={history.retry} />
      ) : history.loading ? (
        <Skeleton className="h-24" aria-label="Loading past prices" />
      ) : prices.length ? (
        <div className="grid gap-3">
          <table className="w-full border-b text-sm">
            <caption className="eyebrow pb-3 text-left text-muted-foreground">
              {archivedOnly ? 'Last archived price' : 'Last recorded price'}
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Market</th>
                <th scope="col">Price</th>
                <th scope="col">Date and source</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={`${p.market}-${p.sourceId}`} className="border-t">
                  <th scope="row" className="eyebrow w-12 py-4 pr-4 text-left align-top font-medium sm:w-32">
                    <span className="sm:hidden" aria-hidden="true">
                      {p.market}
                    </span>
                    <span className="max-sm:sr-only">{MARKETS.find((m) => m.code === p.market)?.name ?? p.market}</span>
                  </th>
                  <td className="py-3.5 pr-4 align-top tabular-nums">{formatPrice(p.price, p.currency)}</td>
                  <td className="py-3.5 text-right align-top">
                    <p className="tabular-nums">{p.origin === 'manual' ? formatDayUtc(p.date) : formatDate(p.date)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <PriceSource {...p} />
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs leading-relaxed text-muted-foreground">
            What the official page showed on that date. The price may have changed since.
          </p>
        </div>
      ) : (
        <p className="border-y py-4 text-sm text-muted-foreground">No past price has been captured for this product.</p>
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
    <div aria-busy="true" aria-label="Loading" className="page-container grid min-h-svh gap-12 pt-24 pb-section lg:grid-cols-12 lg:gap-8">
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
