import { BRAND_CATEGORIES, Brand } from '../models/brand.model.js';
import { Product } from '../models/product.model.js';
import { httpError } from '../utils/http-error.js';
import { enumParam } from '../utils/query.js';

// Brand in docs/API.md.
function toBrandDto(brand, productCount) {
  return {
    slug: brand.slug,
    name: brand.name,
    category: brand.category,
    foundedYear: brand.foundedYear,
    founder: brand.founder,
    city: brand.city,
    country: brand.country,
    history: brand.history,
    signatureProducts: (brand.signatureProducts ?? []).map(({ name, year, description }) => ({
      name,
      year: year ?? null,
      description,
    })),
    contentStatus: brand.contentStatus,
    productCount,
  };
}

export async function listBrands(req, res) {
  const category = enumParam(req.query, 'category', BRAND_CATEGORIES);
  const [brands, counts] = await Promise.all([
    Brand.find(category ? { category } : {}).sort({ order: 1, name: 1 }).lean(),
    Product.aggregate([{ $group: { _id: '$brand', count: { $sum: 1 } } }]),
  ]);
  const countBySlug = new Map(counts.map(({ _id, count }) => [_id, count]));

  res.json({ items: brands.map((brand) => toBrandDto(brand, countBySlug.get(brand.slug) ?? 0)) });
}

export async function getBrand(req, res) {
  const slug = req.params.slug.trim().toLowerCase();
  const [brand, collections] = await Promise.all([
    Brand.findOne({ slug }).lean(),
    Product.aggregate([
      { $match: { brand: slug } },
      { $group: { _id: '$collection', productCount: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  if (!brand) {
    throw httpError(404, 'Brand not found');
  }
  const productCount = collections.reduce((sum, collection) => sum + collection.productCount, 0);

  res.json({
    brand: {
      ...toBrandDto(brand, productCount),
      // Products without a collection count towards productCount only.
      collections: collections
        .filter(({ _id }) => _id)
        .map(({ _id, productCount }) => ({ name: _id, productCount })),
    },
  });
}
