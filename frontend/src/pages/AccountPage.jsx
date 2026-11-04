import { useId, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import FormField from '@/components/FormField'
import FormFooter from '@/components/FormFooter'
import CtaButton from '@/components/CtaButton'
import FactList from '@/components/FactList'
import LoadError from '@/components/LoadError'
import PageMeta from '@/components/PageMeta'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from '@/hooks/useForm'
import { useAuth } from '@/hooks/useAuth'
import {
  accountPath,
  checkDisplayName,
  checkNewPassword,
  normalizeName,
} from '@/lib/account'
import { checkRequired, describeError, fieldFromMessage } from '@/lib/forms'
import { formatDate } from '@/lib/format'

const ROLES = { moderator: 'Moderator', admin: 'Administrator' }

// /account: the logged-in member's profile (GET /api/me), with forms for the
// display name and password, and log out. Logged out goes to log in, which
// comes back here.
export default function AccountPage() {
  const auth = useAuth()
  const { pathname, search } = useLocation()

  if (auth.status === 'loading') return <AccountSkeleton />
  if (auth.status === 'error') {
    return (
      <div className="page-container py-section">
        <PageMeta title="Account" noindex />
        <LoadError
          error={auth.error}
          onRetry={auth.retry}
          message={auth.error?.status === 503 ? 'Accounts are temporarily unavailable.' : 'We can’t reach your account right now.'}
        />
      </div>
    )
  }
  if (!auth.user) return <Navigate to={accountPath('login', pathname + search)} replace />

  const { user } = auth
  return (
    <>
      <PageMeta title="Account" noindex />
      <section className="page-container grid gap-4 pt-12 pb-12 sm:pt-16">
        <p className="eyebrow text-muted-foreground">Your account</p>
        <h1 className="font-serif text-display-lg break-words">{user.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          Member since {formatDate(user.createdAt)}
          {ROLES[user.role] && ` · ${ROLES[user.role]}`}
        </p>
      </section>

      <div className="page-container pb-section">
        <AccountSection
          title="Profile"
          intro="Your display name is how other members see you in the community. Your email is only shown to you."
        >
          <FactList items={[['Email', <span className="break-all">{user.email}</span>]]} className="mb-10" />
          <ProfileForm user={user} updateProfile={auth.updateProfile} />
        </AccountSection>

        <AccountSection
          title="Password"
          intro="Changing it logs you out on every other browser and device. You stay logged in here."
        >
          <PasswordForm email={user.email} changePassword={auth.changePassword} />
        </AccountSection>

        <AccountSection
          title="Log out"
          intro="You stay logged in on this browser for 30 days after logging in, unless you log out."
        >
          <LogOut logout={auth.logout} />
        </AccountSection>
      </div>
    </>
  )
}

// A hairline-topped row: heading and a line on the left, content on the right.
function AccountSection({ title, intro, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid gap-8 border-t py-12 lg:grid-cols-12 lg:gap-8">
      <div className="grid content-start gap-3 lg:col-span-4">
        <h2 id={id} className="font-serif text-display-sm">
          {title}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{intro}</p>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">{children}</div>
    </section>
  )
}

function ProfileForm({ user, updateProfile }) {
  const form = useForm({
    initial: { displayName: user.displayName },
    rules: { displayName: checkDisplayName },
    onSubmit: async ({ displayName }, { reset }) => {
      const name = normalizeName(displayName)
      if (name !== user.displayName) await updateProfile({ displayName: name })
      reset({ displayName: name })
      return 'Saved.'
    },
    fieldFor: (error) => fieldFromMessage(error, [[/./, 'displayName']]),
  })

  return (
    <form noValidate onSubmit={form.handleSubmit} className="grid gap-6">
      <FormField
        label="Display name"
        description="2 to 30 letters, digits, spaces, “.”, “_” or “-”."
        autoComplete="nickname"
        maxLength={30}
        {...form.field('displayName')}
      />
      <FormFooter error={form.formError} notice={form.notice}>
        <CtaButton type="submit" variant="outline">
          {form.submitting ? 'Saving…' : 'Save name'}
        </CtaButton>
      </FormFooter>
    </form>
  )
}

function PasswordForm({ email, changePassword }) {
  const form = useForm({
    initial: { currentPassword: '', newPassword: '' },
    rules: {
      currentPassword: checkRequired('Enter your current password.'),
      newPassword: checkNewPassword,
    },
    onSubmit: async (fields, { reset }) => {
      await changePassword(fields)
      reset({ currentPassword: '', newPassword: '' })
      return 'Password changed. Other browsers were logged out.'
    },
    fieldFor: (error) =>
      error.status === 403 ? 'currentPassword' : fieldFromMessage(error, [[/new/i, 'newPassword'], [/current/i, 'currentPassword']]),
  })

  return (
    <form noValidate onSubmit={form.handleSubmit} className="grid gap-6">
      {/* Tells password managers which account the new password is for. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <FormField
        label="Current password"
        type="password"
        autoComplete="current-password"
        {...form.field('currentPassword')}
      />
      <FormField
        label="New password"
        description="At least 8 characters."
        type="password"
        autoComplete="new-password"
        maxLength={128}
        {...form.field('newPassword')}
      />
      <FormFooter error={form.formError} notice={form.notice}>
        <CtaButton type="submit" variant="outline">
          {form.submitting ? 'Changing…' : 'Change password'}
        </CtaButton>
      </FormFooter>
    </form>
  )
}

// Logging out makes the member null, so the page itself moves on to log in.
function LogOut({ logout }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const onClick = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await logout()
    } catch (err) {
      setError(describeError(err))
      setBusy(false)
    }
  }

  return (
    <FormFooter error={error}>
      <CtaButton type="button" onClick={onClick}>
        {busy ? 'Logging out…' : 'Log out'}
      </CtaButton>
    </FormFooter>
  )
}

function AccountSkeleton() {
  return (
    <div className="page-container grid min-h-svh content-start gap-4 pt-12 pb-section sm:pt-16" aria-busy="true">
      <PageMeta title="Account" noindex />
      <p className="eyebrow text-muted-foreground">Your account</p>
      <Skeleton className="h-16 w-full max-w-md rounded-none" />
      <Skeleton className="h-4 w-48 rounded-none" />
      <span className="sr-only" role="status">
        Loading your account
      </span>
    </div>
  )
}
