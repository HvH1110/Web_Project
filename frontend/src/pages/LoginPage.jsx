import { Link, Navigate, useSearchParams } from 'react-router'
import AccountField from '@/components/account/AccountField'
import AccountShell from '@/components/account/AccountShell'
import FormFooter from '@/components/account/FormFooter'
import CtaButton from '@/components/CtaButton'
import { SITE } from '@/content/site'
import { useAccountForm } from '@/hooks/useAccountForm'
import { useAuth } from '@/hooks/useAuth'
import { accountPath, checkEmail, checkRequired, safeNext } from '@/lib/account'

const ENDED = {
  logout: 'You’ve logged out.',
  expired: 'Your session has ended. Log in again to continue.',
}

// /account/login?next=/path: POST /api/auth/login, then back to `next`
// (the account page by default). Already logged in goes straight there.
export default function LoginPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const form = useAccountForm({
    initial: { email: '', password: '' },
    rules: { email: checkEmail, password: checkRequired('Enter your password.') },
    onSubmit: ({ email, password }) => auth.login({ email: email.trim(), password }),
  })

  if (auth.user) return <Navigate to={next} replace />

  return (
    <>
      <title>{`Log in · ${SITE.name}`}</title>
      <AccountShell
        title="Log in"
        intro={
          <>
            <p>
              Prices, history and deals are open to everyone. An account is for the community: start
              topics and reply to other members.
            </p>
            <p>
              New here?{' '}
              <Link to={accountPath('register', next)} className="text-foreground underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </>
        }
      >
        {auth.ended && (
          <p className="mb-8 border-y py-4 text-sm" role="status">
            {ENDED[auth.ended]}
          </p>
        )}
        <form noValidate onSubmit={form.handleSubmit} className="grid gap-6">
          <AccountField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            {...form.field('email')}
          />
          <AccountField label="Password" type="password" autoComplete="current-password" {...form.field('password')} />
          <FormFooter error={form.formError}>
            <CtaButton type="submit" className="w-full">
              {form.submitting ? 'Logging in…' : 'Log in'}
            </CtaButton>
          </FormFooter>
        </form>
      </AccountShell>
    </>
  )
}
