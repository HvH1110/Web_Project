import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { uploadForumImage } from '@/lib/api'
import { describeError } from '@/lib/forms'
import { MAX_IMAGES, MAX_IMAGE_BYTES } from '@/lib/forum'

// The images of a post being written: `initial` (when editing) plus uploads,
// in display order. Files upload one at a time so they keep the order chosen.
// Removing an image only drops it from the post; the backend deletes unused
// uploads after 24 hours, and removed images when an edit is saved.
export function useImageUploads(initial = []) {
  const { loginRequired } = useAuth()
  const [images, setImages] = useState(initial)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState(null)

  async function add(fileList) {
    const files = [...fileList]
    const room = MAX_IMAGES - images.length
    const problems = files.length > room ? [`A post can have at most ${MAX_IMAGES} images.`] : []
    const queue = files.slice(0, Math.max(room, 0)).filter((file) => {
      if (file.size <= MAX_IMAGE_BYTES) return true
      problems.push(`${file.name} is larger than 10 MB.`)
      return false
    })

    setError(problems.join(' ') || null)
    setUploading(queue.length)
    for (const file of queue) {
      try {
        const { upload } = await loginRequired(() => uploadForumImage(file))
        setImages((list) => [...list, upload])
      } catch (err) {
        problems.push(`${file.name}: ${describeError(err)}`)
        setError(problems.join(' '))
      }
      setUploading((n) => n - 1)
    }
  }

  return {
    images,
    uploading,
    error,
    add,
    remove: (id) => setImages((list) => list.filter((image) => image.id !== id)),
    reset: () => {
      setImages([])
      setError(null)
    },
  }
}
