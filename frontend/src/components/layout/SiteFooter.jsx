import { Link } from 'react-router'
import { BRANDS } from '@/content/brands'
import { DISCLAIMER, MARKETS, PAGES, SITE } from '@/content/site'

// Link columns, the disclaimer the spec requires, and the wordmark set across
// the full width.
export default function SiteFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="page-container grid gap-14 pt-20 pb-16 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-4">
          <p className="font-serif text-display-sm">{SITE.tagline}</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Official prices from brand stores and authorized dealers, side by side and over time.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
          <FooterColumn title="The Houses">
            {BRANDS.map((brand) => (
              <li key={brand.slug}>
                <Link to={`/brands/${brand.slug}`} className="link-underline">
                  {brand.name}
                </Link>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Explore">
            {PAGES.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="link-underline">
                  {label}
                </Link>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Markets">
            {MARKETS.map((market) => (
              <li key={market.code}>
                {market.name} <span className="text-muted-foreground">· {market.currency}</span>
              </li>
            ))}
          </FooterColumn>
        </nav>
      </div>

      <section aria-labelledby="disclaimer" className="page-container">
        <div className="grid gap-4 border-t border-foreground/15 py-10 lg:grid-cols-12">
          <h2 id="disclaimer" className="eyebrow lg:col-span-4">
            Disclaimer
          </h2>
          <div className="grid max-w-3xl gap-3 text-[0.8125rem] leading-relaxed text-muted-foreground lg:col-span-8 lg:col-start-6">
            {DISCLAIMER.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <div className="page-container @container">
        <p
          aria-hidden="true"
          className="-mb-[0.12em] text-center font-serif text-[length:16.2cqw] leading-none font-light tracking-[-0.01em] whitespace-nowrap uppercase select-none"
        >
          {SITE.name}
        </p>
      </div>

      <div className="page-container">
        <div className="eyebrow flex flex-wrap justify-between gap-x-8 gap-y-2 border-t border-foreground/15 py-6 text-[0.625rem] text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span>A non-commercial university project</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }) {
  return (
    <div className="grid content-start gap-5">
      <h2 className="eyebrow">{title}</h2>
      <ul className="grid gap-2.5 text-sm">{children}</ul>
    </div>
  )
}
