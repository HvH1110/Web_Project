import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BRANDS } from '@/content/brands'

const NONE = 'none'

// Choose one of the houses, or none. `value` is a brand slug or '';
// `labelId` is the id of the visible label.
export default function BrandSelect({ value, onChange, labelId, noneLabel, className }) {
  const options = [{ value: NONE, label: noneLabel }, ...BRANDS.map((b) => ({ value: b.slug, label: b.name }))]
  return (
    <Select items={options} value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger aria-labelledby={labelId} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
