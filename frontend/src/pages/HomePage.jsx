import { Link } from 'react-router'
import { ArrowDown, ArrowRight } from 'lucide-react'
import SignatureCard from '@/components/brand/SignatureCard'
import CtaButton from '@/components/CtaButton'
import FactList from '@/components/FactList'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import Reveal from '@/components/Reveal'
import { BRANDS, CATEGORIES, brandsIn } from '@/content/brands'
import { MARKETS, SITE } from '@/content/site'
import { pad2 } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATS = [
  { value: BRANDS.length, label: 'Houses' },
  { value: MARKETS.length, label: 'Markets' },
  { value: 0, label: 'Resellers or grey-market sites' },
]

// Home: hero, the idea, an index of the houses, then one section per brand
// grouped in category chapters. Copy and images are placeholders for now.
export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <HouseIndex />
      {CATEGORIES.map((category, i) => (
        <Chapter key={category.id} category={category} number={i + 1} />
      ))}
      <Closing />
    </>
  )
}

function Hero() {
  return (
    // Pulled up under the transparent header; fills the screen below the announcement bar.
    <section className="dark relative -mt-header h-[calc(100svh-var(--spacing-bar))] min-h-[36rem] text-foreground">
      <ImagePlaceholder tone="ink" label="Campaign image" className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-black/45 via-transparent to-black/40" />
      </ImagePlaceholder>

      <div className="page-container relative flex h-full flex-col items-center justify-center gap-8 pt-header text-center">
        <Reveal as="p" className="eyebrow">
          Fashion · Jewelry · Watches
        </Reveal>
        <Reveal as="h1" delay={150} className="max-w-6xl font-serif text-display-2xl font-light text-balance">
          {SITE.tagline}
        </Reveal>
        <Reveal delay={300} className="mt-2 flex flex-wrap justify-center gap-3">
          <CtaButton render={<Link to="/search" />} nativeButton={false}>
            Search prices
          </CtaButton>
          <CtaButton
            variant="outline"
            render={<a href="#houses" />}
            nativeButton={false}
            className="border-foreground/60 bg-transparent hover:bg-foreground hover:text-background dark:border-foreground/60 dark:bg-transparent dark:hover:bg-foreground"
          >
            Explore the houses
          </CtaButton>
        </Reveal>
      </div>

      <a
        href="#intro"
        className="eyebrow absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[0.625rem]"
      >
        Scroll
        <ArrowDown className="size-3.5 motion-safe:animate-bounce" strokeWidth={1.25} aria-hidden="true" />
      </a>
    </section>
  )
}

function Intro() {
  return (
    <section id="intro" className="page-container grid gap-10 py-section lg:grid-cols-12">
      <Reveal as="h2" className="eyebrow lg:col-span-3">
        Why {SITE.name}
      </Reveal>
      <div className="lg:col-span-9">
        <Reveal as="p" className="font-serif text-display-md font-light text-pretty">
          Many luxury houses don't publish their prices in Vietnam. We collect official prices from
          brand stores and authorized dealers in Vietnam, Singapore and Hong Kong, set them side by
          side in VND, and follow how they change over time.
        </Reveal>
        <dl className="mt-16 grid gap-10 border-t pt-8 sm:grid-cols-3 sm:gap-6">
          {STATS.map(({ value, label }, i) => (
            <Reveal key={label} delay={i * 120} className="flex flex-col gap-3">
              <dt className="eyebrow order-2 text-muted-foreground">{label}</dt>
              <dd className="order-1 font-serif text-display-xl font-light">{pad2(value)}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

function HouseIndex() {
  return (
    <section id="houses" aria-labelledby="houses-title" className="scroll-mt-header border-t">
      {/* No bottom padding: the first chapter's top padding follows on the same ground. */}
      <div className="page-container pt-section">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal as="h2" id="houses-title" className="font-serif text-display-lg">
            The Houses
          </Reveal>
          <Reveal as="p" delay={100} className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Fashion, jewelry and watches. Choose a house to read its story.
          </Reveal>
        </div>

        <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-8 lg:gap-14">
          {CATEGORIES.map((category, i) => (
            <Reveal key={category.id} delay={i * 120}>
              <h3 className="eyebrow border-b pb-4 text-muted-foreground">
                <span className="mr-4 text-foreground">{pad2(i + 1)}</span>
                {category.name}
              </h3>
              <ul>
                {brandsIn(category.id).map((brand) => (
                  <li key={brand.slug} className="border-b">
                    <a
                      href={`#${brand.slug}`}
                      className="group flex items-baseline justify-between gap-4 py-5"
                    >
                      <span className="font-serif text-display-sm group-hover:italic">{brand.name}</span>
                      <span className="eyebrow text-muted-foreground">{brand.founded.year}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Chapter({ category, number }) {
  const brands = brandsIn(category.id)
  const titleId = `chapter-${category.id}`

  return (
    <section aria-labelledby={titleId} className={category.ground}>
      <div className="page-container pt-section">
        <Reveal className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p className="eyebrow">Chapter {pad2(number)}</p>
          <p className="eyebrow text-muted-foreground">{brands.map((b) => b.name).join(' · ')}</p>
        </Reveal>
        <Reveal as="h2" id={titleId} delay={100} className="mt-10 font-serif text-display-lg">
          {category.name}
        </Reveal>
      </div>

      {brands.map((brand, i) =>
        i === 0 ? (
          <BrandFeature key={brand.slug} brand={brand} />
        ) : (
          <BrandSplit key={brand.slug} brand={brand} flip={i % 2 === 0} />
        ),
      )}
    </section>
  )
}

// Full-bleed image with the name over it, then story, facts and three products.
function BrandFeature({ brand }) {
  const nameId = `${brand.slug}-name`

  return (
    <article id={brand.slug} aria-labelledby={nameId} className="scroll-mt-header pt-16 pb-section">
      <Reveal>
        <ImagePlaceholder
          tone={brand.tone}
          category={brand.category}
          label={`${brand.name} campaign image`}
          captionClassName="top-4 bottom-auto"
          className="group aspect-4/5 text-ivory sm:aspect-auto sm:h-[80svh] sm:max-h-240 sm:min-h-120"
        >
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/55 via-black/20 to-transparent pt-32 pb-10 sm:pb-14">
            <div className="page-container">
              <p className="eyebrow">
                {brand.founded.place} · Since {brand.founded.year}
              </p>
              <h3 id={nameId} className="mt-4 font-serif text-display-xl">
                {brand.name}
              </h3>
            </div>
          </div>
        </ImagePlaceholder>
      </Reveal>

      <div className="page-container mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12">
        <Reveal className="grid content-start gap-8 lg:col-span-6">
          <p className="text-lede text-pretty">{brand.summary}</p>
          <BrandLink brand={brand} />
        </Reveal>
        <Reveal delay={120} className="lg:col-span-4 lg:col-start-9">
          <FactList items={brandFacts(brand)} />
        </Reveal>
      </div>

      <div className="page-container mt-20">
        <Reveal as="p" className="eyebrow mb-8">
          Signature pieces
        </Reveal>
        {/* A swipeable row on phones, three columns from sm up. */}
        <ul className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:gap-10">
          {brand.signatures.map((product, i) => (
            <Reveal as="li" key={product.name} delay={i * 120} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <SignatureCard product={product} brand={brand} />
            </Reveal>
          ))}
        </ul>
      </div>
    </article>
  )
}

// Image on one side, story on the other; `flip` swaps the sides.
function BrandSplit({ brand, flip }) {
  const nameId = `${brand.slug}-name`

  return (
    <article
      id={brand.slug}
      aria-labelledby={nameId}
      className="page-container grid scroll-mt-header items-center gap-12 pb-section lg:grid-cols-12 lg:gap-x-8"
    >
      <Reveal className={cn('lg:col-span-6 lg:row-start-1', flip && 'lg:col-start-7')}>
        <ImagePlaceholder
          tone={brand.tone}
          category={brand.category}
          label={`${brand.name} campaign image`}
          className="group aspect-4/5"
        />
      </Reveal>

      <div
        className={cn(
          'grid gap-10 lg:col-span-5 lg:row-start-1',
          flip ? 'lg:col-start-1' : 'lg:col-start-8',
        )}
      >
        <Reveal className="grid gap-4">
          <p className="eyebrow text-muted-foreground">
            {brand.founded.place} · Since {brand.founded.year}
          </p>
          <h3 id={nameId} className="font-serif text-display-xl">
            {brand.name}
          </h3>
        </Reveal>
        <Reveal as="p" delay={100} className="text-lede text-pretty">
          {brand.summary}
        </Reveal>
        <Reveal delay={150}>
          <FactList items={brandFacts(brand)} />
        </Reveal>
        <Reveal delay={200}>
          <p className="eyebrow mb-5">Signature pieces</p>
          <ul className="grid grid-cols-3 gap-3 sm:gap-5">
            {brand.signatures.map((product) => (
              <li key={product.name}>
                <SignatureCard product={product} brand={brand} compact />
              </li>
            ))}
          </ul>
        </Reveal>
        <BrandLink brand={brand} />
      </div>
    </article>
  )
}

const brandFacts = (brand) => [
  ['Founded', `${brand.founded.place}, ${brand.founded.year}`],
  ['Founder', brand.founder],
  ['Headquarters', brand.headquarters],
  ['Group', brand.group],
]

function BrandLink({ brand }) {
  return (
    <Link
      to={`/brands/${brand.slug}`}
      className="eyebrow group inline-flex items-center gap-3 justify-self-start"
    >
      <span className="link-underline">Discover {brand.name}</span>
      <ArrowRight
        className="size-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1"
        strokeWidth={1.25}
        aria-hidden="true"
      />
    </Link>
  )
}

function Closing() {
  return (
    <section className="page-container grid justify-items-center gap-8 py-section text-center">
      <Reveal as="p" className="eyebrow text-muted-foreground">
        Search
      </Reveal>
      <Reveal as="h2" delay={100} className="max-w-4xl font-serif text-display-lg text-balance">
        Every tracked piece, in every market, in one search.
      </Reveal>
      <Reveal delay={200}>
        <CtaButton render={<Link to="/search" />} nativeButton={false}>
          Search prices
          <ArrowRight className="size-3.5" strokeWidth={1.25} aria-hidden="true" />
        </CtaButton>
      </Reveal>
    </section>
  )
}
