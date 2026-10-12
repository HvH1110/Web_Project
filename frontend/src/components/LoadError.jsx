import CtaButton from '@/components/CtaButton'
import { cn } from '@/lib/utils'

// What to say for an ApiError from src/lib/api.js.
function describe(error) {
  if (error?.status === 0) return "We can't reach the catalog right now."
  if (error?.status === 503) return 'The catalog is temporarily unavailable.'
  return 'Something went wrong while loading.'
}

// A failed load, with a retry button.
export default function LoadError({ error, onRetry, className }) {
  return (
    <div role="alert" className={cn('grid justify-items-start gap-4 border-y py-12', className)}>
      <p className="eyebrow text-muted-foreground">
        {error?.status ? `Error ${error.status}` : 'Connection error'}
      </p>
      <p className="font-serif text-display-sm">{describe(error)}</p>
      <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
      {onRetry && (
        <CtaButton variant="outline" onClick={onRetry} className="mt-2">
          Try again
        </CtaButton>
      )}
    </div>
  )
}
