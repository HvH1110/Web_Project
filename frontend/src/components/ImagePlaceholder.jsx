import { Gem, Handbag, Watch } from 'lucide-react'
import { cn } from '@/lib/utils'

// Studio backdrops in the house neutrals. `ink` is lifted a little so it
// still reads on a dark section.
const TONES = {
  stone: 'bg-stone text-ink',
  sand: 'bg-sand text-ink',
  taupe: 'bg-taupe text-ink',
  graphite: 'bg-graphite text-ivory',
  ink: 'bg-[#26221d] text-ivory',
}

const ICONS = { fashion: Handbag, jewelry: Gem, watches: Watch }

// Stand-in for a product or campaign photo until real images arrive.
// Size it with className (e.g. aspect-4/5 or absolute inset-0). Children are
// laid over the art and don't zoom with it; move the caption out of their way
// with captionClassName. Inside a `group`, the art drifts
// in slowly on hover.
export default function ImagePlaceholder({
  tone = 'stone',
  category,
  label,
  captionClassName,
  className,
  children,
}) {
  const Icon = ICONS[category]
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <div
        role="img"
        aria-label={label ? `Image placeholder: ${label}` : 'Image placeholder'}
        className={cn(
          'placeholder-art absolute inset-0 -z-10 transition-transform duration-1600 ease-lux group-hover:scale-[1.04] motion-reduce:transition-none',
          TONES[tone],
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
        // Difference blend keeps the caption legible on light art, dark art and overlays.
        <span
          aria-hidden="true"
          className={cn(
            'eyebrow pointer-events-none absolute right-4 bottom-4 text-[0.625rem] text-white/70 mix-blend-difference',
            captionClassName,
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
