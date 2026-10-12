import { Link } from 'react-router'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import { MARKETS } from '@/content/site'
import { leadPrice, productPath } from '@/lib/catalog'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

// A product in a grid: image (the second view fades in on hover), name,
// reference, lead price and the markets that sell it. The whole card links to
// the product page.
export default function ProductCard({ product }) {
  const [image, hoverImage] = product.images
  const price = leadPrice(product)
  const credit = image && sourceName(product, image.sourceId)

  return (
    <article className="group relative grid content-start gap-4">
      <div className="relative aspect-4/5 overflow-hidden bg-secondary">
        {image ? (
          <>
            <img
              src={image.url}
              alt={image.alt || product.name}
              loading="lazy"
              decoding="async"
              className={cn(
                'absolute inset-0 size-full object-contain p-[8%] mix-blend-multiply transition duration-700 ease-lux',
                hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]',
              )}
            />
            {hoverImage && (
              <img
                src={hoverImage.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-contain p-[8%] opacity-0 mix-blend-multiply transition-opacity duration-700 ease-lux group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <ImagePlaceholder category={product.category} className="absolute inset-0" />
        )}
      </div>

      <div className="grid gap-1">
        <p className="eyebrow truncate text-muted-foreground">
          {product.collection ?? product.category}
        </p>
        <h3 className="font-serif text-xl leading-tight">
          {/* Stretched over the card so the whole card is one link. */}
          <Link to={productPath(product)} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">Ref. {product.ref}</p>
      </div>

      <div className="grid gap-2">
        <p className="text-sm tabular-nums">
          {price ? formatPrice(price.value, price.currency) : 'Price on request'}
        </p>
        <MarketStrip offers={product.offers} lowest={price?.market} />
      </div>

      {credit && <p className="text-[0.625rem] text-muted-foreground">Image: {credit}</p>}
    </article>
  )
}

// "VN SG HK", dimmed where the product isn't sold, with a dot on the market
// the lead price comes from when there is more than one.
function MarketStrip({ offers, lowest }) {
  const sold = new Set(offers.map((o) => o.market))
  const markLowest = lowest && sold.size > 1
  const soldNames = MARKETS.filter((m) => sold.has(m.code)).map((m) => m.name)
  const lowestName = MARKETS.find((m) => m.code === lowest)?.name

  return (
    <>
      <p aria-hidden="true" className="eyebrow flex gap-3 text-[0.625rem]">
        {MARKETS.map(({ code }) => (
          <span
            key={code}
            className={cn(
              'flex items-center gap-1.5',
              !sold.has(code) && 'text-muted-foreground/45',
            )}
          >
            {markLowest && code === lowest && <span className="size-1 rounded-full bg-gain" />}
            {code}
          </span>
        ))}
      </p>
      <p className="sr-only">
        {soldNames.length ? `Sold in ${soldNames.join(', ')}.` : 'Not sold in our markets.'}
        {markLowest && ` Lowest price in ${lowestName}.`}
      </p>
    </>
  )
}

// Images credit the store they came from (Image.sourceId = Offer.source.id).
function sourceName(product, sourceId) {
  return product.offers.find((o) => o.source.id === sourceId)?.source.name ?? sourceId
}
