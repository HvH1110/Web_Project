import { Badge } from '@/components/ui/badge'
import { STATE_LABEL } from '@/lib/telemetry'
import { cn } from '@/lib/utils'
import { STATUS_META } from './status'

export default function StatusBadge({ state, label, className }) {
  const { icon: Icon, color } = STATUS_META[state]
  return (
    <Badge variant="outline" className={cn('font-mono tracking-wider', className)}>
      <Icon data-icon="inline-start" style={{ color }} aria-hidden="true" />
      {label ?? STATE_LABEL[state]}
    </Badge>
  )
}
