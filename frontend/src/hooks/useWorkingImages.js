import { useState } from 'react'

// `images` without the ones that failed to load, and the callback that marks
// one as failed. Archive-only products keep image URLs from old pages, and
// some of those no longer load (see ../docs/DATA.md).
export function useWorkingImages(images) {
  const [failed, setFailed] = useState([])
  return [images.filter((image) => !failed.includes(image.url)), (image) => setFailed((f) => [...f, image.url])]
}
