import { useEffect, useEffectEvent, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

// Large text search on a hairline. Calls onSearch(text) 350 ms after typing
// stops, on Enter, or with '' when cleared. `value` is the search in the URL.
export default function SearchBox({ value, onSearch }) {
  const [text, setText] = useState(value)
  const [shown, setShown] = useState(value)
  // The URL changed from elsewhere (back button, a removed chip): follow it,
  // unless it only differs from what's typed by surrounding spaces.
  if (value !== shown) {
    setShown(value)
    if (value !== text.trim()) setText(value)
  }

  const search = useEffectEvent((q) => onSearch(q))
  useEffect(() => {
    const q = text.trim()
    if (q === value) return
    const timer = setTimeout(() => search(q), 350)
    return () => clearTimeout(timer)
  }, [text, value])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
      className="flex items-center gap-4 border-b border-foreground pb-3 transition-shadow focus-within:shadow-[0_1px_0_0_var(--foreground)]"
    >
      <Search className="size-5 shrink-0" strokeWidth={1.25} aria-hidden="true" />
      <label htmlFor="search-q" className="sr-only">
        Search products
      </label>
      <Input
        id="search-q"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Name, collection or reference"
        className="h-auto rounded-none border-0 bg-transparent p-0 font-serif text-[length:var(--text-display-sm)] leading-tight placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-[length:var(--text-display-sm)] dark:bg-transparent [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('')
            onSearch('')
          }}
          className="grid size-9 shrink-0 place-items-center"
        >
          <X className="size-4" strokeWidth={1.25} aria-hidden="true" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </form>
  )
}
