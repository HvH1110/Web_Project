import { cn } from '@/lib/utils'

// Key facts as hairline-ruled rows: label left, value right.
export default function BrandFacts({ brand, className }) {
  const facts = [
    ['Founded', `${brand.founded.place}, ${brand.founded.year}`],
    ['Founder', brand.founder],
    ['Headquarters', brand.headquarters],
    ['Group', brand.group],
  ]

  return (
    <dl className={cn('border-b', className)}>
      {facts.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-6 border-t py-3.5">
          <dt className="eyebrow shrink-0 text-muted-foreground">{label}</dt>
          <dd className="text-right text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
