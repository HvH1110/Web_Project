import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CREW, FACTS, GALLERY, HERO_IMAGE, SUMMARY, nasaImageUrl } from '@/content/apollo11'

// Home: a short Apollo 11 mission brief with NASA photos.
export default function HomePage() {
  return (
    <div className="grid gap-6">
      <Briefing />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {FACTS.map((fact) => (
          <li key={fact.label}>
            <Fact {...fact} />
          </li>
        ))}
      </ul>
      <Gallery />
      <p className="text-xs text-muted-foreground">
        Photos: NASA Image and Video Library (public domain). Their use here does not imply
        endorsement by NASA.
      </p>
    </div>
  )
}

function NasaCredit({ nasaId, className }) {
  return (
    <a
      href={nasaImageUrl(nasaId)}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 font-mono text-[11px] tracking-widest text-(--plate) uppercase hover:underline ${className ?? ''}`}
    >
      NASA · {nasaId}
      <ArrowUpRight className="size-3" aria-hidden="true" />
    </a>
  )
}

function Briefing() {
  return (
    <Card className="mc-panel overflow-hidden py-0">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <figure className="relative min-h-[320px] bg-black">
          <img
            src={HERO_IMAGE.src}
            width={HERO_IMAGE.width}
            height={HERO_IMAGE.height}
            alt={HERO_IMAGE.alt}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[50%_40%]"
          />
          <figcaption className="absolute inset-x-0 bottom-0 grid gap-1 bg-linear-to-t from-black/85 to-transparent px-4 pt-10 pb-3">
            <span className="text-sm text-white/90">{HERO_IMAGE.caption}</span>
            <NasaCredit nasaId={HERO_IMAGE.nasaId} />
          </figcaption>
        </figure>

        <div className="grid content-start gap-5 p-6">
          <div className="grid gap-2">
            <p className="mc-plate">Mission briefing · July 16–24, 1969</p>
            <h1 className="mc-glow font-crt text-6xl leading-none tracking-wide sm:text-7xl">APOLLO 11</h1>
            <p className="font-crt text-2xl leading-none text-(--plate)">
              First crewed landing on the Moon
            </p>
          </div>

          <div className="grid gap-3 text-foreground/85">
            {SUMMARY.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>

          <ul className="mc-crt grid divide-y divide-(--phosphor)/10 overflow-hidden rounded-lg">
            {CREW.map(({ name, role }) => (
              <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                <span className="mc-glow font-crt text-xl leading-none">{name}</span>
                <span className="font-mono text-[10px] tracking-widest text-(--plate) uppercase">{role}</span>
              </li>
            ))}
          </ul>

          <div>
            <Button
              size="lg"
              render={<Link to="/mission-control" />}
              nativeButton={false}
              className="shadow-[0_0_18px_rgb(255_255_255/0.35)]"
            >
              Enter Mission Control
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Fact({ label, value, detail }) {
  return (
    <Card size="sm" className="mc-panel h-full">
      <CardContent className="grid gap-1.5">
        <p className="mc-plate">{label}</p>
        <p className="mc-crt rounded-md px-2.5 py-1">
          <span className="mc-glow font-crt text-3xl leading-none whitespace-nowrap">{value}</span>
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function Gallery() {
  return (
    <section aria-labelledby="gallery-heading" className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="gallery-heading" className="mc-glow font-crt text-3xl leading-none tracking-wide">
          MISSION PHOTOS
        </h2>
        <p className="mc-plate">From the NASA archive</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GALLERY.map((photo) => (
          <li key={photo.nasaId}>
            <figure className="mc-panel group grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-xl">
              <a
                href={nasaImageUrl(photo.nasaId)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden bg-black"
                aria-label={`${photo.title} on the NASA Image and Video Library`}
              >
                <img
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  style={photo.position && { objectPosition: photo.position }}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </a>
              <figcaption className="grid content-start gap-1.5 p-4">
                <span className="mc-plate">{photo.date}</span>
                <span className="mc-glow font-crt text-2xl leading-none">{photo.title}</span>
                <span className="text-sm text-muted-foreground">{photo.caption}</span>
                <NasaCredit nasaId={photo.nasaId} className="mt-1" />
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  )
}
