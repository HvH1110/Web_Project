import { useId, useState } from 'react'
import BrandSelect from '@/components/community/BrandSelect'
import DraftNote from '@/components/community/DraftNote'
import ImagePicker from '@/components/community/ImagePicker'
import CtaButton from '@/components/CtaButton'
import FormField from '@/components/FormField'
import FormFooter from '@/components/FormFooter'
import { useForm } from '@/hooks/useForm'
import { useImageUploads } from '@/hooks/useImageUploads'
import { useKeepDraft, usePostDraft } from '@/hooks/usePostDraft'
import { fieldFromMessage } from '@/lib/forms'
import { POST_FIELDS, TITLE_MAX, TOPIC_BODY_MAX, checkTitle, checkTopicBody } from '@/lib/forum'

// Write or edit a topic. `onSubmit({ title, body, brand, images })` gets the
// brand slug or null and the image ids; `topic` fills the form when editing.
// What the member types is kept as a draft under `draftKey` until it is posted
// or cancelled, so a session ending mid-post loses nothing.
export default function TopicForm({ topic, draftKey, submitLabel, busyLabel, onSubmit, onCancel }) {
  const uid = useId()
  const draft = usePostDraft(
    draftKey,
    { title: topic?.title ?? '', body: topic?.body ?? '', brand: topic?.brand?.slug ?? '' },
    topic?.images,
  )
  const [showDraftNote, setShowDraftNote] = useState(draft.restored)
  const uploads = useImageUploads(draft.images)
  const form = useForm({
    initial: draft.values,
    rules: { title: checkTitle, body: checkTopicBody },
    onSubmit: async ({ title, body, brand }) => {
      await onSubmit({ title: title.trim(), body, brand: brand || null, images: uploads.images.map((i) => i.id) })
      draft.clear()
    },
    fieldFor: (error) => fieldFromMessage(error, POST_FIELDS),
  })
  useKeepDraft(draft, form.values, uploads.images)
  const brandLabel = `${uid}-brand-label`
  const brand = form.field('brand')

  const discard = () => {
    form.reset(draft.start.values)
    uploads.reset(draft.start.images)
    draft.clear()
    setShowDraftNote(false)
  }

  return (
    <form noValidate onSubmit={form.handleSubmit} className="grid gap-7">
      {showDraftNote && <DraftNote onDiscard={discard} />}
      <FormField
        id={`${uid}-title`}
        label="Title"
        description={`5 to ${TITLE_MAX} characters.`}
        maxLength={TITLE_MAX}
        autoFocus={Boolean(topic)}
        {...form.field('title')}
      />
      <div className="grid gap-2">
        <p id={brandLabel} className="text-[0.6875rem] leading-4 font-medium tracking-[0.2em] uppercase">
          House (optional)
        </p>
        <BrandSelect
          labelId={brandLabel}
          noneLabel="No particular house"
          value={brand.value}
          onChange={(value) => brand.onChange({ target: { value } })}
          className="w-full rounded-none px-4 text-base data-[size=default]:h-12 md:text-base"
        />
      </div>
      <FormField
        id={`${uid}-body`}
        label="Your topic"
        description="Plain text. Line breaks are kept."
        multiline
        rows={8}
        maxLength={TOPIC_BODY_MAX}
        {...form.field('body')}
      />
      <ImagePicker uploads={uploads} />
      <FormFooter error={form.formError}>
        <CtaButton type="submit" disabled={uploads.uploading > 0}>
          {form.submitting ? busyLabel : submitLabel}
        </CtaButton>
        {onCancel && (
          <CtaButton
            type="button"
            variant="outline"
            onClick={() => {
              draft.clear()
              onCancel()
            }}
          >
            Cancel
          </CtaButton>
        )}
      </FormFooter>
    </form>
  )
}
