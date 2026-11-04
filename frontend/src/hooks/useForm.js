import { useState } from 'react'
import { describeError, validate } from '@/lib/forms'

// State for one form: values, per-field errors, a form-level error
// and a success notice. On submit it checks `rules` ({ field: check }) and
// focuses the first field that fails; otherwise it awaits
// `onSubmit(values, { reset })`, whose return value (a string) becomes the
// notice. A failed request goes on the field `fieldFor(error)` names, or
// above the button when it names none.
export function useForm({ initial, rules, onSubmit, fieldFor }) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e) => {
      const { value } = e.target
      setValues((v) => ({ ...v, [name]: value }))
      setErrors((current) => {
        if (!current[name]) return current
        const rest = { ...current }
        delete rest[name]
        return rest
      })
      setNotice(null)
    },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const form = e.currentTarget
    const focus = (found) => [...form.elements].find((el) => found[el.name])?.focus()
    setFormError(null)
    setNotice(null)

    const found = validate(values, rules)
    setErrors(found ?? {})
    if (found) return focus(found)

    setSubmitting(true)
    try {
      const message = await onSubmit(values, { reset: setValues })
      if (typeof message === 'string') setNotice(message)
    } catch (error) {
      const name = fieldFor?.(error)
      if (name) {
        setErrors({ [name]: error.message })
        focus({ [name]: true })
      } else {
        setFormError(describeError(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return { values, field, handleSubmit, submitting, formError, notice }
}
