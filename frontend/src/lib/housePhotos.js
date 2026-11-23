import { productPath } from '@/lib/catalog'

// Pictures of a house from GET /api/brands (Brand.covers and Brand.photo in
// ../docs/API.md), as photos to try in order with useWorkingImages: any link
// can be dead, so callers show the first that loads.

// A cover (a tracked product with a picture): what it shows, where that
// product is, and whose image it is.
const coverPhoto = (cover) => ({
  ...cover.image,
  alt: cover.image.alt || cover.name,
  name: cover.name,
  to: productPath(cover),
  credit: cover.credit,
})

// The house's own photo (a boutique, freely licensed): a scene that fills its
// frame, credited to its photographer and license (see PhotoCredit).
const scenePhoto = (photo) => ({ ...photo, fill: true })

// Pictures of one signature piece, best first. Empty when nothing tracked
// matches it.
export const piecePhotos = (brand, pieceName) =>
  (brand?.covers ?? []).filter((c) => c.piece === pieceName).map(coverPhoto)

// Pictures for a house's large image, best first: the house picks, then the
// signature pieces' second and third picks (their first is on their cards),
// then their first picks, and last the house's own photo, so a house whose
// product pictures all fail, or that has none yet, is still pictured.
export function housePhotos(brand) {
  if (!brand) return []
  const covers = brand.covers ?? []
  const firsts = new Set(brand.signatureProducts.map((p) => covers.find((c) => c.piece === p.name)))
  return [
    ...covers.filter((c) => c.piece === null),
    ...covers.filter((c) => c.piece !== null && !firsts.has(c)),
    ...covers.filter((c) => firsts.has(c)),
  ]
    .map(coverPhoto)
    .concat(brand.photo ? [scenePhoto(brand.photo)] : [])
}
