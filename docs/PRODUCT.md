# Product spec

**Name:** Maison Prix
**Tagline:** Know the price before you step inside.

Every session reads this file before starting a feature. Only the user decides changes to it.

## Why
In Vietnam, many luxury houses don't publish their prices. Buyers have to walk into a boutique or trust resellers and social media. This site collects **official** prices from brand stores and authorized dealers in Vietnam, Singapore and Hong Kong, shows them side by side, and tracks how they change over time.

## Scope

### Brands (first set)
| Category | Brands |
|---|---|
| Fashion & leather goods | Louis Vuitton, Dior, Chanel |
| Jewelry | Cartier, Van Cleef & Arpels |
| Watches | Rolex, Omega, IWC |

### Markets
Vietnam (VND), Singapore (SGD), Hong Kong (HKD). Prices are shown in their original currency and converted to VND.

### Data rules
- Sources are only official brand websites and authorized dealers. No resellers, marketplaces or grey-market sites, even if they are easier to crawl.
- Every price records its source (store + URL) and the date it was seen.
- Per product: name, brand reference code, category, collection, description, specs, 2 to 4 images, current price per market, price history.

## Pages
1. **Home**: editorial, luxury-house look, inspired by the JW Anderson, Louis Vuitton and Dior websites: full-bleed imagery, generous whitespace, serif display type, a restrained black / white / neutral palette, subtle motion. One section per brand: short history, key facts, signature products. Take inspiration from the layout; don't copy their logos or assets.
2. **Brand page** (`/brands/:slug`): history, signature products, all tracked products.
3. **Search**: text search plus filters (brand, category, collection, market, price range in VND, available in Vietnam). Each result shows the price per market and where to buy it (link to the official store or dealer page).
4. **Product detail**: image gallery, description, specs, current price per market with where-to-buy links, and a **price history line chart** like Chrono24 (one line per market, VND or original currency, range 1Y / 5Y / All).
5. **Deals**: tabs for Today, This month, This year (see "What counts as a deal").
6. **Community**: members-only forum. Members create topics and reply with text and images.
7. **Account**: register, log in, log out, profile.

### What counts as a deal
Official luxury prices almost never go down; brands raise them a few times a year. So a "deal" here means one of:
- **Cheapest market:** the biggest gap between the cheapest and the most expensive market for the same item, after converting to VND.
- **Price drop:** the current price is lower than at the start of the period (day, month, year), either in its own currency (rare) or in VND because of exchange-rate moves.

Deals are ranked by percentage saved.

## Price history
- **Daily crawls from now on** are the main source. History grows every day.
- **Backfill from the Internet Archive (Wayback Machine)** snapshots of the same official product pages, best effort. Expect gaps for 2015 to 2025: many pages were never archived, and on many sites the price loads with JavaScript and was not captured.
- Each history point records where it came from (`crawl` or `wayback`).
- Exchange rates are stored per day, so a 2018 SGD price is converted at the 2018 rate, not today's.

## Phases
1. **Catalog**: source survey, first crawl adapters, brands/products/search API, new luxury design system, home, brand, search and product pages, daily crawl schedule.
2. **History & deals**: Wayback backfill, exchange rates, more sources, price chart, deals page.
3. **Community**: accounts (hashed passwords, httpOnly cookie sessions), forum with image uploads, basic moderation.
4. **Launch**: deployment, domain, SEO, performance, accessibility.

## Legal & ethics (non-commercial university project)
- Footer disclaimer: not affiliated with any brand; prices are indicative, always confirm with the official store.
- Crawl politely: respect robots.txt and site terms, slow request rate, no logins, no bypassing CAPTCHAs or bot protection. If a source blocks us, drop it and find another official source.
- Brand names and logos are trademarks, and product images belong to their owners. Always credit and link the source.
