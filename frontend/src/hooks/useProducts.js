import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { getProducts } from '@/lib/api'

// GET /api/products for `query` (every param except page and limit), with
// "load more" paging. Changing the query starts again from page 1; until it
// answers, `items` holds the previous results and `refreshing` is true.
export function useProducts(query, { limit = 24 } = {}) {
  const key = JSON.stringify(query)
  const first = useApi(key, (signal) => getProducts({ ...query, page: 1, limit }, { signal }))
  // Pages 2 and up for `key`.
  const [more, setMore] = useState({ key: null, pages: [], loading: false, error: null })
  const extra = more.key === key ? more : { pages: [], loading: false, error: null }

  const pages = first.data ? [first.data, ...extra.pages] : []
  const last = pages.at(-1)

  async function loadMore() {
    if (!last || extra.loading) return
    setMore({ key, pages: extra.pages, loading: true, error: null })
    try {
      const data = await getProducts({ ...query, page: last.page + 1, limit })
      setMore((m) => (m.key === key ? { ...m, pages: [...m.pages, data], loading: false } : m))
    } catch (error) {
      setMore((m) => (m.key === key ? { ...m, loading: false, error } : m))
    }
  }

  const refreshing = first.loading && Boolean(first.previous)
  const shown = refreshing ? [first.previous] : pages
  // New products can shift later pages by a place or two, so drop repeats.
  const seen = new Set()
  const items = shown
    .flatMap((page) => page.items)
    .filter((item) => !seen.has(item.id) && seen.add(item.id))

  return {
    items,
    total: shown.at(-1)?.total ?? 0,
    fx: shown.at(-1)?.fx ?? null,
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
