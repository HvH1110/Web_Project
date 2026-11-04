import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePaged } from '@/hooks/usePaged'
import { getForumReplies } from '@/lib/api'

// A topic's replies (usePaged), kept in step with what this member does on
// the page: `add`, `replace` and `remove` take the API's answer, so nothing
// reloads. New replies stay at the end until a later page brings them in.
export function useReplies(topicId) {
  const { loginRequired } = useAuth()
  const paged = usePaged(`replies/${topicId}`, (page, signal) =>
    loginRequired(() => getForumReplies(topicId, { page, limit: 50 }, { signal })),
  )
  const [added, setAdded] = useState([])
  const [changed, setChanged] = useState({})
  const [removed, setRemoved] = useState([])

  const loaded = new Set(paged.items.map((reply) => reply.id))
  const fresh = added.filter((reply) => !loaded.has(reply.id))
  const items = [...paged.items, ...fresh]
    .filter((reply) => !removed.includes(reply.id))
    .map((reply) => changed[reply.id] ?? reply)

  return {
    ...paged,
    items,
    total: paged.total + fresh.length - removed.length,
    add: (reply) => setAdded((list) => [...list, reply]),
    replace: (reply) => setChanged((map) => ({ ...map, [reply.id]: reply })),
    remove: (id) => setRemoved((list) => [...list, id]),
  }
}
