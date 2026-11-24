import { useRef, useState } from 'react'
import { ActionButton, ActionDialog, BanControls } from '@/components/community/PostActions'
import { Avatar, Byline, HiddenNotice, PostBody, PostImages } from '@/components/community/PostParts'
import ReplyForm from '@/components/community/ReplyForm'
import { useAuth } from '@/hooks/useAuth'
import { useHasDraft } from '@/hooks/usePostDraft'
import { deleteForumReply, moderateForumReply, updateForumReply } from '@/lib/api'

// One reply, with the actions its `permissions` allow. `onChange(reply)` and
// `onDelete(id)` tell the page what happened.
export default function ReplyItem({ reply, onChange, onDelete }) {
  const { loginRequired } = useAuth()
  const draftKey = `reply:${reply.id}:edit`
  // An edit left unsaved (say, the session ended) reopens with its draft.
  const hasDraft = useHasDraft(draftKey)
  const [editing, setEditing] = useState(hasDraft && reply.permissions.edit)
  const editButton = useRef(null)
  const { permissions } = reply

  const closeEditor = () => {
    setEditing(false)
    requestAnimationFrame(() => editButton.current?.focus())
  }
  const moderate = async (fields) =>
    onChange((await loginRequired(() => moderateForumReply(reply.id, fields))).reply)

  return (
    // The monogram on the left and everything else lined up beside it, so names
    // and messages are told apart at a glance.
    <article className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-6">
      <Avatar author={reply.author} className="mt-0.5" />
      <div className="grid min-w-0 grid-cols-1 content-start gap-2.5">
        <Byline author={reply.author} iso={reply.createdAt} edited={reply.editedAt} />
        <HiddenNotice hidden={reply.hidden} of="reply" />

        {editing ? (
          <ReplyForm
            reply={reply}
            draftKey={draftKey}
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
            <PostBody text={reply.body} className="max-w-3xl text-[0.9375rem]" />
            <PostImages images={reply.images} author={reply.author} />
            {(permissions.edit || permissions.delete || permissions.moderate) && (
              // Quiet, small actions: the message comes first.
              <div className="flex flex-wrap items-center gap-x-5 text-muted-foreground [&_button]:h-7 [&_button]:text-[0.625rem] [&_button:hover]:text-foreground">
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
                      try {
                        await loginRequired(() => deleteForumReply(reply.id))
                      } catch (err) {
                        // Already deleted by its author or a moderator: same outcome.
                        if (err.status !== 404) throw err
                      }
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
      </div>
    </article>
  )
}
