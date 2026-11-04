// Layout of the log in and register pages: the heading and a few lines on
// the left, the form on the right (stacked on small screens).
export default function AccountShell({ title, intro, children }) {
  return (
    <section className="page-container grid gap-12 pt-12 pb-section sm:pt-16 lg:grid-cols-12 lg:gap-8">
      <div className="grid content-start gap-6 lg:col-span-5">
        <p className="eyebrow text-muted-foreground">Account</p>
        <h1 className="font-serif text-display-lg">{title}</h1>
        <div className="grid max-w-md gap-4 text-sm leading-relaxed text-muted-foreground">{intro}</div>
      </div>
      <div className="lg:col-span-5 lg:col-start-8 lg:pt-16">{children}</div>
    </section>
  )
}
