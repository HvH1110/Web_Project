import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { imageCredit } from '@/lib/catalog'
import { cn } from '@/lib/utils'

// Main image with up to three thumbnails. Every image credits and links the
// store page it came from (Image.sourceId = Offer.source.id).
export default function ProductGallery({ product }) {
  const { images } = product
  const [index, setIndex] = useState(0)
  const image = images[index]

  if (!image) {
    return <ImagePlaceholder category={product.category} label="No image yet" className="aspect-4/5" />
  }

  const offer = product.offers.find((o) => o.source.id === image.sourceId)
  return (
    <div className="grid gap-4">
      <div className="relative aspect-4/5 overflow-hidden bg-secondary">
        <img
          key={image.url}
          src={image.url}
          alt={image.alt || product.name}
          fetchPriority="high"
          className="absolute inset-0 size-full object-contain p-[6%] mix-blend-multiply animate-in fade-in duration-500"
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {images.length > 1 && (
          <ul className="flex gap-2" aria-label="Product images">
            {images.map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  aria-current={i === index || undefined}
                  className={cn(
                    'relative block size-16 overflow-hidden border bg-secondary transition-colors sm:size-20',
                    i === index ? 'border-foreground' : 'border-transparent hover:border-border',
                  )}
                >
                  <img src={img.url} alt="" loading="lazy" className="absolute inset-0 size-full object-contain p-1.5 mix-blend-multiply" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="ml-auto text-[0.6875rem] text-muted-foreground">
          Image:{' '}
          {offer ? (
            <a href={offer.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
              <span className="link-underline">{imageCredit(product, image)}</span>
              <ArrowUpRight className="size-3" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            imageCredit(product, image)
          )}
        </p>
      </div>
    </div>
  )
}
