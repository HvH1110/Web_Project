import { Link, useNavigate } from 'react-router'
import RequireMember from '@/components/community/RequireMember'
import TopicForm from '@/components/community/TopicForm'
import { SITE } from '@/content/site'
import { useAuth } from '@/hooks/useAuth'
import { createForumTopic } from '@/lib/api'
import { topicPath } from '@/lib/forum'

// /community/new: POST /api/forum/topics, then on to the new topic.
export default function NewTopicPage() {
  return (
    <RequireMember>
      <NewTopic />
    </RequireMember>
  )
}

function NewTopic() {
  const { loginRequired } = useAuth()
  const navigate = useNavigate()

  return (
    <section className="page-container grid gap-12 pt-12 pb-section sm:pt-16 lg:grid-cols-12 lg:gap-8">
      <title>{`New topic · ${SITE.name}`}</title>
      <div className="grid content-start gap-6 lg:col-span-5">
        <p className="eyebrow text-muted-foreground">
          <Link to="/community" className="link-underline">
            Community
          </Link>
        </p>
        <h1 className="font-serif text-display-lg">New topic</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Ask a question or share what you found. Keep it about the pieces and the markets, and leave
          out personal details. Moderators can hide posts that break this.
        </p>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        <TopicForm
          submitLabel="Post topic"
          busyLabel="Posting…"
          onSubmit={async ({ brand, ...fields }) => {
            // On create, no brand is left out rather than sent as null.
            const body = brand ? { ...fields, brand } : fields
            const { topic } = await loginRequired(() => createForumTopic(body))
            navigate(topicPath(topic.id))
          }}
        />
      </div>
    </section>
  )
}
