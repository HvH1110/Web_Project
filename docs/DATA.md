# Data contract (catalog)

MongoDB Atlas collections written by the **crawler** and read by the **backend**.

- **Owner:** crawler session. It updates this file in the same change as the crawler code.
- **Backend:** reads these collections and never writes to them. Collections the backend owns (`brands`, users, forum) are not described here, apart from the brand slug used to link products.
- This is a first draft. The crawler session refines it after the source survey.

Atlas free tier (M0) has 512 MB of storage, so history is stored as **price changes**, not daily copies.

## Conventions
- `brand`: brand slug, e.g. `louis-vuitton`, `dior`, `chanel`, `cartier`, `van-cleef-arpels`, `rolex`, `omega`, `iwc`. The backend's `brands` collection uses the same slugs.
- `market`: `VN` | `SG` | `HK`
- `currency`: `VND` | `SGD` | `HKD`
- Prices are numbers in major units (e.g. `13450` SGD), exactly as shown on the source page.
- All dates are UTC.

## `products`
One document per real product, shared across markets.

| Field | Type | Notes |
|---|---|---|
| `brand` | string | brand slug |
| `ref` | string | brand's reference / style code, normalized (uppercase, no spaces). Matching key across markets. Unique together with `brand`. |
| `name` | string | |
| `category` | string | `bags`, `accessories`, `shoes`, `clothing`, `jewelry`, `watches` (extend here if needed) |
| `collection` | string? | e.g. `Neverfull`, `Lady Dior`, `Love`, `Submariner` |
| `description` | string | |
| `specs` | object | free-form key/value: material, dimensions, case size, movement… |
| `images` | `[{ url, sourceId, alt }]` | 2 to 4, original URLs plus credit |
| `createdAt`, `updatedAt` | date | |

Indexes: unique `{ brand: 1, ref: 1 }`; text index on `name`, `collection`, `ref`.

## `offers`
The current price of a product at one source. One document per product per source.

| Field | Type | Notes |
|---|---|---|
| `productId` | ObjectId | → `products` |
| `source` | `{ id, name, type, market }` | `id` e.g. `rolex-sg`; `type` `official` or `authorized-dealer` |
| `url` | string | product page; the "where to buy" link |
| `currency` | string | |
| `price` | number \| null | null when the page shows no price |
| `available` | boolean \| null | null when unknown |
| `lastSeenAt` | date | last successful crawl of this page |

Indexes: unique `{ productId: 1, "source.id": 1 }`; `{ "source.market": 1 }`.

## `price_points`
Price history. A new point is added only when the price changes (or the first time a price is seen).

| Field | Type | Notes |
|---|---|---|
| `productId` | ObjectId | |
| `sourceId` | string | |
| `market` | string | |
| `currency` | string | |
| `price` | number | |
| `observedAt` | date | |
| `origin` | `crawl` \| `wayback` | |
| `archiveUrl` | string? | Wayback snapshot URL, for `wayback` only |

Index: `{ productId: 1, market: 1, observedAt: 1 }`.

## `fx_rates`
One document per day.

| Field | Type | Notes |
|---|---|---|
| `date` | string `YYYY-MM-DD` | unique |
| `vndPer` | `{ SGD, HKD, USD }` | VND for 1 unit of each currency |
| `source` | string | where the rate came from |
