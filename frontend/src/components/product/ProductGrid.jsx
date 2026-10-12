import LoadError from '@/components/LoadError'
import CtaButton from '@/components/CtaButton'
import ProductCard from '@/components/product/ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4'

// Results from useProducts: skeletons, error, `empty` when there is nothing,
// otherwise the cards with a "load more" footer.
export default function ProductGrid({ products, empty }) {
  const { items, total, loading, refreshing, error, retry } = products

  if (error) return <LoadError error={error} onRetry={retry} />
  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading products" className={GRID}>
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="grid gap-4">
            <Skeleton className="aspect-4/5" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </li>
        ))}
      </ul>
    )
  }
  if (!items.length && !refreshing) return empty

  return (
    <div aria-busy={refreshing || undefined}>
      <ul
        className={cn(GRID, 'transition-opacity duration-300', refreshing && 'pointer-events-none opacity-40')}
      >
        {items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
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
