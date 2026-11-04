import { Link } from 'react-router'
import { Author, PostTime, TopicTags } from '@/components/community/PostParts'
import { topicPath } from '@/lib/forum'

// A topic in the list (TopicSummary): what it's about and who started it, how
// lively it is, and its first image.
export default function TopicRow({ topic }) {
  const { brand, thumbnail, replyCount, imageCount } = topic
  return (
    <article className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 py-7">
      <div className="grid min-w-0 content-start gap-2">
        {(brand || topic.pinned || topic.locked || topic.hidden) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {brand && <p className="eyebrow text-muted-foreground">{brand.name}</p>}
            <TopicTags topic={topic} />
          </div>
        )}
        <h3 className="font-serif text-display-sm [overflow-wrap:anywhere]">
          <Link to={topicPath(topic.id)} className="link-underline">
            {topic.title}
          </Link>
        </h3>
        {topic.excerpt && (
          <p className="line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {topic.excerpt}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Author author={topic.author} />
          <span>
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
          {imageCount > 0 && (
            <span>
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
            </span>
          )}
          <span>
            Active <PostTime iso={topic.lastActivityAt} />
          </span>
        </p>
      </div>
      {thumbnail && (
        <img
          src={thumbnail.url}
          alt=""
          loading="lazy"
          decoding="async"
          width={thumbnail.width}
          height={thumbnail.height}
          className="size-18 bg-secondary object-cover sm:size-24"
        />
      )}
    </article>
  )
}
