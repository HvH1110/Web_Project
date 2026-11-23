// "Chanel · Coco Crush": the house, then the product's collection when it has
// one. The collection keeps the product's language (Product.lang in
// ../docs/API.md: Vietnamese for products seen only on a Vietnamese page),
// while the house's name is not translated.
export default function BrandAndCollection({ product, brandName = product.brandName ?? product.brand }) {
  return (
    <>
      {brandName}
      {product.collection && (
        <>
          {' · '}
          <span lang={product.lang}>{product.collection}</span>
        </>
      )}
    </>
  )
}
