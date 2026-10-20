import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { MARKETS } from '@/content/site'
import { productPath } from '@/lib/catalog'
import { formatDate, formatPercent, formatPrice } from '@/lib/format'

const marketName = (code) => MARKETS.find((m) => m.code === code)?.name ?? code

// One deal (Deal in ../docs/API.md): the product, the percentage saved, the
// prices that make it a deal, and a link to buy where it is cheaper.
export default function DealRow({ deal }) {
  const { product } = deal
  const [image] = product.images
  const path = productPath(product)
  const offer = deal.type === 'market' ? deal.cheapest.offer : deal.offer

  return (
    <article className="grid grid-cols-[5.5rem_1fr] gap-x-5 gap-y-6 py-8 sm:grid-cols-[8rem_1fr] lg:grid-cols-12 lg:gap-x-8">
      {/* The name below is the accessible link; this one is a mouse shortcut. */}
      <Link
        to={path}
        tabIndex={-1}
        aria-hidden="true"
        className="group relative block aspect-4/5 overflow-hidden bg-secondary lg:col-span-2"
      >
        {image ? (
          <img
            src={image.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain p-[8%] mix-blend-multiply transition-transform duration-700 ease-lux group-hover:scale-[1.04]"
          />
        ) : (
          <ImagePlaceholder category={product.category} className="absolute inset-0" />
        )}
      </Link>

      <div className="grid content-start gap-1.5 lg:col-span-4">
        <p className="eyebrow text-muted-foreground">
          {[product.brandName ?? product.brand, product.collection].filter(Boolean).join(' · ')}
        </p>
        <h3 className="font-serif text-display-sm">
          <Link to={path} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">Ref. {product.ref}</p>
      </div>

      <div className="col-span-2 grid content-start gap-4 lg:col-span-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t pt-4">
          <p className="eyebrow">{deal.type === 'market' ? 'Cheapest market' : 'Price drop'}</p>
          <p className="flex items-baseline gap-2">
            <span className="font-serif text-display-sm tabular-nums">{formatPercent(deal.savingPct)}</span>
            <span className="eyebrow text-muted-foreground">less</span>
          </p>
        </div>
        {deal.type === 'market' ? <MarketDetail deal={deal} /> : <DropDetail deal={deal} />}
        {offer && (
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow inline-flex items-center gap-1.5 justify-self-start"
          >
            <span className="link-underline">Buy at {offer.source.name}</span>
            <ArrowUpRight className="size-3" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  )
}

// Cheapest and dearest market side by side, in their own currency and VND.
function MarketDetail({ deal }) {
  const rows = [
    { label: 'Cheapest', ...deal.cheapest },
    { label: 'Most expensive', ...deal.dearest },
  ]
  return (
    <dl className="grid border-b text-sm">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 border-t py-3 sm:grid-cols-[9rem_1fr_auto]">
          <dt className="eyebrow text-muted-foreground">{r.label}</dt>
          <dd className="max-sm:order-3">{marketName(r.market)}</dd>
          <dd className="text-right tabular-nums">
            {r.offer.currency !== 'VND' && r.offer.price != null && (
              <span className="mr-2 text-muted-foreground">{formatPrice(r.offer.price, r.offer.currency)} ≈</span>
            )}
            {formatPrice(r.priceVnd, 'VND')}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// Then and now, in the source's currency and in VND, with what moved.
function DropDetail({ deal }) {
  const cutInCurrency = deal.priceNow < deal.priceThen
  const vnd = deal.priceVndThen != null && deal.priceVndNow != null
  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted-foreground">
        {marketName(deal.market)} · since {formatDate(deal.since)} ·{' '}
        {cutInCurrency
          ? `price cut in ${deal.currency}`
          : `same ${deal.currency} price, cheaper in VND after exchange-rate moves`}
      </p>
      <dl className="grid border-b">
        <PriceChange label={deal.currency} then={deal.priceThen} now={deal.priceNow} currency={deal.currency} />
        {vnd && deal.currency !== 'VND' && (
          <PriceChange label="In VND" then={deal.priceVndThen} now={deal.priceVndNow} currency="VND" />
        )}
      </dl>
    </div>
  )
}

function PriceChange({ label, then, now, currency }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 border-t py-3">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">
        {now < then ? (
          <>
            <s className="mr-2 text-muted-foreground">
              <span className="sr-only">was </span>
              {formatPrice(then, currency)}
            </s>
            <span className="sr-only">now </span>
            {formatPrice(now, currency)}
          </>
        ) : (
          formatPrice(now, currency)
        )}
      </dd>
    </div>
  )
}
