import { Link, Navigate, useSearchParams } from 'react-router'
import FormField from '@/components/FormField'
import AccountShell from '@/components/account/AccountShell'
import FormFooter from '@/components/FormFooter'
import PageMeta from '@/components/PageMeta'
import CtaButton from '@/components/CtaButton'
import { useForm } from '@/hooks/useForm'
import { useAuth } from '@/hooks/useAuth'
import {
  accountPath,
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  normalizeName,
  safeNext,
} from '@/lib/account'
import { fieldFromMessage } from '@/lib/forms'

const FIELDS = [
  [/display ?name/i, 'displayName'],
  [/email/i, 'email'],
  [/password/i, 'password'],
]

// /account/register?next=/path: POST /api/auth/register, which also logs in,
// then back to `next` (the account page by default).
export default function RegisterPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const form = useForm({
    initial: { displayName: '', email: '', password: '' },
    rules: { displayName: checkDisplayName, email: checkEmail, password: checkNewPassword },
    onSubmit: ({ displayName, email, password }) =>
      auth.register({ displayName: normalizeName(displayName), email: email.trim(), password }),
    fieldFor: (error) => fieldFromMessage(error, FIELDS),
  })

  if (auth.user) return <Navigate to={next} replace />

  return (
    <>
      <PageMeta title="Create an account" noindex />
      <AccountShell
        title="Create an account"
        intro={
          <>
            <p>
              Join the community to start topics and reply to other members. Prices, history and
              deals stay open to everyone, with or without an account.
            </p>
            <p>
              Already a member?{' '}
              <Link to={accountPath('login', next)} className="text-foreground underline underline-offset-4">
                Log in
              </Link>
            </p>
          </>
        }
      >
        <form noValidate onSubmit={form.handleSubmit} className="grid gap-6">
          <FormField
            label="Display name"
            description="Shown on the forum. 2 to 30 letters, digits, spaces, “.”, “_” or “-”."
            autoComplete="nickname"
            maxLength={30}
            {...form.field('displayName')}
          />
          <FormField
            label="Email"
            description="Only you see it. Use it to log in."
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            maxLength={254}
            {...form.field('email')}
          />
          <FormField
            label="Password"
            description="At least 8 characters."
            type="password"
            autoComplete="new-password"
            maxLength={128}
            {...form.field('password')}
          />
          <FormFooter error={form.formError}>
            <CtaButton type="submit" className="w-full">
              {form.submitting ? 'Creating your account…' : 'Create account'}
            </CtaButton>
          </FormFooter>
        </form>
      </AccountShell>
    </>
  )
}
