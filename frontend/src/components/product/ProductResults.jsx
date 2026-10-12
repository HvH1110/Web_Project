import LoadError from '@/components/LoadError'
import CtaButton from '@/components/CtaButton'
import ProductCard from '@/components/product/ProductCard'
import ProductRow from '@/components/product/ProductRow'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const LAYOUT = {
  grid: 'grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4',
  list: 'grid border-b',
}

// Results from useProducts as a card grid (variant="grid") or as rows with
// prices per market (variant="list"): skeletons, error, `empty` when there is
// nothing, otherwise the products with a "load more" footer. `error` replaces
// the default error panel when given.
export default function ProductResults({ products, variant = 'grid', empty, error: errorView }) {
  const { items, total, loading, refreshing, error, retry } = products

  if (error) return errorView ?? <LoadError error={error} onRetry={retry} />
  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading products" className={LAYOUT[variant]}>
        {Array.from({ length: variant === 'grid' ? 8 : 4 }, (_, i) =>
          variant === 'grid' ? (
            <li key={i} className="grid gap-4">
              <Skeleton className="aspect-4/5" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </li>
          ) : (
            <li key={i} className="grid grid-cols-[6rem_1fr] gap-5 border-t py-8 sm:grid-cols-[8rem_1fr]">
              <Skeleton className="aspect-4/5" />
              <div className="grid content-start gap-3">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-4 h-16" />
              </div>
            </li>
          ),
        )}
      </ul>
    )
  }
  if (!items.length && !refreshing) return empty

  const Item = variant === 'grid' ? ProductCard : ProductRow
  return (
    <div aria-busy={refreshing || undefined}>
      <ul
        className={cn(
          LAYOUT[variant],
          'transition-opacity duration-300',
          refreshing && 'pointer-events-none opacity-40',
        )}
      >
        {items.map((product) => (
          <li key={product.id} className={variant === 'list' ? 'border-t' : undefined}>
            <Item product={product} />
          </li>
        ))}
      </ul>
      {!refreshing && <MoreFooter products={products} shown={items.length} total={total} />}
    </div>
  )
}

// "Showing 24 of 135", a hairline progress bar and the load-more button.
function MoreFooter({ products, shown, total }) {
  const { hasMore, loadMore, loadingMore, loadMoreError } = products
  return (
    <div className="mx-auto mt-20 grid max-w-xs justify-items-center gap-5 text-center">
      <p className="eyebrow text-muted-foreground" aria-live="polite">
        Showing {shown} of {total}
      </p>
      <div className="h-px w-full bg-border">
        <div className="h-full bg-foreground" style={{ width: `${(shown / Math.max(total, 1)) * 100}%` }} />
      </div>
      {hasMore && (
        <CtaButton variant="outline" onClick={loadMore} disabled={loadingMore} className="mt-3">
          {loadingMore ? 'Loading' : 'Load more'}
        </CtaButton>
      )}
      {loadMoreError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn't load more products. Please try again.
        </p>
      )}
    </div>
  )
}
