import { ArrowUpRight } from 'lucide-react'

const LABEL = { wayback: 'Internet Archive', manual: 'Checked by hand' }

// Where a past price came from, linked when there is a page to show for it:
// the archived snapshot, or the official page a person read it from.
export default function PriceSource({ origin, archiveUrl, sourceUrl }) {
  const label = LABEL[origin] ?? 'Daily crawl'
  const url = origin === 'wayback' ? archiveUrl : origin === 'manual' ? sourceUrl : null
  if (!url) return label
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
      <span className="link-underline">{label}</span>
      <ArrowUpRight className="size-3" strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
