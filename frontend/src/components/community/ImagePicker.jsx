import { useId, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import CtaButton from '@/components/CtaButton'
import { IMAGE_TYPES, MAX_IMAGES } from '@/lib/forum'

// Images for a post: previews with a remove button and an "add" button.
// `uploads` comes from useImageUploads.
export default function ImagePicker({ uploads }) {
  const { images, uploading, error } = uploads
  const input = useRef(null)
  const hintId = useId()
  const full = images.length >= MAX_IMAGES

  return (
    <div className="grid gap-3">
      <p className="text-[0.6875rem] leading-4 font-medium tracking-[0.2em] uppercase">Images (optional)</p>

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((image, i) => (
            <li key={image.id} className="relative size-24 bg-secondary sm:size-28">
              <img src={image.url} alt={`Image ${i + 1} of ${images.length}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => uploads.remove(image.id)}
                className="absolute top-0 right-0 grid size-8 place-items-center bg-background/90 hover:bg-background"
              >
                <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                <span className="sr-only">Remove image {i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES}
          multiple
          hidden
          aria-label="Choose images"
          onChange={(e) => {
            uploads.add(e.target.files)
            // So choosing the same file again still counts as a change.
            e.target.value = ''
          }}
        />
        <CtaButton
          type="button"
          variant="outline"
          disabled={full || uploading > 0}
          aria-describedby={hintId}
          onClick={() => input.current?.click()}
          className="h-11 px-5"
        >
          <ImagePlus className="size-4" strokeWidth={1.25} aria-hidden="true" />
          Add images
        </CtaButton>
        <p role="status" className="text-sm">
          {uploading > 0 && `Uploading ${uploading} ${uploading === 1 ? 'image' : 'images'}…`}
        </p>
      </div>
      <p id={hintId} className="text-sm leading-normal text-muted-foreground">
        Up to {MAX_IMAGES}: JPEG, PNG, WebP, GIF or AVIF, at most 10 MB each. Anyone with an image’s link can open it.
        Camera and location data is removed.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
