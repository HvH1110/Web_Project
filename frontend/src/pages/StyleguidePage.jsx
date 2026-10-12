import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import SignatureCard from '@/components/brand/SignatureCard'
import CtaButton from '@/components/CtaButton'
import FactList from '@/components/FactList'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { BRANDS } from '@/content/brands'
import { SITE } from '@/content/site'

// Design system reference (dev only, /styleguide). Tokens live in index.css.

const PALETTE = [
  { name: 'Ink', className: 'bg-ink', hex: '#15120F', use: 'Text, primary buttons, dark sections' },
  { name: 'Graphite', className: 'bg-graphite', hex: '#3B3631', use: 'Dark imagery backdrops' },
  { name: 'Mist', className: 'bg-mist', hex: '#6F6A62', use: 'Secondary text (5.3:1 on paper)' },
  { name: 'Taupe', className: 'bg-taupe', hex: '#A89D8F', use: 'Imagery backdrops, chart lines' },
  { name: 'Sand', className: 'bg-sand', hex: '#D8CFC3', use: 'Imagery backdrops' },
  { name: 'Stone', className: 'bg-stone', hex: '#E7E2DA', use: 'Hairlines, borders' },
  { name: 'Ivory', className: 'bg-ivory', hex: '#F6F4F0', use: 'Alternate sections, footer' },
  { name: 'Paper', className: 'bg-paper', hex: '#FFFFFF', use: 'Page background' },
  { name: 'Gain', className: 'bg-gain', hex: '#2E5A43', use: 'Price drops, savings (deals)' },
  { name: 'Loss', className: 'bg-loss', hex: '#8C2F23', use: 'Price rises, errors' },
]

const TYPE = [
  { name: 'Display 2XL', spec: 'text-display-2xl · light · 52→152 px', className: 'font-serif text-display-2xl font-light', sample: 'Know the price' },
  { name: 'Display XL', spec: 'text-display-xl · brand names · 44→104 px', className: 'font-serif text-display-xl', sample: 'Van Cleef & Arpels' },
  { name: 'Display LG', spec: 'text-display-lg · section titles · 34→64 px', className: 'font-serif text-display-lg', sample: 'Fashion & Leather Goods' },
  { name: 'Display MD', spec: 'text-display-md · light · statements · 26→42 px', className: 'font-serif text-display-md font-light', sample: 'Official prices, side by side, over time.' },
  { name: 'Display SM', spec: 'text-display-sm · card titles · 22→28 px', className: 'font-serif text-display-sm', sample: 'Lady Dior' },
  { name: 'Lede', spec: 'text-lede · Geist 18/32', className: 'text-lede', sample: 'A Paris trunk-maker whose flat-topped, stackable luggage changed how people travelled.' },
  { name: 'Body', spec: 'text-sm · Geist 14/20', className: 'text-sm', sample: 'Prices are indicative. Always confirm the price with the official store before you buy.' },
  { name: 'Eyebrow', spec: 'eyebrow · Geist 11 px · 500 · 0.2em · caps', className: 'eyebrow', sample: 'Paris · Since 1854' },
  { name: 'Vietnamese', spec: 'Both families cover Vietnamese', className: 'font-serif text-display-sm', sample: 'Giá chính hãng tại Việt Nam, Singapore và Hồng Kông' },
]

const SPACING = [
  { name: 'gutter', spec: '20→64 px · side padding (px-gutter, page-container)', width: 'var(--spacing-gutter)' },
  { name: 'section', spec: '80→168 px · between sections (py-section)', width: 'var(--spacing-section)' },
  { name: 'header', spec: '68 px · sticky header (h-header, scroll-mt-header)', width: 'var(--spacing-header)' },
  { name: 'bar', spec: '32 px · announcement bar (h-bar)', width: 'var(--spacing-bar)' },
]

export default function StyleguidePage() {
  const lv = BRANDS[0]

  return (
    <div className="pb-section">
      <header className="page-container grid gap-6 py-section">
        <p className="eyebrow text-muted-foreground">Design system · dev only</p>
        <h1 className="font-serif text-display-xl">{SITE.name} styleguide</h1>
        <p className="max-w-2xl text-lede text-muted-foreground">
          Editorial, quiet and exact: serif display type, a warm black, white and neutral palette,
          square corners, hairline rules, generous space and slow motion. Inspired by the JW
          Anderson, Louis Vuitton and Dior sites without borrowing their marks.
        </p>
      </header>

      <Block title="Color" note="Raw palette as Tailwind colors (bg-ink, text-mist…). Components use the semantic shadcn tokens; put `dark` on a section to flip them.">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {PALETTE.map((c) => (
            <li key={c.name} className="grid min-w-0 content-start gap-3">
              <div className={`aspect-4/3 border ${c.className}`} />
              <div className="grid gap-1">
                <p className="flex flex-wrap justify-between gap-x-2 text-sm">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground tabular-nums">{c.hex}</span>
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-14 grid sm:grid-cols-2">
          <TokenPanel label="Light (default)" />
          <TokenPanel label="Dark (.dark)" className="dark" />
        </div>
      </Block>

      <Block title="Typography" note="Cormorant Garamond for display, Geist for everything else. Display sizes are fluid from phone to wide desktop.">
        <ul className="border-b">
          {TYPE.map((t) => (
            <li key={t.name} className="grid gap-3 border-t py-8 lg:grid-cols-12 lg:items-baseline">
              <div className="grid gap-1 lg:col-span-3">
                <p className="text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.spec}</p>
              </div>
              <p className={`lg:col-span-9 ${t.className}`}>{t.sample}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Space & layout" note="Content sits in page-container (max 1536 px). Sections breathe with py-section; rows inside a section use the default 4 px scale.">
        <ul className="grid gap-6">
          {SPACING.map((s) => (
            <li key={s.name} className="grid items-center gap-2 sm:grid-cols-12 sm:gap-6">
              <div className="h-4 bg-ink sm:col-span-3" style={{ width: s.width }} />
              <p className="text-sm sm:col-span-9">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground"> · {s.spec}</span>
              </p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Actions" note="CtaButton for calls to action, link-underline for inline links. Corners are square everywhere.">
        <div className="grid gap-px sm:grid-cols-2">
          {['', 'dark'].map((theme) => (
            <div key={theme || 'light'} className={`${theme} flex flex-wrap items-center gap-6 bg-background p-8 text-foreground sm:p-10`}>
              <CtaButton>Search prices</CtaButton>
              <CtaButton variant="outline">Explore</CtaButton>
              <Link to="/styleguide" className="eyebrow group inline-flex items-center gap-3">
                <span className="link-underline">Discover</span>
                <ArrowRight className="size-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1" strokeWidth={1.25} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Imagery" note="ImagePlaceholder stands in for photos until the catalog has them. Real images: 4:5 for products, full-bleed or 4:5 for houses, always credited to their source.">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {['stone', 'sand', 'taupe', 'graphite', 'ink'].map((tone, i) => (
            <li key={tone}>
              <ImagePlaceholder tone={tone} category={['fashion', 'jewelry', 'watches'][i % 3]} label={tone} className="group aspect-4/5" />
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Brand pieces" note="Shared with the brand page: key facts, and signature cards in full and compact sizes. Prices show a dash until real, sourced prices exist.">
        <div className="grid gap-12 lg:grid-cols-12">
          <FactList
            items={[
              ['Founded', `${lv.founded.place}, ${lv.founded.year}`],
              ['Founder', lv.founder],
              ['Group', lv.group],
            ]}
            className="lg:col-span-4"
          />
          <div className="max-w-xs lg:col-span-3 lg:col-start-6">
            <SignatureCard product={lv.signatures[0]} brand={lv} />
          </div>
          <ul className="grid grid-cols-3 content-start gap-3 lg:col-span-4">
            {lv.signatures.map((p) => (
              <li key={p.name}>
                <SignatureCard product={p} brand={lv} compact />
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block title="Motion" note="Slow and quiet. Everything below is switched off under prefers-reduced-motion.">
        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          <li>Easing: <code>ease-lux</code> · cubic-bezier(0.22, 1, 0.36, 1)</li>
          <li>Scroll reveal: <code>&lt;Reveal delay&gt;</code> · fade and 24 px lift, 1.1 s</li>
          <li>Image hover: art drifts to 104 % over 1.6 s</li>
          <li>Links: hairline underline draws in over 0.6 s</li>
        </ul>
      </Block>
    </div>
  )
}

function Block({ title, note, children }) {
  return (
    <section className="page-container grid gap-10 pt-20 lg:grid-cols-12">
      <div className="grid content-start gap-3 lg:col-span-3">
        <h2 className="font-serif text-display-sm">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{note}</p>
      </div>
      <div className="lg:col-span-9">{children}</div>
    </section>
  )
}

const TOKENS = [
  ['background', 'bg-background'],
  ['foreground', 'bg-foreground'],
  ['muted-foreground', 'bg-muted-foreground'],
  ['secondary', 'bg-secondary'],
  ['border', 'bg-border'],
  ['primary', 'bg-primary'],
]

function TokenPanel({ label, className = '' }) {
  return (
    <div className={`${className} grid gap-5 border bg-background p-8 text-foreground`}>
      <p className="eyebrow">{label}</p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
        {TOKENS.map(([name, bg]) => (
          <li key={name} className="flex items-center gap-3">
            <span className={`size-5 shrink-0 border border-foreground/20 ${bg}`} />
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}
