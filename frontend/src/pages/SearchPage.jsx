import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { SlidersHorizontal, X } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import ProductResults from '@/components/product/ProductResults'
import SortSelect from '@/components/product/SortSelect'
import SearchBox from '@/components/search/SearchBox'
import SearchFilters from '@/components/search/SearchFilters'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { SITE } from '@/content/site'
import { useProducts } from '@/hooks/useProducts'
import { formatDate } from '@/lib/format'
import {
  CLEAR_ALL,
  activeFilterChips,
  countFilters,
  readFilters,
  toProductQuery,
  withFilters,
} from '@/lib/searchFilters'

// /search: text search and filters, all kept in the URL (see
// lib/searchFilters.js), with every result's price per market and where to
// buy it. Filters sit in a sidebar on desktop and in a sheet on phones.
export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const products = useProducts(toProductQuery(filters))
  const [sheetOpen, setSheetOpen] = useState(false)

  // Filters replace the history entry and keep the scroll position.
  const update = (patch) => setParams(withFilters(params, patch), { replace: true, preventScrollReset: true })
  const clearAll = () => update(CLEAR_ALL)
  const filterCount = countFilters(filters)
  const vietnamOnly = filters.market.length === 1 && filters.market[0] === 'VN'

  return (
    <>
      <title>{`${filters.q ? `“${filters.q}” · ` : ''}Search · ${SITE.name}`}</title>

      <section className="page-container pt-12 pb-12 sm:pt-16">
        <p className="eyebrow text-muted-foreground">Search</p>
        <h1 className="mt-4 font-serif text-display-lg">Find the official price</h1>
        <div className="mt-10 max-w-4xl">
          <SearchBox value={filters.q} onSearch={(q) => update({ q })} />
        </div>
      </section>

      <div className="page-container grid gap-10 pb-section lg:grid-cols-12 lg:gap-8">
        <aside
          aria-label="Filters"
          className="hidden lg:sticky lg:top-[calc(var(--spacing-header)+1.5rem)] lg:col-span-3 lg:block lg:max-h-[calc(100svh-var(--spacing-header)-3rem)] lg:self-start lg:overflow-y-auto lg:pr-6 lg:pb-6"
        >
          <SearchFilters filters={filters} onChange={update} />
        </aside>

        <div className="min-w-0 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t pt-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-11 gap-2.5 px-4 text-[0.6875rem] tracking-[0.16em] uppercase lg:hidden"
                    />
                  }
                >
                  <SlidersHorizontal className="size-4" strokeWidth={1.25} aria-hidden="true" />
                  Filters{filterCount > 0 && ` (${filterCount})`}
                </SheetTrigger>
                <SheetContent
                  side="left"
                  showCloseButton={false}
                  className="gap-0 p-0 data-[side=left]:w-full data-[side=left]:border-r-0 data-[side=left]:sm:max-w-md"
                >
                  <div className="flex h-header shrink-0 items-center justify-between border-b px-8">
                    <SheetTitle className="eyebrow font-sans font-medium">Filters</SheetTitle>
                    <SheetClose className="-mr-2 grid size-10 place-items-center">
                      <X className="size-4.5" strokeWidth={1.25} aria-hidden="true" />
                      <span className="sr-only">Close filters</span>
                    </SheetClose>
                  </div>
                  <div className="flex-1 overflow-y-auto px-8 py-6 [&_fieldset:first-of-type]:border-t-0 [&_fieldset:first-of-type]:pt-0">
                    <SearchFilters filters={filters} onChange={update} />
                  </div>
                  <div className="grid gap-3 border-t p-6">
                    <CtaButton onClick={() => setSheetOpen(false)} className="w-full">
                      {products.loading || products.refreshing
                        ? 'Show results'
                        : `Show ${products.total} ${products.total === 1 ? 'result' : 'results'}`}
                    </CtaButton>
                    {filterCount > 0 && (
                      <button type="button" onClick={clearAll} className="eyebrow link-underline justify-self-center">
                        Clear all filters
                      </button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Switch
                  checked={vietnamOnly}
                  onCheckedChange={(on) => update({ market: on ? ['VN'] : [] })}
                />
                Available in Vietnam
              </label>
            </div>
            <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} />
          </div>

          <ActiveFilters filters={filters} onRemove={update} onClear={clearAll} />
          <Summary products={products} q={filters.q} />

          <div className="mt-6">
            <h2 className="sr-only">Results</h2>
            <ProductResults
              products={products}
              variant="list"
              empty={<NoResults q={filters.q} filtered={filterCount > 0 || Boolean(filters.q)} onClear={clearAll} />}
              error={
                products.error?.status === 400 ? (
                  <div role="alert" className="grid justify-items-start gap-4 border-y py-12">
                    <p className="eyebrow text-muted-foreground">Error 400</p>
                    <p className="font-serif text-display-sm">This search can't be run as written.</p>
                    <p className="text-sm text-muted-foreground">{products.error.message}</p>
                    <CtaButton variant="outline" onClick={clearAll} className="mt-2">
                      Clear all filters
                    </CtaButton>
                  </div>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    </>
  )
}

function ActiveFilters({ filters, onRemove, onClear }) {
  const chips = activeFilterChips(filters)
  if (!chips.length) return null
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Button
          key={chip.key}
          variant="outline"
          onClick={() => onRemove(chip.patch)}
          className="h-9 gap-2 px-3 text-xs"
        >
          {chip.label}
          <X className="size-3" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">(remove filter)</span>
        </Button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onClear} className="eyebrow link-underline ml-3">
          Clear all
        </button>
      )}
    </div>
  )
}

// "135 results for “sub”" and the exchange rates behind the VND prices.
function Summary({ products, q }) {
  const { total, fx, loading, refreshing, error } = products
  if (error) return null
  const busy = loading || refreshing
  const rates = fx && ['SGD', 'HKD'].filter((c) => fx.vndPer[c] != null)

  return (
    <div className="mt-8 grid gap-1">
      <p className="text-sm" aria-live="polite">
        {busy ? 'Searching' : `${total.toLocaleString('en-US')} ${total === 1 ? 'result' : 'results'}`}
        {!busy && q && ` for “${q}”`}
      </p>
      {!busy && (
        <p className="text-xs text-muted-foreground">
          {rates?.length
            ? `VND prices converted at ${rates
                .map((c) => `1 ${c} = ${fx.vndPer[c].toLocaleString('en-US')} VND`)
                .join(', ')} (rates of ${formatDate(fx.date)}).`
            : 'No exchange rates stored yet, so SGD and HKD prices are not converted to VND.'}
        </p>
      )}
    </div>
  )
}

function NoResults({ q, filtered, onClear }) {
  return (
    <div className="grid justify-items-center gap-4 bg-secondary px-6 py-20 text-center">
      <p className="eyebrow text-muted-foreground">No results</p>
      <p className="max-w-xl font-serif text-display-sm text-balance">
        {q ? `Nothing matches “${q}”.` : filtered ? 'Nothing matches these filters.' : 'No products are tracked yet.'}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {filtered
          ? 'Check the spelling, try a reference code, or remove a filter.'
          : 'Prices appear here once the daily crawl has collected them from official stores and authorized dealers.'}
      </p>
      {filtered && (
        <CtaButton variant="outline" onClick={onClear} className="mt-4">
          Clear search and filters
        </CtaButton>
      )}
    </div>
  )
}
