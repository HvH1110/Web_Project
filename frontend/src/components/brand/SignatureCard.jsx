import { Link } from 'react-router'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { useWorkingImages } from '@/hooks/useWorkingImages'
import { cn } from '@/lib/utils'

// A brand's signature piece (Brand.signatureProducts in ../docs/API.md):
// image, year introduced, name and one line about it. Links to the house's list
// of signature pieces, which only links on to products that exist, unless
// `linked` is false because the house has no products to find. `photos` are
// tracked products that can picture the piece (see lib/housePhotos.js): the
// first whose image loads is shown, named and credited. `compact` is the small
// three-up version, without the description.
export default function SignatureCard({ piece, brand, photos = [], compact = false, linked = true, className }) {
  const [[photo], markFailed] = useWorkingImages(photos)
  return (
    <article className={cn('group relative grid content-start', compact ? 'gap-3' : 'gap-5', className)}>
      <ImagePlaceholder
        tone={brand.tone}
        category={brand.category}
        label={compact ? undefined : piece.name}
        photo={photo}
        onPhotoError={() => markFailed(photo)}
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
      {photo && <PhotoCredit photo={photo} />}
    </article>
  )
}

const creditLink = 'underline underline-offset-2 hover:text-foreground'

// Which product a picture shows and whose image it is, or for the house's own
// photo (a `license` is set, see lib/housePhotos.js) its photographer and
// license. `relative` keeps its links above a card's stretched link.
export function PhotoCredit({ photo, className }) {
  return (
    <p className={cn('relative text-[0.625rem] leading-relaxed text-muted-foreground', className)}>
      {photo.license ? (
        <>
          Photo:{' '}
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className={creditLink}>
            {photo.credit}
          </a>
          ,{' '}
          <a href={photo.licenseUrl ?? photo.sourceUrl} target="_blank" rel="noopener noreferrer license" className={creditLink}>
            {photo.license}
          </a>
          , via Wikimedia Commons
          <span className="sr-only"> (links open in a new tab)</span>
        </>
      ) : (
        <>
          Shown:{' '}
          <Link to={photo.to} className={creditLink}>
            {photo.name}
          </Link>
          . Image: {photo.credit}
        </>
      )}
    </p>
  )
}
