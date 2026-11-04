import { useId } from 'react'
import ImagePicker from '@/components/community/ImagePicker'
import CtaButton from '@/components/CtaButton'
import FormField from '@/components/FormField'
import FormFooter from '@/components/FormFooter'
import { useForm } from '@/hooks/useForm'
import { useImageUploads } from '@/hooks/useImageUploads'
import { fieldFromMessage } from '@/lib/forms'
import { POST_FIELDS, REPLY_BODY_MAX, checkReplyBody } from '@/lib/forum'

// Write or edit a reply. `onSubmit({ body, images })` gets the image ids and
// may return a notice; `reply` fills the form when editing. A new reply's form
// empties once it is posted.
export default function ReplyForm({ reply, submitLabel, busyLabel, onSubmit, onCancel }) {
  const uid = useId()
  const uploads = useImageUploads(reply?.images)
  const form = useForm({
    initial: { body: reply?.body ?? '' },
    rules: { body: checkReplyBody(uploads.images.length) },
    onSubmit: async ({ body }, { reset }) => {
      const notice = await onSubmit({ body, images: uploads.images.map((i) => i.id) })
      if (!reply) {
        reset({ body: '' })
        uploads.reset()
      }
      return notice
    },
    fieldFor: (error) => fieldFromMessage(error, POST_FIELDS),
  })

  return (
    <form noValidate onSubmit={form.handleSubmit} className="grid gap-6">
      <FormField
        id={`${uid}-body`}
        label={reply ? 'Your reply' : 'Reply'}
        description="Plain text. Line breaks are kept."
        multiline
        rows={5}
        maxLength={REPLY_BODY_MAX}
        autoFocus={Boolean(reply)}
        {...form.field('body')}
      />
      <ImagePicker uploads={uploads} />
      <FormFooter error={form.formError} notice={form.notice}>
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
