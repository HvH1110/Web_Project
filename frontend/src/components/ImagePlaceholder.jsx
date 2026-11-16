import { Footprints, Gem, Handbag, Shirt, Watch } from 'lucide-react'
import { cn } from '@/lib/utils'

// Studio backdrops in the house neutrals, with the ink their caption and
// icon use. `ink` is lifted a little so it still reads on a dark section.
const TONES = {
  stone: { art: 'bg-stone text-ink', caption: 'text-ink/75' },
  sand: { art: 'bg-sand text-ink', caption: 'text-ink/75' },
  taupe: { art: 'bg-taupe text-ink', caption: 'text-ink/85' },
  graphite: { art: 'bg-graphite text-ivory', caption: 'text-ivory/80' },
  ink: { art: 'bg-[#26221d] text-ivory', caption: 'text-ivory/80' },
}

// Brand categories and product categories (see ../docs/API.md).
const ICONS = {
  fashion: Handbag,
  bags: Handbag,
  clothing: Shirt,
  shoes: Footprints,
  jewelry: Gem,
  watches: Watch,
}

// Stand-in for a product or campaign photo until real images arrive.
// Size it with className (e.g. aspect-4/5 or absolute inset-0). Children are
// laid over the art and don't zoom with it. Inside a `group`, the art drifts
// in slowly on hover.
export default function ImagePlaceholder({
  tone = 'stone',
  category,
  label,
  photo,
  onPhotoError,
  photoClassName,
  className,
  children,
}) {
  const Icon = ICONS[category]
  // A product `photo` ({ url, alt }) replaces the stand-in, set on ivory the
  // way product cards show theirs. `onPhotoError` is told when it doesn't load;
  // `photoClassName` adjusts its padding, e.g. to clear text laid over it.
  if (photo) {
    return (
      <div className={cn('relative isolate overflow-hidden', className)}>
        <div className="absolute inset-0 -z-10 bg-ivory transition-transform duration-1600 ease-lux group-hover:scale-[1.04] motion-reduce:transition-none">
          <img
            src={photo.url}
            alt={photo.alt}
            loading="lazy"
            decoding="async"
            onError={onPhotoError}
            className={cn('absolute inset-0 size-full object-contain p-[8%] mix-blend-multiply', photoClassName)}
          />
        </div>
        {children}
      </div>
    )
  }
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <div
        // Without a label it's only decoration: nothing for screen readers to say.
        {...(label ? { role: 'img', 'aria-label': `Image placeholder: ${label}` } : { 'aria-hidden': true })}
        className={cn(
          'placeholder-art absolute inset-0 -z-10 transition-transform duration-1600 ease-lux group-hover:scale-[1.04] motion-reduce:transition-none',
          TONES[tone].art,
        )}
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            strokeWidth={0.5}
            className="absolute top-1/2 left-1/2 size-[22%] max-h-36 max-w-36 min-w-10 -translate-1/2 opacity-30"
          />
        )}
      </div>
      {children}
      {label && (
        <span
          aria-hidden="true"
          className={cn(
            'eyebrow pointer-events-none absolute right-4 bottom-4 text-[0.625rem]',
            TONES[tone].caption,
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
