import { useRef, useState } from 'react'
import { ActionButton, ActionDialog, BanControls } from '@/components/community/PostActions'
import { Author, HiddenNotice, PostBody, PostImages, PostTime } from '@/components/community/PostParts'
import ReplyForm from '@/components/community/ReplyForm'
import { useAuth } from '@/hooks/useAuth'
import { deleteForumReply, moderateForumReply, updateForumReply } from '@/lib/api'

// One reply, with the actions its `permissions` allow. `onChange(reply)` and
// `onDelete(id)` tell the page what happened.
export default function ReplyItem({ reply, onChange, onDelete }) {
  const { loginRequired } = useAuth()
  const [editing, setEditing] = useState(false)
  const editButton = useRef(null)
  const { permissions } = reply

  const closeEditor = () => {
    setEditing(false)
    requestAnimationFrame(() => editButton.current?.focus())
  }
  const moderate = async (fields) =>
    onChange((await loginRequired(() => moderateForumReply(reply.id, fields))).reply)

  return (
    <article className="grid grid-cols-1 gap-4 py-8">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Author author={reply.author} />
        <PostTime iso={reply.createdAt} />
        {reply.editedAt && <span>Edited</span>}
      </p>
      <HiddenNotice hidden={reply.hidden} of="reply" />

      {editing ? (
        <ReplyForm
          reply={reply}
          submitLabel="Save reply"
          busyLabel="Saving…"
          onCancel={closeEditor}
          onSubmit={async (fields) => {
            onChange((await loginRequired(() => updateForumReply(reply.id, fields))).reply)
            closeEditor()
          }}
        />
      ) : (
        <>
          <PostBody text={reply.body} className="max-w-3xl text-sm" />
          <PostImages images={reply.images} author={reply.author} />
          {(permissions.edit || permissions.delete || permissions.moderate) && (
            <div className="flex flex-wrap items-center gap-x-6">
              {permissions.edit && (
                <ActionButton ref={editButton} onClick={() => setEditing(true)}>
                  Edit
                </ActionButton>
              )}
              {permissions.delete && (
                <ActionDialog
                  label="Delete"
                  title="Delete this reply?"
                  description="The reply and its images are removed for good."
                  confirmLabel="Delete reply"
                  destructive
                  onConfirm={async () => {
                    await loginRequired(() => deleteForumReply(reply.id))
                    onDelete(reply.id)
                  }}
                />
              )}
              {permissions.moderate &&
                (reply.hidden ? (
                  <ActionDialog
                    label="Unhide"
                    title="Unhide this reply?"
                    description="Every member will be able to see it again."
                    confirmLabel="Unhide reply"
                    onConfirm={() => moderate({ hidden: false })}
                  />
                ) : (
                  <ActionDialog
                    label="Hide"
                    title="Hide this reply?"
                    description="Only moderators and its author will see it. The reason is shown to the author."
                    reasonLabel="Reason (optional)"
                    confirmLabel="Hide reply"
                    onConfirm={(reason) => moderate({ hidden: true, reason })}
                  />
                ))}
              {permissions.moderate && <BanControls author={reply.author} />}
            </div>
          )}
        </>
      )}
    </article>
  )
}
