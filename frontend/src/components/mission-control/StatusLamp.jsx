import { STATE_LABEL } from '@/lib/telemetry'
import { cn } from '@/lib/utils'
import { STATUS_META } from './status'

// Console indicator lamp: lit and glowing for GO / CAUTION / NO-GO, dark for NO DATA.
export default function StatusLamp({ state, label, size, className }) {
  const { icon: Icon } = STATUS_META[state]
  return (
    <span data-state={state} data-size={size} className={cn('mc-lamp', className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label ?? STATE_LABEL[state]}
    </span>
  )
}
