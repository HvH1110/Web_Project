import CtaButton from '@/components/CtaButton'
import { waitText } from '@/lib/forms'
import { cn } from '@/lib/utils'

// What to say for an ApiError from src/lib/api.js.
function describe(error) {
  if (error?.status === 0) return "We can't reach the catalog right now."
  if (error?.status === 503) return 'The catalog is temporarily unavailable.'
  if (error?.status === 429) return 'Too many requests right now.'
  return 'Something went wrong while loading.'
}

// A failed load, with a retry button. `message` replaces the default line.
export default function LoadError({ error, onRetry, message, className }) {
  return (
    <div role="alert" className={cn('grid justify-items-start gap-4 border-y py-12', className)}>
      <p className="eyebrow text-muted-foreground">
        {error?.status ? `Error ${error.status}` : 'Connection error'}
      </p>
      <p className="font-serif text-display-sm">{message ?? describe(error)}</p>
      <p className="text-sm text-muted-foreground">
        Please try again in {error?.retryAfter != null ? waitText(error.retryAfter) : 'a moment'}.
      </p>
      {onRetry && (
        <CtaButton variant="outline" onClick={onRetry} className="mt-2">
          Try again
        </CtaButton>
      )}
    </div>
  )
}
