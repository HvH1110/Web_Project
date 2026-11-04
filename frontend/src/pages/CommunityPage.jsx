import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import BrandSelect from '@/components/community/BrandSelect'
import RequireMember from '@/components/community/RequireMember'
import TopicRow from '@/components/community/TopicRow'
import CtaButton from '@/components/CtaButton'
import LoadError from '@/components/LoadError'
import PageMeta from '@/components/PageMeta'
import ProductResults from '@/components/product/ProductResults'
import SearchBox from '@/components/search/SearchBox'
import Segmented from '@/components/Segmented'
import { useAuth } from '@/hooks/useAuth'
import { usePaged } from '@/hooks/usePaged'
import { getForumTopics } from '@/lib/api'

const SORTS = [
  { value: 'activity', label: 'Latest activity' },
  { value: 'newest', label: 'Newest' },
]
const SCOPES = [
  { value: 'all', label: 'All topics' },
  { value: 'mine', label: 'My topics' },
]

// /community: the forum's topic list. Search, house, sort and "my topics" live
// in the URL (?q=&brand=rolex&sort=newest&scope=mine).
export default function CommunityPage() {
  return (
    <RequireMember>
      <Topics />
    </RequireMember>
  )
}

function Topics() {
  const { user, loginRequired } = useAuth()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const brand = params.get('brand') ?? ''
  const sort = params.get('sort') ?? 'activity'
  const scope = params.get('scope') ?? 'all'
  const query = { q, brand, sort, author: scope === 'mine' ? user.id : '' }
  const topics = usePaged(JSON.stringify(query), (page, signal) =>
    loginRequired(() => getForumTopics({ ...query, page, limit: 20 }, { signal })),
  )
  const busy = topics.loading || topics.refreshing
  const filtered = Boolean(q || brand || scope === 'mine')

  const set = (name, value, fallback = '') => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      <PageMeta title="Community" noindex />

      <section className="page-container grid gap-8 pt-12 pb-12 sm:pt-16 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-7">
          <p className="eyebrow text-muted-foreground">Community</p>
          <h1 className="font-serif text-display-lg">Members’ forum</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Ask about a piece, compare markets and share what you found. Prices elsewhere on the site
            come from official sources; what members write here is their own experience.
          </p>
        </div>
        <div className="lg:col-span-5 lg:justify-self-end lg:self-end">
          <CtaButton render={<Link to="/community/new" />} nativeButton={false}>
            <Plus className="size-4" strokeWidth={1.25} aria-hidden="true" />
            New topic
          </CtaButton>
        </div>
      </section>

      <div className="page-container pb-section">
        <SearchBox
          value={q}
          onSearch={(text) => set('q', text)}
          label="Search topics"
          placeholder="Search topics"
        />
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <span id="topic-house" className="sr-only">
            House
          </span>
          <BrandSelect
            labelId="topic-house"
            noneLabel="All houses"
            value={brand}
            onChange={(value) => set('brand', value)}
            className="min-w-52 rounded-none px-4 text-sm data-[size=default]:h-10"
          />
          <Segmented label="Which topics" options={SCOPES} value={scope} onChange={(v) => set('scope', v, 'all')} />
          <Segmented label="Sort" options={SORTS} value={sort} onChange={(v) => set('sort', v, 'activity')} />
        </div>

        {!topics.error && (
          <p className="mt-8 text-sm" aria-live="polite">
            {busy
              ? 'Looking for topics'
              : `${topics.total.toLocaleString('en-US')} ${topics.total === 1 ? 'topic' : 'topics'}`}
          </p>
        )}

        <div className="mt-6">
          <h2 className="sr-only">Topics</h2>
          <ProductResults
            products={topics}
            variant="list"
            loadingLabel="Loading topics"
            renderItem={(topic) => <TopicRow topic={topic} />}
            error={
              <LoadError
                error={topics.error}
                onRetry={topics.retry}
                message={topics.error?.status === 503 ? 'The forum is temporarily unavailable.' : 'We couldn’t load the forum.'}
              />
            }
            empty={<NoTopics filtered={filtered} />}
          />
        </div>
      </div>
    </>
  )
}

function NoTopics({ filtered }) {
  return (
    <div className="grid justify-items-center gap-4 bg-secondary px-6 py-20 text-center">
      <p className="eyebrow text-muted-foreground">No topics</p>
      <p className="max-w-xl font-serif text-display-sm text-balance">
        {filtered ? 'Nothing matches these filters.' : 'No one has started a topic yet.'}
      </p>
      {!filtered && (
        <CtaButton render={<Link to="/community/new" />} nativeButton={false} className="mt-2">
          Start the first one
        </CtaButton>
      )}
    </div>
  )
}
