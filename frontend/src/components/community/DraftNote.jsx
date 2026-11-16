// Above a post form that was filled from a draft (hooks/usePostDraft.js), so
// text the member didn't post isn't a surprise, with a way to drop it.
export default function DraftNote({ onDiscard }) {
  return (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-1 border-l-2 border-border py-1 pl-4 text-sm text-muted-foreground">
      <span>We kept what you hadn’t posted yet.</span>
      <button type="button" onClick={onDiscard} className="eyebrow link-underline text-foreground">
        Discard draft
      </button>
    </p>
  )
}
