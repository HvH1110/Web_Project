import { useId } from 'react'
import BrandSelect from '@/components/community/BrandSelect'
import ImagePicker from '@/components/community/ImagePicker'
import CtaButton from '@/components/CtaButton'
import FormField from '@/components/FormField'
import FormFooter from '@/components/FormFooter'
import { useForm } from '@/hooks/useForm'
import { useImageUploads } from '@/hooks/useImageUploads'
import { fieldFromMessage } from '@/lib/forms'
import { POST_FIELDS, TITLE_MAX, TOPIC_BODY_MAX, checkTitle, checkTopicBody } from '@/lib/forum'

// Write or edit a topic. `onSubmit({ title, body, brand, images })` gets the
// brand slug or null and the image ids; `topic` fills the form when editing.
export default function TopicForm({ topic, submitLabel, busyLabel, onSubmit, onCancel }) {
  const uid = useId()
  const uploads = useImageUploads(topic?.images)
  const form = useForm({
    initial: { title: topic?.title ?? '', body: topic?.body ?? '', brand: topic?.brand?.slug ?? '' },
    rules: { title: checkTitle, body: checkTopicBody },
    onSubmit: ({ title, body, brand }) =>
      onSubmit({ title: title.trim(), body, brand: brand || null, images: uploads.images.map((i) => i.id) }),
    fieldFor: (error) => fieldFromMessage(error, POST_FIELDS),
  })
  const brandLabel = `${uid}-brand-label`
  const brand = form.field('brand')

  return (
    <form noValidate onSubmit={form.handleSubmit} className="grid gap-7">
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
          <CtaButton type="button" variant="outline" onClick={onCancel}>
            Cancel
          </CtaButton>
        )}
      </FormFooter>
    </form>
  )
}
