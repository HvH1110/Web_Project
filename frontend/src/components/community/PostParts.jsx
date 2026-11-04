import { ArrowUpRight, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { authorName, roleLabel } from '@/lib/forum'
import { cn } from '@/lib/utils'

// A small square label: Moderator, Pinned, Locked…
export function Tag({ children }) {
  return (
    <Badge variant="outline" className="eyebrow rounded-none text-[0.625rem] tracking-[0.16em]">
      {children}
    </Badge>
  )
}

// A topic's state: pinned, locked, hidden.
export function TopicTags({ topic }) {
  if (!topic.pinned && !topic.locked && !topic.hidden) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {topic.pinned && <Tag>Pinned</Tag>}
      {topic.locked && <Tag>Locked</Tag>}
      {topic.hidden && <Tag>Hidden</Tag>}
    </span>
  )
}

export function Author({ author }) {
  const role = author && roleLabel(author.role)
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={cn('[overflow-wrap:anywhere]', author && 'text-foreground')}>{authorName(author)}</span>
      {role && <Tag>{role}</Tag>}
    </span>
  )
}

export function PostTime({ iso }) {
  return (
    <time dateTime={iso} className="tabular-nums">
      {formatDateTime(iso)}
    </time>
  )
}

// A post's text. It is plain text from members: rendered as text, keeping the
// newlines, and long words or links wrap instead of widening the page.
export function PostBody({ text, className }) {
  if (!text) return null
  return <p className={cn('leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]', className)}>{text}</p>
}

// Shown to the author and moderators on a post others no longer see.
export function HiddenNotice({ hidden, of }) {
  if (!hidden) return null
  return (
    <p className="flex items-start gap-2.5 border-l-2 border-destructive py-1 pl-4 text-sm">
      <EyeOff className="mt-0.5 size-4 shrink-0" strokeWidth={1.25} aria-hidden="true" />
      <span>
        This {of} was hidden by a moderator on <PostTime iso={hidden.at} />, so only moderators and its author can see
        it.
        {hidden.reason && ` Reason: ${hidden.reason}`}
      </span>
    </p>
  )
}

// A post's images in a row, each at its own shape, opening full size. Width
// and height are known, so nothing moves when they load.
export function PostImages({ images, author }) {
  if (!images.length) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {images.map((image, i) => (
        <li key={image.id} className="max-w-full">
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block h-48 max-w-full overflow-hidden bg-secondary sm:h-64"
            style={{ aspectRatio: `${image.width} / ${image.height}` }}
          >
            <img
              src={image.url}
              alt={`Image ${i + 1} of ${images.length} from ${authorName(author)}`}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
            <span className="absolute right-2 bottom-2 grid size-7 place-items-center bg-background/90 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Opens full size in a new tab</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
