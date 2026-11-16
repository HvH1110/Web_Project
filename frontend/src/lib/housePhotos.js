import { getProducts } from '@/lib/api'
import { imageCredit, productPath } from '@/lib/catalog'

// A product's first image as a picture for the home page: what it shows, where
// that product is, and whose image it is.
const photoOf = (product) => ({
  ...product.images[0],
  alt: product.images[0].alt || product.name,
  name: product.name,
  to: productPath(product),
  credit: imageCredit(product, product.images[0]),
})

// Pictures for a house's signature pieces: for each piece, the tracked products
// its name finds, as photos to try in order (old image links can be dead).
// Resolves to { [piece.name]: photos }, empty lists where nothing is tracked.
export function getHousePhotos(brand, pieces, { signal } = {}) {
  return Promise.all(
    pieces.map((piece) =>
      getProducts({ brand: brand.slug, q: piece.name, limit: 6 }, { signal }).then((r) => [
        piece.name,
        r.items.filter((p) => p.images.length).map(photoOf),
      ]),
    ),
  ).then(Object.fromEntries)
}
