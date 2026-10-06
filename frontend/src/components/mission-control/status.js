import { CircleCheck, CircleDashed, CircleX, Radio, TriangleAlert } from 'lucide-react'

// Status color never stands alone: every use pairs it with this icon and a label.
export const STATUS_META = {
  go: { icon: CircleCheck, color: 'var(--status-good)' },
  caution: { icon: TriangleAlert, color: 'var(--status-warning)' },
  nogo: { icon: CircleX, color: 'var(--status-critical)' },
  nodata: { icon: CircleDashed, color: 'var(--status-none)' },
  info: { icon: Radio, color: 'var(--muted-foreground)' },
}
