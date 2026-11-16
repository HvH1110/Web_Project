import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePaged } from '@/hooks/usePaged'
import { getForumReplies } from '@/lib/api'
import { unseenReplies } from '@/lib/forum'

// A topic's replies (usePaged), kept in step with what this member does on
// the page: `add`, `replace` and `remove` take the API's answer, so nothing
// reloads. New replies stay at the end until a later page brings them in.
// `checkNew()` looks for replies other members posted since: they wait in
// `waiting` until `showWaiting()` adds them, so the page never shifts by itself.
export function useReplies(topicId) {
  const { loginRequired } = useAuth()
  const paged = usePaged(`replies/${topicId}`, (page, signal) =>
    loginRequired(() => getForumReplies(topicId, { page, limit: 50 }, { signal })),
  )
  const [added, setAdded] = useState([])
  const [changed, setChanged] = useState({})
  const [removed, setRemoved] = useState([])
  const [incoming, setIncoming] = useState([])

  const fresh = unseenReplies(paged.items, added)
  const items = [...paged.items, ...fresh]
    .filter((reply) => !removed.includes(reply.id))
    .map((reply) => changed[reply.id] ?? reply)
  const waiting = unseenReplies(items, incoming).filter((reply) => !removed.includes(reply.id))

  // Fetches from the last loaded page to the end. While pages are left to
  // load, "Load more replies" brings new ones anyway.
  async function checkNew() {
    const last = paged.latest
    if (!last || paged.loading || paged.refreshing || paged.hasMore) return
    const found = []
    for (let page = last.page; ; page += 1) {
      const data = await loginRequired(() => getForumReplies(topicId, { page, limit: 50 }))
      found.push(...data.items)
      if (page >= data.totalPages) break
    }
    setIncoming(found)
  }

  return {
    ...paged,
    items,
    total: paged.total + fresh.length - removed.length,
    waiting,
    checkNew,
    showWaiting: () => {
      setAdded((list) => [...list, ...waiting])
      setIncoming([])
    },
    add: (reply) => setAdded((list) => [...list, reply]),
    replace: (reply) => setChanged((map) => ({ ...map, [reply.id]: reply })),
    remove: (id) => setRemoved((list) => [...list, id]),
  }
}
