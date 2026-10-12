import { cn } from '@/lib/utils'

// Key facts as hairline-ruled rows, label left and value right.
// `items`: [label, value] pairs.
export default function FactList({ items, className }) {
  return (
    <dl className={cn('border-b', className)}>
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-6 border-t py-3.5">
          <dt className="eyebrow shrink-0 text-muted-foreground">{label}</dt>
          <dd className="text-right text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
