import { useEffect } from 'react'
import { DEFAULT_DESCRIPTION, SITE } from '@/content/site'

// Fills in an existing <head> tag, or adds it. index.html holds defaults for
// crawlers that don't run JavaScript, so tags are updated rather than duplicated.
function setTag(selector, create, attribute, value) {
  let tag = document.head.querySelector(selector)
  if (value == null) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = create()
    document.head.append(tag)
  }
  tag.setAttribute(attribute, value)
}

const meta = (attribute, name) => () => {
  const tag = document.createElement('meta')
  tag.setAttribute(attribute, name)
  return tag
}
const canonicalLink = () => {
  const tag = document.createElement('link')
  tag.rel = 'canonical'
  return tag
}

// The page's title, description, social tags and canonical URL (the path
// alone, since filters in the query show the same page). Every page renders
// one. `noindex` keeps members-only and utility pages out of search engines.
export default function PageMeta({ title, description = DEFAULT_DESCRIPTION, noindex = false }) {
  const fullTitle = title ? `${title} · ${SITE.name}` : `${SITE.name} · ${SITE.tagline}`

  useEffect(() => {
    const { origin, pathname } = window.location
    setTag('meta[name="description"]', meta('name', 'description'), 'content', description)
    setTag('meta[property="og:title"]', meta('property', 'og:title'), 'content', fullTitle)
    setTag('meta[property="og:description"]', meta('property', 'og:description'), 'content', description)
    setTag('meta[property="og:url"]', meta('property', 'og:url'), 'content', origin + pathname)
    setTag('link[rel="canonical"]', canonicalLink, 'href', origin + pathname)
    setTag('meta[name="robots"]', meta('name', 'robots'), 'content', noindex ? 'noindex' : null)
  }, [fullTitle, description, noindex])

  return <title>{fullTitle}</title>
}
