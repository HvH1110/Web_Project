import { ArrowUpRight } from 'lucide-react'
import { MARKETS } from '@/content/site'
import { formatDate, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const SOURCE_TYPE = { official: 'Official store', 'authorized-dealer': 'Authorized dealer' }

// Current price in every market, each offer with its where-to-buy link. All
// three markets get a row so they compare at a glance, even when one has no
// offer. The lowest VND price is marked when there is more than one.
export default function OfferTable({ product, className }) {
  const priced = product.offers.filter((o) => o.priceVnd != null)
  const lowest =
    priced.length > 1 ? priced.find((o) => o.priceVnd === product.lowestPriceVnd) : undefined
  const lastSeen = product.offers.map((o) => o.lastSeenAt).sort().at(-1)

  return (
    <div className={className}>
      <table className="w-full border-b text-sm">
        <caption className="sr-only">Prices for {product.name} by market</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Market</th>
            <th scope="col">Price</th>
            <th scope="col">Where to buy</th>
          </tr>
        </thead>
        <tbody>
          {MARKETS.flatMap((market) => {
            const offers = product.offers.filter((o) => o.market === market.code)
            if (!offers.length) {
              return (
                <tr key={market.code} className="border-t text-muted-foreground">
                  <MarketCell market={market} />
                  <td className="py-3.5 pr-4 align-top">—</td>
                  <td className="py-3.5 text-right align-top text-xs">Not tracked</td>
                </tr>
              )
            }
            return offers.map((offer, i) => (
              <tr key={`${market.code}-${offer.source.id}`} className={cn(i === 0 && 'border-t')}>
                {i === 0 && <MarketCell market={market} rows={offers.length} />}
                <PriceCell offer={offer} lowest={offer === lowest} />
                <SourceCell offer={offer} />
              </tr>
            ))
          })}
        </tbody>
      </table>
      {lastSeen && (
        <p className="mt-3 text-[0.6875rem] text-muted-foreground">Prices last checked {formatDate(lastSeen)}</p>
      )}
    </div>
  )
}

function MarketCell({ market, rows = 1 }) {
  return (
    <th scope="row" rowSpan={rows} className="eyebrow w-12 py-4 pr-4 text-left align-top font-medium sm:w-32">
      <span className="sm:hidden" aria-hidden="true">
        {market.code}
      </span>
      <span className="max-sm:sr-only">{market.name}</span>
    </th>
  )
}

function PriceCell({ offer, lowest }) {
  const converted = offer.currency !== 'VND' && offer.priceVnd != null
  return (
    <td className="py-3.5 pr-4 align-top">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="tabular-nums">
          {offer.price != null ? formatPrice(offer.price, offer.currency) : 'Price on request'}
        </span>
        {lowest && <span className="eyebrow text-[0.625rem] text-gain">Lowest</span>}
        {offer.available === false && (
          <span className="eyebrow text-[0.625rem] text-muted-foreground">Out of stock</span>
        )}
      </div>
      {converted && (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          ≈ {formatPrice(offer.priceVnd, 'VND')}
        </p>
      )}
    </td>
  )
}

function SourceCell({ offer }) {
  return (
    <td className="py-3.5 text-right align-top">
      <a
        href={offer.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-baseline gap-1.5 text-left"
      >
        <span className="link-underline">{offer.source.name}</span>
        <ArrowUpRight className="size-3 shrink-0 self-center" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <p className="eyebrow mt-1 text-[0.625rem] text-muted-foreground">
        {SOURCE_TYPE[offer.source.type] ?? offer.source.type}
      </p>
    </td>
  )
}
