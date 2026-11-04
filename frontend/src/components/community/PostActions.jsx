import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { moderateForumMember } from '@/lib/api'
import { describeError } from '@/lib/forms'
import { authorName, canBan } from '@/lib/forum'

const ACTION = 'eyebrow h-10 disabled:opacity-50'

// A small text button for a post: Edit, Pin, Lock…
export function ActionButton({ ref, children, ...props }) {
  return (
    <button ref={ref} type="button" className={ACTION} {...props}>
      <span className="link-underline">{children}</span>
    </button>
  )
}

// A button that opens a confirmation. `onConfirm(reason)` runs the action and
// the dialog closes when it succeeds; a failure stays in the dialog. With
// `reasonLabel` it asks for an optional reason, up to 200 characters.
export function ActionDialog({ label, title, description, confirmLabel, reasonLabel, destructive, onConfirm }) {
  const reasonId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const confirm = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason.trim() || undefined)
      setReason('')
      setOpen(false)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<button type="button" className={ACTION} />}>
        <span className="link-underline">{label}</span>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none p-6 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-md">
        <form onSubmit={confirm} className="grid gap-5">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="font-serif text-display-sm font-normal">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-sm leading-relaxed">{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {reasonLabel && (
            <div className="grid gap-2">
              <Label htmlFor={reasonId}>{reasonLabel}</Label>
              <Input
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                className="h-11 rounded-none px-3 text-base md:text-sm"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter className="-mx-6 -mb-6 rounded-none px-6">
            <AlertDialogCancel className="h-11 rounded-none px-5">Cancel</AlertDialogCancel>
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'default'}
              disabled={busy}
              className="h-11 rounded-none px-5"
            >
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Ban a post's author from posting, or lift a ban. The API doesn't say whether
// a member is banned until asked, so both are offered and the answer is shown.
export function BanControls({ author }) {
  const { user, loginRequired } = useAuth()
  const [status, setStatus] = useState('')
  if (!canBan(user, author)) return null

  const name = authorName(author)
  const moderate = async (fields) => {
    const { member } = await loginRequired(() => moderateForumMember(author.id, fields))
    setStatus(member.banned ? `${name} is banned from posting.` : `${name} can post again.`)
  }

  return (
    <>
      <ActionDialog
        label="Ban author"
        title={`Ban ${name}?`}
        description="They can still read the forum and delete their own posts, but can’t post, reply, upload or edit until the ban is lifted."
        reasonLabel="Reason (optional)"
        confirmLabel="Ban from posting"
        destructive
        onConfirm={(reason) => moderate({ banned: true, reason })}
      />
      <ActionDialog
        label="Lift ban"
        title={`Lift the ban on ${name}?`}
        description="If they are banned, they will be able to post again."
        confirmLabel="Lift ban"
        onConfirm={() => moderate({ banned: false })}
      />
      <span role="status" className="text-sm">
        {status}
      </span>
    </>
  )
}
