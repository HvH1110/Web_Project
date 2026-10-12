import { Link } from 'react-router'
import CtaButton from '@/components/CtaButton'

export default function NotFoundPage() {
  return (
    <section className="page-container grid justify-items-center gap-6 py-section text-center">
      <p className="eyebrow text-muted-foreground">Error 404</p>
      <h1 className="max-w-3xl font-serif text-display-lg text-balance">
        This page isn't in the catalog.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        The address may be mistyped, or the page hasn't been built yet.
      </p>
      <CtaButton render={<Link to="/" />} nativeButton={false} className="mt-4">
        Return to home
      </CtaButton>
    </section>
  )
}
