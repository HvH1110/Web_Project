import { useState } from 'react'
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
  // A product `photo` ({ url, alt }) fades in over the stand-in once it has
  // loaded, set on ivory the way product cards show theirs (with `fill: true`,
  // a scene photo covers the frame instead); until then, and if
  // it never loads, the stand-in shows. `onPhotoError` is told when it doesn't
  // load; `photoClassName` adjusts its padding, e.g. to clear text laid over it.
  const [shown, setShown] = useState(null)
  const showing = Boolean(photo) && shown === photo.url
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <div
        // Without a label it's only decoration: nothing for screen readers to say.
        {...(label && !photo ? { role: 'img', 'aria-label': `Image placeholder: ${label}` } : { 'aria-hidden': true })}
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
      {photo && (
        <div
          className={cn(
            'absolute inset-0 -z-10 bg-ivory transition-[opacity,scale] duration-1600 ease-lux group-hover:scale-[1.04] motion-reduce:transition-none',
            !showing && 'opacity-0',
          )}
        >
          <img
            key={photo.url}
            src={photo.url}
            alt={photo.alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setShown(photo.url)}
            onError={onPhotoError}
            className={cn(
              'absolute inset-0 size-full object-contain p-[8%] mix-blend-multiply',
              photoClassName,
              // A scene (the house's own photo) fills the frame, as photographed.
              photo.fill && 'object-cover p-0 mix-blend-normal',
            )}
          />
        </div>
      )}
      {children}
      {label && !showing && (
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
