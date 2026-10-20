import { Link } from 'react-router'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { cn } from '@/lib/utils'

// A brand's signature piece (Brand.signatureProducts in ../docs/API.md):
// image, year introduced, name and one line about it. Links to a search for
// the piece within its house. `compact` is the small three-up version, without
// the description.
export default function SignatureCard({ piece, brand, compact = false, className }) {
  const search = `/search?brand=${brand.slug}&q=${encodeURIComponent(piece.name)}`
  return (
    <article className={cn('group relative grid content-start', compact ? 'gap-3' : 'gap-5', className)}>
      <ImagePlaceholder
        tone={brand.tone}
        category={brand.category}
        label={compact ? undefined : piece.name}
        className="aspect-4/5"
      />
      <div className={cn('grid', compact ? 'gap-1' : 'gap-1.5')}>
        {piece.year && (
          <p className={cn('eyebrow text-muted-foreground', compact && 'text-[0.625rem] tracking-[0.16em]')}>
            Since {piece.year}
          </p>
        )}
        <h4 className={cn('font-serif', compact ? 'text-lg leading-tight' : 'text-display-sm')}>
          {/* Stretched over the card so the whole card is one link. */}
          <Link to={search} className="after:absolute after:inset-0">
            {piece.name}
          </Link>
        </h4>
        {!compact && piece.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{piece.description}</p>
        )}
      </div>
    </article>
  )
}
