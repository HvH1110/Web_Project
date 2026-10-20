import { useSearchParams } from 'react-router'
import DealRow from '@/components/product/DealRow'
import ProductResults from '@/components/product/ProductResults'
import Segmented from '@/components/Segmented'
import { SITE } from '@/content/site'
import { usePaged } from '@/hooks/usePaged'
import { getDeals } from '@/lib/api'
import { formatDate } from '@/lib/format'

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
]
const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'market', label: 'Cheapest market' },
  { value: 'drop', label: 'Price drops' },
]

const dealKey = (d) => `${d.type}-${d.product.id}-${d.market ?? ''}`

// /deals: deals from GET /api/deals, ranked by percentage saved. Period
// (?period=month) and kind (?type=drop) live in the URL.
export default function DealsPage() {
  const [params, setParams] = useSearchParams()
  const period = params.get('period') ?? 'today'
  const type = params.get('type') ?? 'all'
  const query = { period, type: type === 'all' ? '' : type }
  const deals = usePaged(
    JSON.stringify(query),
    (page, signal) => getDeals({ ...query, page, limit: 24 }, { signal }),
    dealKey,
  )

  const set = (name, value, fallback) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const latest = deals.latest
  const busy = deals.loading || deals.refreshing

  return (
    <>
      <title>{`Deals · ${SITE.name}`}</title>

      <section className="page-container grid gap-10 pt-12 pb-12 sm:pt-16 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-6">
          <p className="eyebrow text-muted-foreground">Deals</p>
          <h1 className="font-serif text-display-lg">Where it costs less</h1>
        </div>
        <div className="grid content-end gap-4 text-sm leading-relaxed text-muted-foreground lg:col-span-5 lg:col-start-8">
          <p>
            Official prices rarely go down: houses raise them a few times a year. So a deal here is
            one of two things.
          </p>
          <p>
            <span className="text-foreground">Cheapest market:</span> the same piece costs less in
            one market than another, compared in VND.{' '}
            <span className="text-foreground">Price drop:</span> it costs less than at the start of
            the day, month or year, usually because of exchange rates.
          </p>
        </div>
      </section>

      <div className="page-container pb-section">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t pt-6">
          <Segmented label="Period" options={PERIODS} value={period} onChange={(v) => set('period', v, 'today')} />
          <Segmented label="Kind of deal" options={TYPES} value={type} onChange={(v) => set('type', v, 'all')} />
        </div>

        {!deals.error && (
          <div className="mt-8 grid gap-1">
            <p className="text-sm" aria-live="polite">
              {busy
                ? 'Looking for deals'
                : `${deals.total.toLocaleString('en-US')} ${deals.total === 1 ? 'deal' : 'deals'}${
                    latest?.since ? ` since ${formatDate(latest.since)}` : ''
                  }`}
            </p>
            {!busy && (
              <p className="text-xs text-muted-foreground">
                {latest?.fx
                  ? `VND prices use the rates of ${formatDate(latest.fx.date)}. Cheapest-market deals compare today's prices, so they are the same for every period.`
                  : 'No exchange rates are stored yet, so markets in different currencies can’t be compared and SGD and HKD drops count only in their own currency.'}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <h2 className="sr-only">Deals</h2>
          <ProductResults
            products={deals}
            variant="list"
            renderItem={(deal) => <DealRow deal={deal} />}
            getKey={dealKey}
            empty={<NoDeals period={period} type={type} fx={latest?.fx} />}
          />
        </div>
      </div>
    </>
  )
}

function NoDeals({ period, type, fx }) {
  const label = PERIODS.find((p) => p.value === period)?.label.toLowerCase()
  return (
    <div className="grid justify-items-center gap-4 bg-secondary px-6 py-20 text-center">
      <p className="eyebrow text-muted-foreground">No deals {label}</p>
      <p className="max-w-xl font-serif text-display-sm text-balance">
        {type === 'market'
          ? 'No piece is cheaper in one market than another right now.'
          : 'Nothing costs less than it did at the start of the period.'}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {!fx
          ? 'Comparing markets needs exchange rates, which aren’t stored yet. Deals will appear as prices and rates are collected.'
          : period !== 'year'
            ? 'Official prices rarely fall. Try a longer period.'
            : 'Official prices rarely fall. Deals appear as prices and exchange rates move.'}
      </p>
    </div>
  )
}
