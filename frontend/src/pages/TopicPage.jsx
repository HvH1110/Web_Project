import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionButton, ActionDialog, BanControls } from '@/components/community/PostActions'
import { Author, HiddenNotice, PostBody, PostImages, PostTime, TopicTags } from '@/components/community/PostParts'
import ReplyForm from '@/components/community/ReplyForm'
import ReplyItem from '@/components/community/ReplyItem'
import RequireMember from '@/components/community/RequireMember'
import TopicForm from '@/components/community/TopicForm'
import CtaButton from '@/components/CtaButton'
import LoadError from '@/components/LoadError'
import PageMeta from '@/components/PageMeta'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { usePoll } from '@/hooks/usePoll'
import { useHasDraft } from '@/hooks/usePostDraft'
import { useReplies } from '@/hooks/useReplies'
import { createForumReply, deleteForumTopic, getForumTopic, moderateForumTopic, updateForumTopic } from '@/lib/api'
import { readDraft } from '@/lib/drafts'
import { describeError } from '@/lib/forms'
import { topicMoved } from '@/lib/forum'

const FORUM_ERROR = 'We couldn’t load this topic.'
// How often an open topic asks for what other members did.
const POLL_MS = 30_000

// /community/:id: a topic and its replies, with the forms and controls the
// topic's `permissions` allow. Remounted per topic so no state leaks across.
export default function TopicPage() {
  const { id } = useParams()
  return (
    <RequireMember>
      <Topic key={id} id={id} />
    </RequireMember>
  )
}

function Topic({ id }) {
  const { loginRequired } = useAuth()
  const navigate = useNavigate()
  const result = useApi(id, (signal) => loginRequired(() => getForumTopic(id, { signal })))
  // The API's latest answer after an edit, moderation or check; replaces the load.
  const [updated, setUpdated] = useState(null)
  // Deleted, or hidden from this member, since the page loaded.
  const [gone, setGone] = useState(false)
  const editDraft = `topic:${id}:edit`
  // An edit left unsaved (say, the session ended) reopens with its draft.
  const hasEditDraft = useHasDraft(editDraft)
  const [editing, setEditing] = useState(hasEditDraft)
  const replies = useReplies(id)
  const repliesHeading = useRef(null)
  const editButton = useRef(null)
  // Bumped by every change made here, so a check that started before one
  // can't put back the older copy.
  const changes = useRef(0)
  const change = (topic) => {
    changes.current += 1
    setUpdated(topic)
  }

  // Other members' replies, edits, deletion and moderation, without a reload.
  usePoll(
    async () => {
      const before = updated ?? result.data.topic
      const version = changes.current
      try {
        const { topic: latest } = await loginRequired(() => getForumTopic(id))
        if (version !== changes.current) return
        setUpdated(latest)
        if (topicMoved(before, latest)) await replies.checkNew()
      } catch (err) {
        if (err.status === 404) setGone(true)
        // Anything else: try again at the next check.
      }
    },
    POLL_MS,
    Boolean(result.data) && !gone,
  )

  if (result.error?.status === 404) return <TopicGone />
  if (result.error) {
    return (
      <div className="page-container py-section">
        <LoadError error={result.error} onRetry={result.retry} message={FORUM_ERROR} />
      </div>
    )
  }
  if (result.loading) return <TopicSkeleton />

  const topic = updated ?? result.data.topic
  const { permissions } = topic
  const moderate = async (fields) => change((await loginRequired(() => moderateForumTopic(id, fields))).topic)
  const closeEditor = () => {
    setEditing(false)
    requestAnimationFrame(() => editButton.current?.focus())
  }

  return (
    <div className="page-container pt-10 pb-section sm:pt-14">
      <PageMeta title={topic.title} noindex />

      <nav aria-label="Breadcrumb">
        <ol className="eyebrow flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
          <li>
            <Link to="/community" className="link-underline">
              Community
            </Link>
          </li>
          {topic.brand && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={`/community?brand=${topic.brand.slug}`} className="link-underline">
                  {topic.brand.name}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      {gone && (
        <div role="alert" className="mt-8 grid justify-items-start gap-3 border-l-2 border-destructive py-1 pl-4 text-sm">
          <p>
            This topic was deleted, or hidden by a moderator, while you were reading. Below is the copy you
            had open; replies are closed.
          </p>
          <Link to="/community" className="eyebrow link-underline">
            Back to the forum
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 pt-8 lg:grid-cols-12 lg:gap-8">
        <div className="grid min-w-0 grid-cols-1 content-start gap-12 lg:col-span-8">
          {editing && permissions.edit && !gone ? (
            <section aria-label="Edit topic">
              <h1 className="sr-only">Edit topic</h1>
              <TopicForm
                topic={topic}
                draftKey={editDraft}
                submitLabel="Save topic"
                busyLabel="Saving…"
                onCancel={closeEditor}
                onSubmit={async (fields) => {
                  change((await loginRequired(() => updateForumTopic(id, fields))).topic)
                  closeEditor()
                }}
              />
            </section>
          ) : (
            <article className="grid grid-cols-1 gap-6">
              <div className="grid gap-4">
                <TopicTags topic={topic} />
                <h1 className="font-serif text-display-lg text-balance [overflow-wrap:anywhere]">{topic.title}</h1>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <Author author={topic.author} />
                  <PostTime iso={topic.createdAt} />
                  {topic.editedAt && <span>Edited</span>}
                </p>
              </div>
              <HiddenNotice hidden={topic.hidden} of="topic" />
              <PostBody text={topic.body} className="max-w-3xl" />
              <PostImages images={topic.images} author={topic.author} />
              {!gone && (permissions.edit || permissions.delete) && (
                <div className="flex flex-wrap items-center gap-x-6">
                  {permissions.edit && (
                    <ActionButton ref={editButton} onClick={() => setEditing(true)}>
                      Edit
                    </ActionButton>
                  )}
                  {permissions.delete && (
                    <ActionDialog
                      label="Delete"
                      title="Delete this topic?"
                      description="The topic, all its replies and all their images are removed for good."
                      confirmLabel="Delete topic"
                      destructive
                      onConfirm={async () => {
                        try {
                          await loginRequired(() => deleteForumTopic(id))
                        } catch (err) {
                          // Already deleted (by a moderator, or in another tab).
                          if (err.status !== 404) throw err
                        }
                        navigate('/community', { replace: true })
                      }}
                    />
                  )}
                </div>
              )}
            </article>
          )}

          <section aria-labelledby="replies-title" className="grid grid-cols-1 gap-8">
            <h2 id="replies-title" ref={repliesHeading} tabIndex={-1} className="font-serif text-display-sm outline-none">
              {replies.loading ? 'Replies' : `${replies.total} ${replies.total === 1 ? 'reply' : 'replies'}`}
            </h2>
            <RepliesList
              replies={replies}
              onShowWaiting={replies.showWaiting}
              onDeleted={(replyId) => {
                replies.remove(replyId)
                // The deleted reply's button had focus, so move it somewhere useful.
                requestAnimationFrame(() => repliesHeading.current?.focus())
              }}
            />
            <ReplyArea
              topic={topic}
              gone={gone}
              onSubmit={async (fields) => {
                replies.add((await loginRequired(() => createForumReply(id, fields))).reply)
                return 'Reply posted.'
              }}
            />
          </section>
        </div>

        {!gone && permissions.moderate && <ModerationPanel topic={topic} moderate={moderate} />}
      </div>
    </div>
  )
}

// Pin, lock, hide and ban, for moderators. Pin and lock take effect at once.
function ModerationPanel({ topic, moderate }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async (fields) => {
    setBusy(true)
    setError(null)
    try {
      await moderate(fields)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside
      aria-label="Moderation"
      className="grid content-start gap-2 border-t pt-5 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)] lg:col-span-3 lg:col-start-10 lg:self-start"
    >
      <p className="eyebrow text-muted-foreground">Moderation</p>
      <div className="flex flex-wrap items-center gap-x-6 lg:grid lg:justify-items-start">
        <ActionButton disabled={busy} onClick={() => toggle({ pinned: !topic.pinned })}>
          {topic.pinned ? 'Unpin' : 'Pin'}
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => toggle({ locked: !topic.locked })}>
          {topic.locked ? 'Unlock' : 'Lock'}
        </ActionButton>
        {topic.hidden ? (
          <ActionDialog
            label="Unhide"
            title="Unhide this topic?"
            description="Every member will be able to see it again."
            confirmLabel="Unhide topic"
            onConfirm={() => moderate({ hidden: false })}
          />
        ) : (
          <ActionDialog
            label="Hide"
            title="Hide this topic?"
            description="Only moderators and its author will see it. The reason is shown to the author."
            reasonLabel="Reason (optional)"
            confirmLabel="Hide topic"
            onConfirm={(reason) => moderate({ hidden: true, reason })}
          />
        )}
        <BanControls author={topic.author} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </aside>
  )
}

function RepliesList({ replies, onDeleted, onShowWaiting }) {
  if (replies.error) {
    return <LoadError error={replies.error} onRetry={replies.retry} message="We couldn’t load the replies." />
  }
  if (replies.loading) {
    return (
      <div aria-busy="true" aria-label="Loading replies" className="grid gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }
  const count = replies.waiting.length
  // Always rendered, so screen readers hear when new replies arrive.
  const waiting = (
    <div aria-live="polite">
      {count > 0 && (
        <CtaButton variant="outline" onClick={onShowWaiting} className="w-full sm:w-auto">
          Show {count} new {count === 1 ? 'reply' : 'replies'}
        </CtaButton>
      )}
    </div>
  )
  if (!replies.items.length) {
    return (
      <div className="grid gap-6">
        {!count && <p className="text-sm text-muted-foreground">No replies yet.</p>}
        {waiting}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      <ul className="grid grid-cols-1 border-b">
        {replies.items.map((reply) => (
          <li key={reply.id} className="border-t">
            <ReplyItem reply={reply} onChange={replies.replace} onDelete={onDeleted} />
          </li>
        ))}
      </ul>
      {replies.hasMore && (
        <CtaButton
          variant="outline"
          onClick={replies.loadMore}
          disabled={replies.loadingMore}
          className="justify-self-center"
        >
          {replies.loadingMore ? 'Loading' : 'Load more replies'}
        </CtaButton>
      )}
      {replies.loadMoreError && (
        <p role="alert" className="text-center text-sm text-destructive">
          Couldn’t load more. Please try again.
        </p>
      )}
      {waiting}
    </div>
  )
}

// The reply form, or why there isn't one. Permissions leave out the reason, so
// it is worked out: gone, locked, hidden, otherwise the member must be banned.
function ReplyArea({ topic, gone, onSubmit }) {
  const draftKey = `topic:${topic.id}:reply`
  if (topic.permissions.reply && !gone) {
    return (
      <div className="grid gap-4">
        {(topic.locked || topic.hidden) && (
          <p className="text-sm text-muted-foreground">
            This topic is {topic.locked ? 'locked' : 'hidden'}. You can still reply as a moderator.
          </p>
        )}
        <ReplyForm draftKey={draftKey} submitLabel="Post reply" busyLabel="Posting…" onSubmit={onSubmit} />
      </div>
    )
  }
  return (
    <div className="grid gap-4 border-y py-4">
      <p className="text-sm text-muted-foreground">
        {gone
          ? 'Replies are closed.'
          : topic.locked
            ? 'This topic is locked, so replies are closed.'
            : topic.hidden
              ? 'This topic was hidden by a moderator, so replies are closed.'
              : 'Your account is banned from posting, so you can’t reply.'}
      </p>
      <UnsentReply draftKey={draftKey} />
    </div>
  )
}

// A reply the member was writing when replies closed, so it can be copied.
function UnsentReply({ draftKey }) {
  const { user } = useAuth()
  const text = readDraft(draftKey, user.id)?.values.body?.trim()
  if (!text) return null
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">Your unsent reply, to copy:</span>
      <textarea
        readOnly
        value={text}
        rows={4}
        className="w-full resize-y border bg-secondary px-3 py-2 leading-relaxed"
      />
    </label>
  )
}

function TopicGone() {
  return (
    <section className="page-container grid justify-items-center gap-6 py-section text-center">
      <PageMeta title="Topic not found" noindex />
      <p className="eyebrow text-muted-foreground">Error 404</p>
      <h1 className="max-w-3xl font-serif text-display-lg text-balance">This topic isn’t here.</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        It may have been deleted or hidden by a moderator, or the address may be mistyped.
      </p>
      <CtaButton render={<Link to="/community" />} nativeButton={false} className="mt-4">
        Back to the forum
      </CtaButton>
    </section>
  )
}

function TopicSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading topic" className="page-container grid min-h-svh content-start gap-5 pt-24 pb-section">
      <Skeleton className="h-14 max-w-2xl" />
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-40 max-w-3xl" />
    </div>
  )
}
