import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// The house call-to-action: a tall, square shadcn Button with a small-caps
// label. Takes every Button prop, e.g. variant="outline" or
// render={<Link to="/search" />} nativeButton={false}.
export default function CtaButton({ className, ...props }) {
  return (
    <Button
      className={cn(
        'h-12 gap-3 px-8 text-[0.6875rem] font-medium tracking-[0.2em] uppercase transition-colors duration-300',
        className,
      )}
      {...props}
    />
  )
}
