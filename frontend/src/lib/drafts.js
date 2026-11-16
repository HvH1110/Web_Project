// Unsent forum posts, kept in this tab's sessionStorage so text survives a
// session that ends mid-post (the form unmounts for the login invitation),
// a reload or a wrong turn. Each draft belongs to one member, so another
// member logging in on this tab never sees it, and logging out clears them all.

const PREFIX = 'forum-draft:'

// Storage can be missing or throw (private windows, blocked site data).
function store(storage) {
  try {
    return storage ?? globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

// `{ values, images }` saved by `userId` under `key`, or null.
export function readDraft(key, userId, storage) {
  try {
    const draft = JSON.parse(store(storage)?.getItem(PREFIX + key) ?? 'null')
    return draft?.userId === userId ? { values: draft.values, images: draft.images ?? [] } : null
  } catch {
    return null
  }
}

export function saveDraft(key, userId, { values, images }, storage) {
  try {
    store(storage)?.setItem(PREFIX + key, JSON.stringify({ userId, values, images }))
  } catch {
    // Full or blocked: the draft just isn't kept.
  }
}

export function clearDraft(key, storage) {
  try {
    store(storage)?.removeItem(PREFIX + key)
  } catch {
    // Nothing to clear.
  }
}

export function clearAllDrafts(storage) {
  try {
    const s = store(storage)
    if (!s) return
    const keys = Array.from({ length: s.length }, (_, i) => s.key(i))
    for (const key of keys) if (key?.startsWith(PREFIX)) s.removeItem(key)
  } catch {
    // Nothing to clear.
  }
}

// Whether the form differs from what it started with, so a draft is worth keeping.
export function isChanged(values, images, initialValues, initialImages) {
  const ids = (list) => list.map((image) => image.id).join(',')
  return (
    Object.keys(values).some((name) => values[name] !== initialValues[name]) ||
    ids(images) !== ids(initialImages)
  )
}
