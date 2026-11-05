import { useState } from 'react'
import { useLocation } from 'react-router'
import { useApi } from '@/hooks/useApi'

// Pages 2 and up for each list and history entry, so going back to a list finds
// the items that were loaded and the visitor's place in it. Page 1 still reloads.
const loadedPages = new Map()

// A paged list endpoint with "load more". `load(page, signal)` fetches one
// page shaped { items, page, totalPages, total, … }. Changing `key` starts
// again from page 1; until it answers, `items` holds the previous results and
// `refreshing` is true. `itemKey` drops repeats, since new entries can shift
// later pages by a place or two. `latest` is the newest page, for extra fields
// such as `fx`.
export function usePaged(key, load, itemKey = (item) => item.id) {
  const first = useApi(key, (signal) => load(1, signal))
  const entry = `${useLocation().key}/${key}`
  // Pages 2 and up for `key`.
  const [more, setMore] = useState(() => ({
    key,
    pages: loadedPages.get(entry) ?? [],
    loading: false,
    error: null,
  }))
  const extra = more.key === key ? more : { pages: [], loading: false, error: null }

  const pages = first.data ? [first.data, ...extra.pages] : []
  const last = pages.at(-1)

  async function loadMore() {
    if (!last || extra.loading) return
    setMore({ key, pages: extra.pages, loading: true, error: null })
    try {
      const data = await load(last.page + 1)
      loadedPages.set(entry, [...extra.pages, data])
      setMore((m) => (m.key === key ? { ...m, pages: [...m.pages, data], loading: false } : m))
    } catch (error) {
      setMore((m) => (m.key === key ? { ...m, loading: false, error } : m))
    }
  }

  const refreshing = first.loading && Boolean(first.previous)
  const shown = refreshing ? [first.previous] : pages
  const seen = new Set()
  const items = shown
    .flatMap((page) => page.items)
    .filter((item) => !seen.has(itemKey(item)) && seen.add(itemKey(item)))

  return {
    items,
    total: shown.at(-1)?.total ?? 0,
    latest: shown.at(-1) ?? null,
    loading: first.loading && !first.previous,
    refreshing,
    error: first.error,
    retry: first.retry,
    hasMore: Boolean(last) && last.page < last.totalPages,
    loadMore,
    loadingMore: extra.loading,
    loadMoreError: extra.error,
  }
}
