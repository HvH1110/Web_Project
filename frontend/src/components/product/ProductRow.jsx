import { Link } from 'react-router'
import ImagePlaceholder from '@/components/ImagePlaceholder'
import OfferTable from '@/components/product/OfferTable'
import { imageCredit, productPath } from '@/lib/catalog'

// A search result: image, name and reference, then the price in every market
// with where-to-buy links. Not one big link, since the offers link out.
export default function ProductRow({ product }) {
  const [image] = product.images
  const path = productPath(product)

  return (
    <article className="grid grid-cols-[5.5rem_1fr] gap-x-5 gap-y-6 py-8 sm:grid-cols-[8rem_1fr] lg:grid-cols-12 lg:gap-x-8">
      {/* The name below is the accessible link; this one is a mouse shortcut. */}
      <Link
        to={path}
        tabIndex={-1}
        aria-hidden="true"
        className="group relative block aspect-4/5 overflow-hidden bg-secondary lg:col-span-2"
      >
        {image ? (
          <img
            src={image.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain p-[8%] mix-blend-multiply transition-transform duration-700 ease-lux group-hover:scale-[1.04]"
          />
        ) : (
          <ImagePlaceholder category={product.category} className="absolute inset-0" />
        )}
      </Link>

      <div className="grid content-start gap-1.5 lg:col-span-4">
        <p className="eyebrow text-muted-foreground">
          {[product.brandName ?? product.brand, product.collection].filter(Boolean).join(' · ')}
        </p>
        <h3 className="font-serif text-display-sm">
          <Link to={path} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">Ref. {product.ref}</p>
        {image && (
          <p className="mt-2 text-[0.625rem] text-muted-foreground">Image: {imageCredit(product, image)}</p>
        )}
      </div>

      <OfferTable product={product} className="col-span-2 lg:col-span-6" />
    </article>
  )
}
