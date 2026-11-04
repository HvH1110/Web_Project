import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// One labelled input for the account forms, with an optional hint below and
// its error, both tied to the input for screen readers. Password inputs get
// a show / hide toggle. Other props go to the input (name, value, onChange,
// autoComplete…); `name` doubles as the id.
export default function AccountField({ name, label, description, error, type = 'text', className, ...props }) {
  const [shown, setShown] = useState(false)
  const password = type === 'password'
  const describedBy = [description && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ')

  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={name} className="text-[0.6875rem] leading-4 tracking-[0.2em] uppercase">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={password && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('h-12 rounded-none px-4 text-base md:text-base', password && 'pr-12')}
          {...props}
        />
        {password && (
          <button
            type="button"
            aria-pressed={shown}
            aria-controls={name}
            onClick={() => setShown((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
          >
            {shown ? (
              <EyeOff className="size-4" strokeWidth={1.25} aria-hidden="true" />
            ) : (
              <Eye className="size-4" strokeWidth={1.25} aria-hidden="true" />
            )}
            <span className="sr-only">Show password</span>
          </button>
        )}
      </div>
      {description && <FieldDescription id={`${name}-hint`}>{description}</FieldDescription>}
      {error && <FieldError id={`${name}-error`}>{error}</FieldError>}
    </Field>
  )
}
