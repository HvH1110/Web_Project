import { cn } from '@/lib/utils'

// A row of joined toggle buttons, exactly one pressed: ranges, currencies,
// tabs. `options`: [{ value, label }].
export default function Segmented({ label, options, value, onChange, className }) {
  return (
    <div role="group" aria-label={label} className={cn('flex', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'eyebrow -ml-px h-10 border px-4 text-[0.625rem] tracking-[0.16em] whitespace-nowrap transition-colors first:ml-0',
              active
                ? 'relative z-10 border-foreground bg-foreground text-background'
                : 'border-border hover:border-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
