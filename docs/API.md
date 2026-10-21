# API Contract

The single source of truth between `frontend/` and `backend/`.

- **Owner:** backend session. It updates this file whenever an endpoint is added or changed.
- **Reader:** frontend session. It codes against this file.

## Conventions
- Base URL: `http://localhost:5000/api` locally. The frontend reads it from `VITE_API_URL`.
- Paths below include the `/api` prefix.
- JSON request and response bodies.
- Errors: non-2xx status with body `{ "error": { "message": "Human-readable message" } }`.
- Auth: a session cookie (`sid`, httpOnly, so JavaScript can't read it) set by register and login, and cleared by logout. **Every request must be sent with credentials** (`fetch(url, { credentials: 'include' })`, or `withCredentials: true` in axios), otherwise the cookie is neither stored nor sent. Endpoints marked **(login required)** answer **401** `Log in required` without a valid session.
- Requests other than GET are refused with **403** `Cross-origin request refused` when their `Origin` header is not the frontend's origin (CSRF protection; browsers set this header themselves).
- Dates are ISO 8601 strings in UTC, e.g. `"2026-10-12T02:00:00.000Z"`.
- Prices are numbers in major units, exactly as the source shows them (e.g. `13450` SGD). `priceVnd` values are converted and rounded to whole VND.
- Markets: `VN`, `SG`, `HK`. Currencies: `VND`, `SGD`, `HKD`.
- Every endpoint except `/api/health` answers **503** `Database unavailable` while the backend is not connected to MongoDB.

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

### User
The logged-in member, as returned to that member only.
```json
{
  "id": "6720f1c2a1b2c3d4e5f60719",
  "email": "an@example.com",
  "displayName": "Nguyễn An",
  "role": "member",
  "banned": false,
  "createdAt": "2026-10-21T08:00:00.000Z"
}
```
- `displayName`: shown on the forum. 2 to 30 characters: letters (any language), digits, spaces, `.`, `_` and `-`, starting and ending with a letter or digit. Unique, ignoring case.
- `role`: `member`, `moderator` or `admin`. New accounts are `member`. Roles are set by the site owner (`npm run set-role` in `backend/`), not through the API.
- `banned`: `true` when a moderator banned the member from posting. They can still log in and read the forum; hide the "new topic", "reply" and "upload" buttons.

### Deal
One of two kinds (see "What counts as a deal" in `docs/PRODUCT.md`), told apart by `type`. Every deal has `type`, `product` (a ProductSummary) and `savingPct` (percentage saved, rounded to 2 decimals, always > 0).

**`market`: cheapest market.** Buying the product in its cheapest market instead of its most expensive one, comparing current prices in VND.
```json
{
  "type": "market",
  "product": { /* ProductSummary */ },
  "savingPct": 12.35,
  "cheapest": { "market": "HK", "priceVnd": 238000000, "offer": { /* Offer */ } },
  "dearest": { "market": "VN", "priceVnd": 271500000, "offer": { /* Offer */ } }
}
```
- `savingPct` = (dearest − cheapest) / dearest × 100.
- Each market is represented by its cheapest offer. Needs offers with a `priceVnd` in at least two markets, so SGD and HKD prices only count once exchange rates are stored.
- Based on current prices, so the same market deals appear for every `period`.

**`drop`: price drop.** The current price is lower than the price in effect at the start of the period, in the source's own currency (rare) or in VND (usually because of exchange-rate moves).
```json
{
  "type": "drop",
  "product": { /* ProductSummary */ },
  "savingPct": 1.8,
  "market": "SG",
  "currency": "SGD",
  "priceThen": 13450,
  "priceNow": 13450,
  "priceVndThen": 255555000,
  "priceVndNow": 250955000,
  "since": "2026-09-30T17:00:00.000Z",
  "offer": { /* Offer */ }
}
```
- `priceThen` / `priceNow`: in `currency`. `priceThen` is the last recorded price at or before `since`.
- `priceVndThen` uses the exchange rate at `since` (closest earlier day, at most 7 days back); `priceVndNow` uses the latest rate (see `fx`). Either is `null` when no rate is known.
- `savingPct`: the larger of the drop in `currency` and the drop in VND.
- `offer`: the current offer, for the "where to buy" link.
- At most one drop deal per product and market (if a market has several sources, the one with the biggest drop).
- A product whose first recorded price is after `since` has nothing to compare against, so it has no drop deal for that period.

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

### `GET /api/deals`
Deals for the Deals page, ranked by `savingPct`, highest first.

**Query** (all optional)
| Param | Description |
|---|---|
| `period` | `today` (default), `month` or `year`: since the start of the current day, month or year **in Vietnam time (UTC+7)**. Only affects `drop` deals. |
| `type` | `market` or `drop`. Without it, both kinds share one ranking, and a product can appear once as a `market` deal and once per market as a `drop` deal. |
| `page` | Page number, integer >= 1. Default `1`. |
| `limit` | Results per page, integer from 1 to 60. Default `24`. |

Example: `GET /api/deals?period=month&type=drop`

**Response 200**
```json
{
  "period": "month",
  "since": "2026-09-30T17:00:00.000Z",
  "items": [ /* Deal */ ],
  "page": 1,
  "limit": 24,
  "total": 18,
  "totalPages": 1,
  "fx": { /* Fx */ }
}
```
- `since`: the start of the period (here 1 October 2026, 00:00 in Vietnam).
- While `fx` is `null` there are no `market` deals across currencies, and SGD and HKD drops are found only in their own currency.

**Errors**
- 400: `period` or `type` is not an allowed value, `page` is not a positive integer, or `limit` is outside 1 to 60.

## Accounts

A session lasts 30 days from login, then the member has to log in again. Too many attempts from one network or for one email answer **429** `Too many attempts, try again later`, with a `Retry-After` header in seconds.

### `POST /api/auth/register`
Creates an account and logs it in (sets the session cookie).

**Request**
```json
{ "email": "an@example.com", "password": "at least 8 characters", "displayName": "Nguyễn An" }
```
- `email`: a valid address, at most 254 characters. Stored in lowercase.
- `password`: 8 to 128 characters. No other rules.
- `displayName`: see User.

**Response 201**
```json
{ "user": { /* User */ } }
```

**Errors**
- 400: a field is missing or invalid (the message says which).
- 409: `An account with this email already exists`, or `This display name is taken`.
- 429: more than 10 registrations from one IP address in an hour.

### `POST /api/auth/login`
Logs in (sets the session cookie, replacing any previous session in this browser).

**Request**
```json
{ "email": "an@example.com", "password": "…" }
```

**Response 200**
```json
{ "user": { /* User */ } }
```

**Errors**
- 400: `email` or `password` missing.
- 401: `Email or password is incorrect` (the same message whether or not the email has an account).
- 429: more than 10 attempts for one email, or 30 from one IP address, in 15 minutes.

### `POST /api/auth/logout`
Ends the current session and clears the cookie. No request body. Safe to call when not logged in.

**Response 204** (no body)

### `GET /api/me`
The logged-in member, or `null` (not an error) when not logged in. Call it on page load to know whether to show "Log in" or the member's name.

**Response 200**
```json
{ "user": { /* User */ } }
```
or
```json
{ "user": null }
```

### `PATCH /api/me` (login required)
Updates the profile. Only `displayName` can be changed for now.

**Request**
```json
{ "displayName": "An Nguyễn" }
```

**Response 200**
```json
{ "user": { /* User */ } }
```

**Errors**
- 400: no `displayName`, or it is invalid.
- 401: not logged in.
- 409: `This display name is taken`.

### `PUT /api/me/password` (login required)
Changes the password. Logs out every other session of this member; the current one stays logged in.

**Request**
```json
{ "currentPassword": "…", "newPassword": "at least 8 characters" }
```

**Response 204** (no body)

**Errors**
- 400: a field is missing, or `newPassword` is not 8 to 128 characters.
- 401: not logged in.
- 403: `Current password is incorrect` (still logged in).
- 429: more than 10 attempts in 15 minutes.

## Forum

Members only: **every forum endpoint is (login required)**, reading included, and answers **401** `Log in required` without a session.

- Text is plain text: no HTML or Markdown. Render it as text (never as HTML) and keep newlines (e.g. `white-space: pre-wrap`). The server normalizes it: trims, turns `\r\n` into `\n`, collapses 3+ blank lines into one, and drops control characters.
- Lengths count characters, not bytes.
- IDs are 24-character hex strings. A malformed ID answers 404, like an unknown one.
- **Images:** upload each file first with `POST /api/forum/uploads`, then send the returned `id`s in a post's `images` list (at most 4, in display order). An upload can be used by one post only. Uploads not used in a post within 24 hours are deleted.
- **Hidden posts:** a moderator can hide a topic or reply. Only moderators and the post's author still see it, with `hidden` set; for everyone else it is gone (404 or left out of lists).
- **Banned members** can read but not post: creating topics, replies or uploads, and editing, answer **403** `Your account is banned from posting`. They can still delete their own posts.
- Too many posts answer **429** `Too many attempts, try again later` with `Retry-After` (limits per member: 10 topics an hour, 30 replies in 15 minutes, 40 uploads an hour).
- Each topic and reply has `permissions`, so the frontend shows only the buttons that will work. The server checks again on every request.

### Forum types

#### ForumAuthor
```json
{ "id": "6720f1c2a1b2c3d4e5f60719", "displayName": "Nguyễn An", "role": "member" }
```
Show a "Moderator" or "Admin" badge from `role`. `author` is `null` when the account no longer exists.

#### ForumImage
```json
{ "id": "6720f2aa0b1c2d3e4f506172", "url": "http://localhost:5000/api/uploads/forum/9f2c4e0b7a1d3c5e8f6a2b4c6d8e0f1a.webp", "width": 1600, "height": 1200 }
```
- Always WebP, at most 2048 px on its longest side. Photo metadata (camera, GPS location) is removed.
- `url` is absolute; use it as is. Image URLs are public (anyone with the link can load them), but unguessable.
- `width` / `height`: use them to reserve space (`aspect-ratio`) before the image loads.

#### Hidden
`null` for visible posts, otherwise:
```json
{ "at": "2026-10-21T09:00:00.000Z", "reason": "Off-topic" }
```
`reason` may be `null`.

#### TopicSummary
An item of the topic list.
```json
{
  "id": "6720f3b10c1d2e3f40516273",
  "title": "Rolex Submariner: buy in Hong Kong or Singapore?",
  "excerpt": "The SG price looks lower after the latest rate change, but…",
  "brand": { "slug": "rolex", "name": "Rolex" },
  "author": { /* ForumAuthor */ },
  "thumbnail": { /* ForumImage */ },
  "imageCount": 2,
  "replyCount": 5,
  "pinned": false,
  "locked": false,
  "hidden": null,
  "createdAt": "2026-10-21T08:30:00.000Z",
  "lastActivityAt": "2026-10-21T10:12:00.000Z"
}
```
- `excerpt`: the start of the body on one line, at most 200 characters (ending with `…` when cut).
- `brand`: the brand the topic is about, or `null`.
- `thumbnail`: the first image, or `null`.
- `replyCount`: visible replies (hidden ones are not counted).
- `lastActivityAt`: when the topic or its latest reply was posted.

#### Topic
```json
{
  "id": "6720f3b10c1d2e3f40516273",
  "title": "Rolex Submariner: buy in Hong Kong or Singapore?",
  "body": "The SG price looks lower after the latest rate change, but…\n\nAnyone bought there recently?",
  "brand": { "slug": "rolex", "name": "Rolex" },
  "author": { /* ForumAuthor */ },
  "images": [ /* ForumImage */ ],
  "replyCount": 5,
  "pinned": false,
  "locked": false,
  "hidden": null,
  "createdAt": "2026-10-21T08:30:00.000Z",
  "editedAt": null,
  "lastActivityAt": "2026-10-21T10:12:00.000Z",
  "permissions": { "edit": true, "delete": true, "reply": true, "moderate": false }
}
```
- `editedAt`: when the author last edited it, or `null`. Show "edited".
- `locked`: no new replies or edits, except by moderators.
- `permissions.edit`: the viewer is the author, is not banned, and the topic is neither locked nor hidden (moderators can still edit their own).
- `permissions.delete`: the viewer is the author or a moderator.
- `permissions.reply`: the viewer is not banned, and the topic is neither locked nor hidden (moderators can always reply).
- `permissions.moderate`: the viewer is a moderator or admin (show pin, lock and hide controls).

#### Reply
```json
{
  "id": "6720f4c20d1e2f3041526374",
  "topicId": "6720f3b10c1d2e3f40516273",
  "body": "Bought mine at the Pacific Place boutique in August.",
  "author": { /* ForumAuthor */ },
  "images": [ /* ForumImage */ ],
  "hidden": null,
  "createdAt": "2026-10-21T10:12:00.000Z",
  "editedAt": null,
  "permissions": { "edit": true, "delete": true, "moderate": false }
}
```
- `body` can be `""` when the reply has images.
- `permissions` as for Topic (edit also needs the reply itself not hidden).

### `GET /api/forum/topics` (login required)
The topic list.

**Query** (all optional)
| Param | Description |
|---|---|
| `q` | Search words. Every word must appear in the title or body, ignoring case and accents. |
| `brand` | Brand slug, e.g. `rolex`. |
| `author` | Member ID: only that member's topics (e.g. "My topics" with the logged-in User's `id`). |
| `sort` | `activity` (default): pinned topics first, then latest activity first. `newest`: newest topics first, pinned ones not lifted. |
| `page` | Integer >= 1. Default `1`. |
| `limit` | Integer from 1 to 50. Default `20`. |

**Response 200**
```json
{ "items": [ /* TopicSummary */ ], "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
```

**Errors**
- 400: `sort` is not an allowed value, `author` is not an ID, `page` is not a positive integer, or `limit` is outside 1 to 50.

### `POST /api/forum/topics` (login required)
Creates a topic.

**Request**
```json
{ "title": "Rolex Submariner: buy in Hong Kong or Singapore?", "body": "…", "brand": "rolex", "images": ["6720f2aa0b1c2d3e4f506172"] }
```
- `title`: 5 to 120 characters, one line (newlines become spaces).
- `body`: 1 to 10,000 characters.
- `brand`: optional brand slug.
- `images`: optional, at most 4 upload IDs of the member's own unused uploads.

**Response 201**
```json
{ "topic": { /* Topic */ } }
```

**Errors**
- 400: a field is missing or invalid; `brand is not a known brand slug`; `An image was not found, is not yours, or is already used in another post`.
- 403: banned.
- 429: more than 10 topics in an hour.

### `GET /api/forum/topics/:id` (login required)
**Response 200**
```json
{ "topic": { /* Topic */ } }
```

**Errors**
- 404: `Topic not found` (also when hidden and the viewer is neither its author nor a moderator).

### `PATCH /api/forum/topics/:id` (login required)
The author edits the topic. Send only the fields to change, at least one.

**Request**
```json
{ "title": "…", "body": "…", "brand": null, "images": ["6720f2aa0b1c2d3e4f506172", "6720f2ab0b1c2d3e4f506173"] }
```
- Same rules as when creating. `brand: null` removes the brand.
- `images` replaces the whole list: keep the IDs of current images to keep, add new upload IDs, leave out the ones to remove. Removed images are deleted.

**Response 200**
```json
{ "topic": { /* Topic */ } }
```

**Errors**
- 400: nothing to update, or a field is invalid.
- 403: `Only the author can edit this post`, `This topic is locked`, `This post was hidden by a moderator`, or banned.
- 404: `Topic not found`.

### `DELETE /api/forum/topics/:id` (login required)
The author or a moderator deletes the topic, **with all its replies and images**. Permanent.

**Response 204** (no body)

**Errors**
- 403: `Only the author or a moderator can delete this topic`.
- 404: `Topic not found`.

### `GET /api/forum/topics/:id/replies` (login required)
The topic's replies, oldest first.

**Query** (optional): `page` (default `1`), `limit` (1 to 100, default `50`).

**Response 200**
```json
{ "items": [ /* Reply */ ], "page": 1, "limit": 50, "total": 5, "totalPages": 1 }
```
`total` counts the replies this viewer sees, so for moderators it can be higher than the topic's `replyCount`.

**Errors**
- 400: bad `page` or `limit`.
- 404: `Topic not found`.

### `POST /api/forum/topics/:id/replies` (login required)
Replies to a topic.

**Request**
```json
{ "body": "Bought mine at the Pacific Place boutique in August.", "images": [] }
```
- `body`: up to 5,000 characters. Optional when `images` has at least one ID.
- `images`: optional, as for topics.

**Response 201**
```json
{ "reply": { /* Reply */ } }
```

**Errors**
- 400: `A reply needs body text or at least one image`, or a field is invalid.
- 403: `This topic is locked`, `This topic was hidden by a moderator`, or banned.
- 404: `Topic not found`.
- 429: more than 30 replies in 15 minutes.

### `PATCH /api/forum/replies/:id` (login required)
The author edits a reply. Send `body`, `images` or both (same rules as when replying; `images` replaces the list as for topics). The reply must still have text or an image.

**Response 200**
```json
{ "reply": { /* Reply */ } }
```

**Errors**
- 400: nothing to update, the reply would be empty, or a field is invalid.
- 403: as for editing a topic.
- 404: `Reply not found`.

### `DELETE /api/forum/replies/:id` (login required)
The author or a moderator deletes a reply and its images. Permanent.

**Response 204** (no body)

**Errors**
- 403: `Only the author or a moderator can delete this reply`.
- 404: `Reply not found`.

### `POST /api/forum/uploads` (login required)
Uploads one image for a later topic or reply.

**Request:** `multipart/form-data` with the file in the field **`image`**, and no other fields. Don't set the `Content-Type` header yourself; the browser adds the boundary:
```js
const form = new FormData();
form.append('image', file);
await fetch(`${API_URL}/forum/uploads`, { method: 'POST', body: form, credentials: 'include' });
```
- JPEG, PNG, WebP, GIF (first frame only) or AVIF; at most 10 MB and 50 megapixels. HEIC (iPhone photos) is refused. Use `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif">`: with it, Safari on iPhone usually converts HEIC photos to JPEG before uploading.

**Response 201**
```json
{ "upload": { /* ForumImage */ } }
```
Show it as a preview, and send its `id` in the post's `images`.

**Errors**
- 400: no file, more than one file, or `image must be a JPEG, PNG, WebP, GIF or AVIF file` / `HEIC images are not supported; send a JPEG or PNG` / `image must be at most 50 megapixels` / `image could not be read`.
- 403: banned.
- 413: `image must be at most 10 MB`.
- 429: more than 40 uploads in an hour.

### Moderation (moderator or admin)
These answer **403** `Moderators only` for other members.

#### `PATCH /api/forum/topics/:id/moderation`
**Request:** any of these, at least one of `pinned`, `locked`, `hidden`:
```json
{ "pinned": true, "locked": true, "hidden": true, "reason": "Off-topic" }
```
- `reason`: optional, up to 200 characters, stored when hiding and shown to the author.

**Response 200:** `{ "topic": { /* Topic */ } }`

**Errors:** 400 (nothing to change, or not a boolean), 404 `Topic not found`.

#### `PATCH /api/forum/replies/:id/moderation`
**Request**
```json
{ "hidden": true, "reason": "Personal information" }
```

**Response 200:** `{ "reply": { /* Reply */ } }`

**Errors:** 400 (`hidden` missing or not a boolean), 404 `Reply not found`.

#### `PATCH /api/forum/members/:id/moderation`
Bans a member from posting, or lifts the ban (`banned: false`). `:id` is the ForumAuthor `id`.

**Request**
```json
{ "banned": true, "reason": "Spam" }
```

**Response 200**
```json
{
  "member": {
    "id": "6720f1c2a1b2c3d4e5f60719",
    "displayName": "Nguyễn An",
    "role": "member",
    "banned": true,
    "bannedAt": "2026-10-21T11:00:00.000Z",
    "banReason": "Spam"
  }
}
```

**Errors**
- 400: `banned` missing or not a boolean.
- 403: `You cannot moderate your own account`, `Admins cannot be banned`, or `Only an admin can ban a moderator`.
- 404: `Member not found`.
