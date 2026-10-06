import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFoundPage() {
  return (
    <Card className="mc-panel mx-auto max-w-lg">
      <CardContent className="grid justify-items-center gap-5 text-center">
        <div className="mc-crt grid w-full justify-items-center gap-3 rounded-lg py-10">
          <p className="mc-plate">Loss of signal</p>
          <h1 className="mc-glow font-crt text-8xl leading-none" data-tone="hold">
            404
          </h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            No page at this address. Houston has no telemetry for it.
          </p>
        </div>
        <Button render={<Link to="/" />} nativeButton={false}>
          Return to home
        </Button>
      </CardContent>
    </Card>
  )
}
