import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { BRANDS } from '@/content/brands'
import { MARKETS } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { getBrand } from '@/lib/api'
import { PRICE_PRESETS, PRODUCT_CATEGORIES } from '@/lib/catalog'
import { cn } from '@/lib/utils'

// The search filters, for the desktop sidebar and the mobile sheet. Every
// change calls onChange(patch) right away; the parent writes it to the URL.
// Collections show once exactly one house is chosen.
export default function SearchFilters({ filters, onChange }) {
  const house = filters.brand.length === 1 ? filters.brand[0] : ''
  const collections = useApi(house, (signal) =>
    house ? getBrand(house, { signal }).then((d) => d.brand.collections) : Promise.resolve([]),
  )

  const toggle = (key, value) => {
    const list = filters[key]
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    // Collections belong to a house, so a new house choice clears them.
    onChange(key === 'brand' ? { brand: next, collection: [] } : { [key]: next })
  }

  return (
    <div className="grid gap-10">
      <FilterGroup legend="House">
        {BRANDS.map((b) => (
          <CheckOption
            key={b.slug}
            label={b.name}
            checked={filters.brand.includes(b.slug)}
            onChange={() => toggle('brand', b.slug)}
          />
        ))}
      </FilterGroup>

      {collections.data?.length > 0 && (
        <FilterGroup legend="Collection" className="max-h-80 overflow-y-auto">
          {collections.data.map((c) => (
            <CheckOption
              key={c.name}
              label={c.name}
              count={c.productCount}
              checked={filters.collection.includes(c.name)}
              onChange={() => toggle('collection', c.name)}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup legend="Category">
        {PRODUCT_CATEGORIES.map((c) => (
          <CheckOption
            key={c.value}
            label={c.label}
            checked={filters.category.includes(c.value)}
            onChange={() => toggle('category', c.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup
        legend="Sold in"
        hint="Prices, price filters and sorting then count only these markets."
      >
        {MARKETS.map((m) => (
          <CheckOption
            key={m.code}
            label={m.name}
            count={m.currency}
            checked={filters.market.includes(m.code)}
            onChange={() => toggle('market', m.code)}
          />
        ))}
      </FilterGroup>

      <PriceFilter min={filters.minPriceVnd} max={filters.maxPriceVnd} onChange={onChange} />
    </div>
  )
}

function FilterGroup({ legend, hint, className, children }) {
  return (
    <fieldset className="grid gap-4 border-t pt-6">
      <legend className="eyebrow float-left mb-1 w-full">{legend}</legend>
      {hint && <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      <div className={cn('grid gap-3', className)}>{children}</div>
    </fieldset>
  )
}

function CheckOption({ label, count, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} className="rounded-none" />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
    </label>
  )
}

const toMillions = (vnd) => (vnd ? String(Number(vnd) / 1e6) : '')
// Million VND as typed ("1,5" or "1.5") to whole VND; '' when empty or invalid.
function toVnd(text) {
  const n = Number(text.trim().replace(',', '.'))
  return text.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 1e6) : ''
}

// Presets, or a custom range in million VND applied on Enter, on "Apply" or
// when focus leaves the two fields.
function PriceFilter({ min, max, onChange }) {
  const [draft, setDraft] = useState({ min: toMillions(min), max: toMillions(max) })
  const [shown, setShown] = useState(`${min}-${max}`)
  if (`${min}-${max}` !== shown) {
    setShown(`${min}-${max}`)
    setDraft({ min: toMillions(min), max: toMillions(max) })
  }

  const apply = () => {
    let [lo, hi] = [toVnd(draft.min), toVnd(draft.max)]
    if (lo !== '' && hi !== '' && lo > hi) [lo, hi] = [hi, lo]
    if (String(lo) !== min || String(hi) !== max) onChange({ minPriceVnd: lo, maxPriceVnd: hi })
    else setDraft({ min: toMillions(min), max: toMillions(max) })
  }

  return (
    <FilterGroup legend="Price">
      {PRICE_PRESETS.map((p) => {
        const active = String(p.min ?? '') === min && String(p.max ?? '') === max
        return (
          <button
            key={p.label}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onChange(
                active
                  ? { minPriceVnd: '', maxPriceVnd: '' }
                  : { minPriceVnd: p.min ?? '', maxPriceVnd: p.max ?? '' },
              )
            }
            className={cn(
              'justify-self-start text-left text-sm',
              active ? 'underline underline-offset-4' : 'link-underline',
            )}
          >
            {p.label}
          </button>
        )
      })}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) apply()
        }}
        className="mt-2 grid gap-3"
      >
        <p className="text-xs text-muted-foreground">Or a range, in million VND</p>
        <div className="flex items-center gap-2">
          <PriceInput label="Minimum" value={draft.min} onChange={(v) => setDraft((d) => ({ ...d, min: v }))} />
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <PriceInput label="Maximum" value={draft.max} onChange={(v) => setDraft((d) => ({ ...d, max: v }))} />
        </div>
        <button type="submit" className="eyebrow link-underline justify-self-start">
          Apply
        </button>
      </form>
    </FilterGroup>
  )
}

function PriceInput({ label, value, onChange }) {
  return (
    <Input
      aria-label={`${label}, million VND`}
      placeholder={label === 'Minimum' ? 'Min' : 'Max'}
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-none tabular-nums"
    />
  )
}
