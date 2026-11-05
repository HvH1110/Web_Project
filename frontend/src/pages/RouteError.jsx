import { useEffect, useState } from 'react'
import { Link, useRouteError } from 'react-router'
import CtaButton from '@/components/CtaButton'
import PageMeta from '@/components/PageMeta'

const RELOADED_AT = 'maison-prix:reloaded-for-new-version'
const RELOAD_AGAIN_AFTER_MS = 60000

// After a deploy, a tab left open asks for page files that no longer exist.
const isOldBuild = (error) =>
  /dynamically imported module|importing a module script|module script failed/i.test(error?.message ?? '')

// Reloading fetches the new version, but must not loop if that fails too.
// Storage can be blocked, in which case the page just offers the button.
function mayReload() {
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOADED_AT) ?? 0) > RELOAD_AGAIN_AFTER_MS
  } catch {
    return false
  }
}

// Shown when a page fails to load or crashes while rendering.
export default function RouteError() {
  const error = useRouteError()
  const oldBuild = isOldBuild(error)
  const [reloading] = useState(() => oldBuild && mayReload())

  useEffect(() => {
    if (!reloading) return
    try {
      sessionStorage.setItem(RELOADED_AT, String(Date.now()))
    } catch {
      // mayReload read it a moment ago, so this is very unlikely; reload anyway.
    }
    window.location.reload()
  }, [reloading])

  if (reloading) return <div className="min-h-svh" />

  return (
    <section role="alert" className="page-container grid justify-items-center gap-6 py-section text-center">
      <PageMeta title="Something went wrong" noindex />
      <p className="eyebrow text-muted-foreground">{oldBuild ? 'New version' : 'Error'}</p>
      <h1 className="max-w-3xl font-serif text-display-lg text-balance">
        {oldBuild ? 'The site has been updated.' : 'This page couldn’t be shown.'}
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        {oldBuild
          ? 'Reload to get the latest version.'
          : 'Something went wrong on our side. Reloading often fixes it; if not, please try again later.'}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <CtaButton onClick={() => window.location.reload()}>Reload the page</CtaButton>
        <CtaButton variant="outline" render={<Link to="/" />} nativeButton={false}>
          Return to home
        </CtaButton>
      </div>
    </section>
  )
}
