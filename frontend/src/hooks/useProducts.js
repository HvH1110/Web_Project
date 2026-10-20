import { usePaged } from '@/hooks/usePaged'
import { getProducts } from '@/lib/api'

// GET /api/products for `query` (every param except page and limit), with
// "load more" paging (see usePaged). Adds `fx` from the latest page.
export function useProducts(query, { limit = 24 } = {}) {
  const result = usePaged(JSON.stringify(query), (page, signal) =>
    getProducts({ ...query, page, limit }, { signal }),
  )
  return { ...result, fx: result.latest?.fx ?? null }
}
