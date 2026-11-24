import { Link } from 'react-router'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import Reveal from '@/components/Reveal'
import { useWorkingImages } from '@/hooks/useWorkingImages'
import { cn } from '@/lib/utils'

// "From the atelier": a row of the house's own pieces beside its story, each
// one a tracked product (see atelierPhotos in lib/housePhotos.js), named,
// linked to its page and credited. Pictures that don't load give their place
// to the next; `exclude` is the URL of the picture already shown large above.
// Nothing renders when fewer than two pictures are left.
export default function AtelierStrip({ brand, photos, exclude, count = 4, className }) {
  const [working, markFailed] = useWorkingImages(photos.filter((p) => p.url !== exclude))
  const shown = working.slice(0, count)
  if (shown.length < 2) return null

  return (
    <Reveal className={className}>
      <p className="eyebrow mb-5">From the atelier</p>
      <ul className={cn('grid grid-cols-2 gap-3 sm:gap-5', count > 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        {shown.map((photo) => (
          <li key={photo.url}>
            <article className="group relative grid content-start gap-2">
              <ImagePlaceholder
                tone={brand.tone}
                category={brand.category}
                photo={photo}
                onPhotoError={() => markFailed(photo)}
                className="aspect-square"
              />
              <h4 className="line-clamp-2 text-xs leading-snug" lang={photo.lang}>
                {/* Stretched over the tile so the whole tile is one link. */}
                <Link to={photo.to} className="after:absolute after:inset-0 group-hover:underline">
                  {photo.name}
                </Link>
              </h4>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">Image: {photo.credit}</p>
            </article>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
