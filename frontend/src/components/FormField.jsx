import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// One labelled input for a form, with an optional hint below and its error,
// both tied to the input for screen readers. Password inputs get a show / hide
// toggle, and `multiline` makes it a textarea that grows with its text. Other
// props go to the input (name, value, onChange, autoComplete…). `id` defaults
// to `name`; set it when a page has several forms with the same field.
export default function FormField({ name, id = name, label, description, error, type = 'text', multiline, className, ...props }) {
  const [shown, setShown] = useState(false)
  const password = type === 'password'
  const describedBy = [description && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  const control = {
    id,
    name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    ...props,
  }

  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id} className="text-[0.6875rem] leading-4 tracking-[0.2em] uppercase">
        {label}
      </FieldLabel>
      <div className="relative">
        {multiline ? (
          <Textarea {...control} className="min-h-32 rounded-none px-4 py-3 text-base md:text-base" />
        ) : (
          <Input
            {...control}
            type={password && shown ? 'text' : type}
            className={cn('h-12 rounded-none px-4 text-base md:text-base', password && 'pr-12')}
          />
        )}
        {password && (
          <button
            type="button"
            aria-pressed={shown}
            aria-controls={id}
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
      {description && <FieldDescription id={`${id}-hint`}>{description}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}
