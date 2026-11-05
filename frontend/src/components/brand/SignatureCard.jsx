import { Link } from 'react-router'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { cn } from '@/lib/utils'

// A brand's signature piece (Brand.signatureProducts in ../docs/API.md):
// image, year introduced, name and one line about it. Links to the house's list
// of signature pieces, which only links on to products that exist, unless
// `linked` is false because the house has no products to find. `compact` is the
// small three-up version, without the description.
export default function SignatureCard({ piece, brand, compact = false, linked = true, className }) {
  return (
    <article className={cn('group relative grid content-start', compact ? 'gap-3' : 'gap-5', className)}>
      <ImagePlaceholder
        tone={brand.tone}
        category={brand.category}
        label={compact ? undefined : piece.name}
        className="aspect-4/5"
      />
      <div className={cn('grid', compact ? 'gap-1' : 'gap-1.5')}>
        {/* Without a year the line stays empty, so names in a row still line up. */}
        <p
          aria-hidden={!piece.year}
          className={cn('eyebrow text-muted-foreground', compact && 'text-[0.625rem] tracking-[0.16em]')}
        >
          {piece.year ? `Since ${piece.year}` : ' '}
        </p>
        <h4 className={cn('font-serif', compact ? 'text-lg leading-tight' : 'text-display-sm')}>
          {linked ? (
            // Stretched over the card so the whole card is one link.
            <Link to={`/brands/${brand.slug}#signatures`} className="after:absolute after:inset-0">
              {piece.name}
            </Link>
          ) : (
            piece.name
          )}
        </h4>
        {!compact && piece.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{piece.description}</p>
        )}
      </div>
    </article>
  )
}
