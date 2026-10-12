import { useId } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SORTS } from '@/lib/catalog'
import { cn } from '@/lib/utils'

// Sort order for product lists (values are the API's `sort` param).
export default function SortSelect({ value, onChange, className }) {
  const labelId = useId()
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span id={labelId} className="eyebrow text-muted-foreground">
        Sort
      </span>
      <Select items={SORTS} value={value} onValueChange={onChange}>
        <SelectTrigger aria-labelledby={labelId} className="h-11 min-w-52 px-4 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
