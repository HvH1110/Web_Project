// The end of an account form: the request error, if any, then the submit
// button with a polite live region beside it for success notices. The
// region is always rendered so screen readers announce text that appears.
export default function FormFooter({ error, notice, children }) {
  return (
    <div className="grid gap-5">
      {error && (
        <p role="alert" className="border-l-2 border-destructive py-1 pl-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {children}
        <p role="status" className="text-sm">
          {notice}
        </p>
      </div>
    </div>
  )
}
