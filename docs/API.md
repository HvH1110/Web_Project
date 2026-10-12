# API Contract

The single source of truth between `frontend/` and `backend/`.

- **Owner:** backend session. It updates this file whenever an endpoint is added or changed.
- **Reader:** frontend session. It codes against this file.

## Conventions
- Base URL: `http://localhost:5000/api` locally. The frontend reads it from `VITE_API_URL`.
- Paths below include the `/api` prefix.
- JSON request and response bodies.
- Errors: non-2xx status with body `{ "error": { "message": "Human-readable message" } }`.
- Auth: not decided yet.
- Dates are ISO 8601 strings in UTC, e.g. `"2026-10-12T02:00:00.000Z"`.
- Prices are numbers in major units, exactly as the source shows them (e.g. `13450` SGD). `priceVnd` values are converted and rounded to whole VND.
- Markets: `VN`, `SG`, `HK`. Currencies: `VND`, `SGD`, `HKD`.
- Every catalog endpoint (`/api/brands…`, `/api/products…`) answers **503** `Database unavailable` while the backend is not connected to MongoDB.

## Shared types

### Brand
```json
{
  "slug": "rolex",
  "name": "Rolex",
  "category": "watches",
  "foundedYear": 1905,
  "founder": "Hans Wilsdorf and Alfred Davis",
  "city": "London",
  "country": "United Kingdom",
  "history": "Short history, 3 to 5 sentences.",
  "signatureProducts": [
    { "name": "Submariner", "year": 1953, "description": "One sentence." }
  ],
  "contentStatus": "draft",
  "productCount": 42
}
```
- `category`: `fashion`, `jewelry` or `watches`. This is the brand's category, not the product category used by search.
- `city` / `country`: where the house was founded (not necessarily today's headquarters).
- `signatureProducts[].year`: year introduced, or `null` when not stated.
- `contentStatus`: `draft` (editorial text not yet reviewed) or `reviewed`.
- `productCount`: number of tracked products for this brand.

### Offer
The current price of a product at one official store or authorized dealer. Used for "where to buy".
```json
{
  "market": "SG",
  "source": { "id": "rolex-sg", "name": "Rolex Boutique Singapore", "type": "official" },
  "url": "https://example.com/product-page",
  "currency": "SGD",
  "price": 13450,
  "priceVnd": 255555000,
  "available": true,
  "lastSeenAt": "2026-10-12T02:00:00.000Z"
}
```
- `source.type`: `official` or `authorized-dealer`.
- `url`: the product page at that source; link to it as "where to buy".
- `price`: `null` when the source page shows no price.
- `priceVnd`: `price` converted with the latest exchange rate (see `fx`). Equals `price` for VND. `null` when `price` is `null` or no rate is available for the currency.
- `available`: `true`, `false`, or `null` when unknown.
- Offers are sorted by market (`VN`, `SG`, `HK`), then by `priceVnd` ascending. A market can have more than one offer (e.g. the brand boutique and an authorized dealer).

### Image
```json
{ "url": "https://example.com/image.jpg", "alt": "Submariner Date, front", "sourceId": "rolex-sg" }
```
Images belong to their owners: always show a credit. `sourceId` matches an offer's `source.id`, so the credit can name that store and link to its offer URL.

### ProductSummary
```json
{
  "id": "6720f1c2a1b2c3d4e5f60718",
  "brand": "rolex",
  "brandName": "Rolex",
  "ref": "126610LN",
  "name": "Submariner Date",
  "category": "watches",
  "collection": "Submariner",
  "images": [ /* Image, 0 to 4 */ ],
  "lowestPriceVnd": 255555000,
  "offers": [ /* Offer */ ]
}
```
- `brand` + `ref` identify the product in URLs (see product detail). `ref` is the brand's reference code, uppercase, no spaces.
- `brandName`: `null` if the brand is not in the `brands` collection.
- `category`: `bags`, `accessories`, `shoes`, `clothing`, `jewelry` or `watches` (the crawler may add more).
- `collection`: may be `null`.
- `lowestPriceVnd`: the lowest `priceVnd` among the offers (only offers in the requested markets, when search is filtered by `market`). `null` when no offer has a VND price.

### Fx
The exchange rate used for every `priceVnd` in a response. `null` when no rate has been stored yet (then only VND offers have a `priceVnd`).
```json
{ "date": "2026-10-12", "vndPer": { "SGD": 19000, "HKD": 3350, "USD": 26300 } }
```
`vndPer.X` is the number of VND for 1 unit of currency X on `date`.

## Endpoints

### `GET /api/health`
Health check. Also reports whether the backend is connected to MongoDB Atlas.

**Response 200**
```json
{ "status": "ok", "db": "connected" }
```
`db` is `"connected"` or `"disconnected"`.

### `GET /api/brands`
All brands, in the order the home page shows them (Louis Vuitton, Dior, Chanel, Cartier, Van Cleef & Arpels, Rolex, Omega, IWC).

**Query**
| Param | Description |
|---|---|
| `category` | optional, `fashion`, `jewelry` or `watches` |

**Response 200**
```json
{ "items": [ /* Brand */ ] }
```

**Errors**
- 400: `category` is not one of the allowed values.

### `GET /api/brands/:slug`
One brand, for the brand page. Its products come from `GET /api/products?brand=:slug`.

**Response 200**
```json
{
  "brand": {
    /* every Brand field, plus: */
    "collections": [ { "name": "Submariner", "productCount": 12 } ]
  }
}
```
`collections`: the collections of this brand's tracked products, sorted by name. Use `name` as the `collection` filter in search.

**Errors**
- 404: no brand with that slug.

### `GET /api/products`
Search and filter products. Each result carries its offers in every market, so a result card can show the price per market and where to buy.

**Query** (all optional)
| Param | Description |
|---|---|
| `q` | Text search, max 100 characters. Every word must appear in the product name, collection, reference code or brand slug. Case and accents are ignored (`panthere` finds "Panthère"); partial words match (`subm` finds "Submariner"). |
| `brand` | Brand slug. Comma-separate several: `rolex,omega`. |
| `category` | Product category. Comma-separate several: `bags,shoes`. |
| `collection` | Exact collection name, as given by `GET /api/brands/:slug`. Comma-separate several. |
| `market` | `VN`, `SG` or `HK`, comma-separate several. Keeps only products that have an offer in one of those markets (with or without a price). `market=VN` is the "available in Vietnam" filter. Also restricts which offers count for `lowestPriceVnd`, the price filter and price sorting. All offers are still returned. |
| `minPriceVnd`, `maxPriceVnd` | Price range in VND, inclusive, applied to `lowestPriceVnd`. Products without a `lowestPriceVnd` are left out when either bound is set. |
| `sort` | `newest` (default: most recently added to the catalog), `name` (A to Z), `price_asc`, `price_desc` (by `lowestPriceVnd`; products without a price come last). |
| `page` | Page number, integer >= 1. Default `1`. |
| `limit` | Results per page, integer from 1 to 60. Default `24`. |

Example: `GET /api/products?q=submariner&market=VN,SG&maxPriceVnd=400000000&sort=price_asc`

**Response 200**
```json
{
  "items": [ /* ProductSummary */ ],
  "page": 1,
  "limit": 24,
  "total": 135,
  "totalPages": 6,
  "fx": { /* Fx */ }
}
```

**Errors**
- 400: invalid parameter, e.g. unknown `market` or `sort`, `page` not a positive integer, `limit` above 60, a negative price, `minPriceVnd` greater than `maxPriceVnd`, `q` too long.

### `GET /api/products/:brand/:ref`
One product, for the product detail page. `:brand` is the brand slug and `:ref` the reference code from `ProductSummary` (matched ignoring case and spaces, so `/api/products/rolex/126610ln` also works). URL-encode `:ref`.

**Response 200**
```json
{
  "product": {
    /* every ProductSummary field, plus: */
    "description": "Text from the official product page.",
    "specs": { "Case diameter": "41 mm", "Material": "Oystersteel" },
    "createdAt": "2026-10-01T02:00:00.000Z",
    "updatedAt": "2026-10-12T02:00:00.000Z"
  },
  "fx": { /* Fx */ }
}
```
`specs` is free-form key/value text, as found on the source page.

**Errors**
- 404: no such product.

### `GET /api/products/:brand/:ref/history`
Price history for the chart: one series per source (normally one source per market). History is stored only when a price changes, so draw the original-currency line as a **step line**: each price holds until the next point.

**Query**
| Param | Description |
|---|---|
| `range` | `1y` (default), `5y` or `all` |

**Response 200**
```json
{
  "range": "1y",
  "from": "2025-10-12T09:00:00.000Z",
  "to": "2026-10-12T09:00:00.000Z",
  "series": [
    {
      "market": "SG",
      "source": { "id": "rolex-sg", "name": "Rolex Boutique Singapore", "type": "official" },
      "currency": "SGD",
      "lastSeenAt": "2026-10-12T02:00:00.000Z",
      "points": [
        { "date": "2025-10-12T09:00:00.000Z", "price": 12950, "origin": "crawl", "archiveUrl": null, "carried": true },
        { "date": "2026-03-01T02:00:00.000Z", "price": 13450, "origin": "crawl", "archiveUrl": null, "carried": false }
      ],
      "vnd": [
        { "date": "2025-10-12T09:00:00.000Z", "priceVnd": 245000000 },
        { "date": "2025-10-13T00:00:00.000Z", "priceVnd": 245100000 },
        { "date": "2025-10-14T00:00:00.000Z", "priceVnd": null }
      ]
    }
  ]
}
```
- `from` / `to`: the chart's x-axis. `to` is now. For `all`, `from` is the oldest history point (equal to `to` when there is no history).
- `series`: sorted by market (`VN`, `SG`, `HK`), then source id. Empty when the product has no history yet.
- `source.name` / `source.type`: `null` if the source no longer has a current offer for this product.
- `lastSeenAt`: until when the last price is known to hold. Extend the line from the last point to this date. `null` when the source has no current offer with a price; then the line ends at the last point.
- A source whose line ends before `from` is left out of that range.
- `points`: price changes in the original `currency`, oldest first.
  - `origin`: `crawl` (our daily crawl) or `wayback` (Internet Archive snapshot; `archiveUrl` then links to it, so show it as the source).
  - `carried: true` marks a synthetic first point at `from`: the price that was already in effect when the range starts. All other points are real observations.
- `vnd`: the same series converted to VND for the "VND" toggle, oldest first. Sampled at the first point, then at midnight UTC every day for `1y` or every 7 days for `5y` and `all`, plus at each price change and at the end of the line. Each sample uses the exchange rate of its own day (or the closest earlier day, at most 7 days back), so the VND line moves with exchange rates even when the original price does not. `priceVnd` is `null` where no rate is known: leave a gap in the line there.

**Errors**
- 400: `range` is not `1y`, `5y` or `all`.
- 404: no such product.
