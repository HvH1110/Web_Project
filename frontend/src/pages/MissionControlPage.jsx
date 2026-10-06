import { Link } from 'react-router'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Emblem from '@/components/mission-control/Emblem'
import FlightLog from '@/components/mission-control/FlightLog'
import LatencyChart from '@/components/mission-control/LatencyChart'
import LaunchScene from '@/components/mission-control/LaunchScene'
import PollBoard from '@/components/mission-control/PollBoard'
import StatTiles from '@/components/mission-control/StatTiles'
import StatusLamp from '@/components/mission-control/StatusLamp'
import { useHealthTelemetry } from '@/hooks/useHealthTelemetry'
import { formatClock } from '@/lib/format'

const OVERALL_LAMP = {
  acquiring: { state: 'nodata', label: 'ACQUIRING' },
  go: { state: 'go', label: 'ALL STATIONS GO' },
  hold: { state: 'nogo', label: 'HOLD' },
}

// Backend health as an Apollo 11 launch: the Saturn V flies its ascent while
// every station is GO and holds on the pad when one isn't. Full screen, outside
// the App layout.
export default function MissionControlPage() {
  const telemetry = useHealthTelemetry()
  const { overall, lastSample, inFlight, pollNow } = telemetry

  return (
    <div className="min-h-svh text-foreground">
      <header className="border-b border-(--phosphor)/20 bg-[#050b16]/70 shadow-[0_1px_24px_rgb(255_255_255/0.08)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4">
          <Button variant="ghost" size="sm" render={<Link to="/" />} nativeButton={false}>
            <ArrowLeft data-icon="inline-start" />
            App
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Emblem />
            <div className="min-w-0">
              <p className="mc-plate truncate">Mission Operations Control Room · Houston</p>
              <h1 className="mc-glow font-crt text-3xl leading-none tracking-wider sm:text-4xl">
                APOLLO 11 MISSION CONTROL
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div aria-live="polite">
              <StatusLamp size="lg" {...OVERALL_LAMP[overall]} />
            </div>
            <div className="mc-crt rounded-md px-2.5 py-1 leading-none">
              <p className="font-mono text-[10px] tracking-widest text-(--plate)">LAST CHECK</p>
              <p className="mc-glow font-crt text-2xl tabular-nums">
                {lastSample ? formatClock(lastSample.at) : '--:--:--'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={pollNow} disabled={inFlight}>
              <RefreshCw data-icon="inline-start" className={inFlight ? 'animate-spin' : undefined} />
              Poll now
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-12">
        <LaunchScene
          className="lg:col-span-5 lg:row-span-3"
          overall={overall}
          goSince={telemetry.goSince}
          stations={telemetry.stations}
        />
        <PollBoard className="lg:col-span-7" stations={telemetry.stations} />
        <StatTiles
          className="lg:col-span-7"
          overall={overall}
          samples={telemetry.samples}
          lastSample={lastSample}
          lastHold={telemetry.lastHold}
          checks={telemetry.checks}
          nextPollAt={telemetry.nextPollAt}
          inFlight={inFlight}
        />
        <FlightLog className="lg:col-span-7" events={telemetry.events} />
        <LatencyChart className="lg:col-span-12" samples={telemetry.samples} />
      </main>
    </div>
  )
}
