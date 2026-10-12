import ImagePlaceholder from '@/components/ImagePlaceholder'
import { cn } from '@/lib/utils'

// A signature product: image, type, name and starting price. `compact` is the
// small version for three-up rows inside a text column. The price stays a dash
// until the catalog API serves real, sourced prices.
export default function SignatureCard({ product, brand, compact = false, className }) {
  return (
    <article className={cn('group grid content-start', compact ? 'gap-3' : 'gap-5', className)}>
      <ImagePlaceholder
        tone={brand.tone}
        category={brand.category}
        label={compact ? undefined : product.name}
        className="aspect-4/5"
      />
      <div className={cn('grid', compact ? 'gap-1' : 'gap-1.5')}>
        <p className={cn('eyebrow text-muted-foreground', compact && 'text-[0.625rem] tracking-[0.16em]')}>
          {product.kind}
        </p>
        <h4 className={cn('font-serif', compact ? 'text-lg leading-tight' : 'text-display-sm')}>
          {product.name}
        </h4>
        <p className={cn('tabular-nums', compact ? 'text-xs' : 'text-sm')}>
          <span className="text-muted-foreground">From</span> — VND
        </p>
      </div>
    </article>
  )
}
