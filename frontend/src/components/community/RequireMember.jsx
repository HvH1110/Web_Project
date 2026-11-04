import { Link, useLocation } from 'react-router'
import CtaButton from '@/components/CtaButton'
import LoadError from '@/components/LoadError'
import { Skeleton } from '@/components/ui/skeleton'
import { SITE } from '@/content/site'
import { useAuth } from '@/hooks/useAuth'
import { accountPath } from '@/lib/account'

// The forum is members only, reading included. Shows `children` to a logged-in
// member, otherwise an invitation to log in that comes back to this page.
// Children mount only then, so their requests always have a session; a session
// that ends later lands back here (see loginRequired in useAuth).
export default function RequireMember({ children }) {
  const auth = useAuth()
  const { pathname, search } = useLocation()
  const here = pathname + search

  if (auth.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Loading" className="page-container grid gap-4 pt-16 pb-section">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 max-w-md" />
      </div>
    )
  }
  if (auth.status === 'error') {
    return (
      <div className="page-container py-section">
        <LoadError
          error={auth.error}
          onRetry={auth.retry}
          message={auth.error?.status === 503 ? 'The community is temporarily unavailable.' : 'We can’t reach the community right now.'}
        />
      </div>
    )
  }
  if (auth.user) return children

  return (
    <section className="page-container grid justify-items-center gap-6 py-section text-center">
      <title>{`Community · ${SITE.name}`}</title>
      <p className="eyebrow text-muted-foreground">Community</p>
      <h1 className="max-w-3xl font-serif text-display-lg text-balance">For members only</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {auth.ended === 'expired' && 'Your session has ended. '}
        Log in to read the forum, start topics and reply to other members. Prices, history and deals
        stay open to everyone.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <CtaButton render={<Link to={accountPath('login', here)} />} nativeButton={false}>
          Log in
        </CtaButton>
        <CtaButton variant="outline" render={<Link to={accountPath('register', here)} />} nativeButton={false}>
          Create an account
        </CtaButton>
      </div>
    </section>
  )
}
