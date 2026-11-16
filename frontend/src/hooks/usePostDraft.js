import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { clearDraft, isChanged, readDraft, saveDraft } from '@/lib/drafts'

// Keeps a post form's text and images as a draft (lib/drafts.js) under `key`.
// Returns the values and images to start the form with (the draft's, when
// there is one), `restored`, and `clear()` for after posting or cancelling.
// Call `useKeepDraft(draft, values, images)` in the form to save as it changes.
export function usePostDraft(key, initialValues, initialImages = []) {
  const { user } = useAuth()
  const userId = user?.id
  // The form's own starting point, without the draft, to tell when it changed.
  const [start] = useState(() => ({ values: initialValues, images: initialImages }))
  const [restored] = useState(() => (key && userId ? readDraft(key, userId) : null))

  const save = useCallback(
    (values, images) => {
      if (!key || !userId) return
      if (isChanged(values, images, start.values, start.images)) saveDraft(key, userId, { values, images })
      else clearDraft(key)
    },
    [key, userId, start],
  )
  const clear = useCallback(() => key && clearDraft(key), [key])

  return {
    values: restored ? { ...start.values, ...restored.values } : start.values,
    images: restored ? restored.images : start.images,
    start,
    restored: Boolean(restored),
    save,
    clear,
  }
}

export function useKeepDraft(draft, values, images) {
  const { save } = draft
  useEffect(() => save(values, images), [save, values, images])
}

// Whether `key` has a draft for the logged-in member, e.g. to reopen an editor.
export function useHasDraft(key) {
  const { user } = useAuth()
  return Boolean(user && readDraft(key, user.id))
}
