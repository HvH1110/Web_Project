# Sources

Every candidate source for prices, one row per site and market. Only official brand sites and authorized dealers (see `../docs/PRODUCT.md`).

Survey run 2026-10-12 from Vietnam with our own client (`npm run probe -- <url>`): Node `fetch`, honest User-Agent `MaisonPrixBot/0.1 (non-commercial university project; +https://github.com/HvH1110/Web_Project)`, at least 5 s between requests per host. Re-run the probe before writing an adapter: sites change.

**Status values**
- `ready`: page loads for us, price is in the HTML, no adapter yet
- `active`: adapter written and in `npm run crawl`
- `no-price`: the source loads but shows no price
- `blocked`: the site refuses our crawler (bot protection). We don't work around it.
- `archive`: the live site blocks us, but the Internet Archive has its product pages: price **history** from Wayback snapshots (`npm run backfill`), no current price
- `todo`: candidate found, not verified yet
- `none`: no official or authorized online source found for this market

## Coverage

| Brand | VN | SG | HK |
|---|---|---|---|
| Louis Vuitton | blocked | **archive** (`louisvuitton-sg`) | **archive** (`louisvuitton-hk`) |
| Dior | blocked (nothing archived) | **archive** (`dior-sg`) | **archive** (`dior-hk`) |
| Chanel | blocked | blocked | blocked |
| Cartier | **active** (`cartier-vn`) | **active** (`cartier-sg`) | **active** (`cartier-hk`) |
| Van Cleef & Arpels | blocked | blocked | blocked |
| Rolex | **active** (`dafc-vn`) | **active** (`thehourglass-sg`) | todo (dealers listed below) |
| Omega | none | no-price | **ready** (`omega-hk`; site in maintenance 2026-10-21) |
| IWC | blocked / no-price | **archive** (`iwc-sg`) | **archive** (`iwc-hk`) |

## Sources

| Source id | Brand | Market | URL | Type and how verified | Prices shown | robots.txt | Browser | Status |
|---|---|---|---|---|---|---|---|---|
| `cartier-vn` | Cartier | VN | https://www.cartier.com/en-vn/ | official (brand domain) | yes, VND, in JSON-LD `Offer` (e.g. L3002764: `VND 11,400,000`). No online shop in VN, so stock is not meaningful (`available: null`) | product paths allowed; disallows `/search/`, `/*/account`, `/*/checkout`, collection filter query strings, contact/appointment forms. No crawl-delay. Sitemap `/en-vn.sitemap.xml`: 1,634 tracked products | n | active |
| `cartier-sg` | Cartier | SG | https://www.cartier.com/en-sg/ | official | yes, SGD, JSON-LD (`S$ 580` for L3002764). Online shop: `available` is its stock flag | same file as above. 1,486 tracked products | n | active |
| `cartier-hk` | Cartier | HK | https://www.cartier.com/en-hk/ (also `zh-hk`) | official | yes, HKD, JSON-LD (`HK$ 3,200` for L3002764). Online shop: `available` is its stock flag | same file as above. 1,485 tracked products | n | active |
| `omega-hk` | Omega | HK | https://www.omegawatches.com.hk/en-hk/ | official (brand's HK domain, `hreflang` from omegawatches.com) | yes, HKD, JSON-LD `Offer` (210.30.42.20.03.001: 46,800). The page also has offers for related watches: match by SKU. | `omegawatches.com.hk/robots.txt` is 404 (no rules). `omegawatches.com` allows `/`, disallows wishlist, cart, account, `?search=`, `?price=`, filter params. Sitemaps: `sitemap-hk-*.xml` | n | ready. 2026-10-21: the whole site (also omegawatches.com) answers 503 "Maintenance - Service unavailable", robots.txt included; retry later |
| `omega-sg` | Omega | SG | https://www.omegawatches.com/ (international) | official | no: no `en-sg` locale exists (404); the international page has no price | as above | n | no-price |
| `cortina-sg` | Omega | SG | https://www.cortinawatch.com/en/omega/ | authorized dealer (Cortina Watch, carries Omega per its brand pages; not cross-checked on Omega's store locator) | no price on Omega product pages | allows all; WooCommerce sitemaps | n | no-price |
| | Omega | VN | none | no `vi-vn` / `en-vn` locale on omegawatches.com; no Vietnamese authorized dealer with an online catalog found | | | | none |
| `rolex-*` | Rolex | all | https://www.rolex.com/ | official | unknown | allows `/watches/`, `Crawl-delay: 2`, disallows search, wishlist, `/content/rolex/`, some dealer sub-pages | | blocked: Akamai `403 Access Denied` on every product page |
| `dafc-vn` | Rolex | VN | https://rolex.dafc.com.vn/rolex/ | authorized dealer: DAFC (Duy Anh Fashion & Cosmetics) is listed on rolex.com's store locator (`/rolex-dealers/duyanhfashioncosmetics-3220/...`); site title "Official Rolex Retailer in Vietnam" | yes, VND, JSON-LD `Offer` (M52509-0002: 863,260,000), "suggested retail price inclusive of VAT". No stock shown (`available: null`) | no rules (allows all). Sitemap `product-sitemap.xml`: 420 URLs, 210 watches (EN + `/vi/`) | n | active |
| `thehourglass-sg` | Rolex | SG | https://www.thehourglass.com/rolex/ | authorized dealer: The Hour Glass is on rolex.com's store locator (`/rolex-dealers/pmtthehourglass-28/...`) | yes, SGD, JSON-LD (M124060-0001: 14,150). `__NEXT_DATA__` also carries prices for other THG countries, including VND 287,231,000 (The Hour Glass has a Rolex store in Ho Chi Minh City). The VND figure isn't shown on the page we get, so we don't use it until confirmed. | allows all (only `Host` and sitemaps). Rolex sitemap `/rolex/sitemap/rolex.xml`: 261 URLs | n | active. The page shows SGD (locale `en-SG`), same as its JSON-LD offer; the other countries' prices in `__NEXT_DATA__` are ignored. 200 watches; 128 match DAFC models |
| | Rolex | HK | Oriental Watch, Chow Sang Sang, Dickson Watch & Jewellery, Europe Watch, Yes Watch, Fung Leung Kee, Unique Timepieces | authorized dealers per rolex.com dealer pages (seen in search results; rolex.com itself blocks us) | not found yet: orientalwatch.com has no `/rolex/` section; chowsangsang.com loads (`Crawl-delay: 5`) but Rolex pages not checked | | | todo |
| `iwc-*` | IWC | all | https://www.iwc.com/ | official | unknown | unreadable: robots.txt itself returns 403 | | blocked: Akamai `403 Access Denied` on pages and robots.txt |
| `ssgroup-vn` | IWC | VN | http://ssgroup.net/ | authorized distributor: S&S Group runs the IWC boutique at the Metropole Hanoi (Tatler Asia; IWC boutique page) | no: corporate site, no catalog | allows all | n | no-price |
| | IWC | SG | https://www.cortinawatch.com/en/iwc-schaffhausen/ | dealer page redirects to the home page: IWC no longer listed | | | | none |
| `louisvuitton-*` | Louis Vuitton | VN, SG, HK | https://vn.louisvuitton.com/vie-vn/, https://sg.louisvuitton.com/eng-sg/, https://hk.louisvuitton.com/eng-hk/ | official | VN: yes, VND (seen by the user in a normal browser, 2026-10-12). SG/HK: not checked | allows product pages; disallows `mylv/`, search, `sort=`, `utag/`. Product sitemaps are readable (7,134 SG product URLs) | | blocked: Akamai `403` "Access denied. We invite you to return at a later time" on the home page and product pages |
| `louisvuitton-sg`, `louisvuitton-hk` | Louis Vuitton | SG, HK | Wayback snapshots of https://sg.louisvuitton.com/eng-sg/products/…, https://hk.louisvuitton.com/eng-hk/products/… | official pages, archived by the Internet Archive | yes in archived pages: JSON-LD Offer (M12929: SGD 11,000, Dec 2025). Category from breadcrumbs or the page title | web.archive.org has no robots.txt (404); we stay at 1 request / 5 s and stop on 429/503 | n | archive |
| `dior-sg`, `dior-hk` | Dior | SG, HK | Wayback snapshots of https://www.dior.com/en_sg/fashion/products/…, `/en_hk/` (and older `/products/couture-…` URLs) | official pages, archived | yes from about 2023: JSON-LD Offer (M0538ONGE_M27V: SGD 9,300, Apr 2024). 2022 snapshots have the price only in analytics data, which we don't use | as above | n | archive |
| `iwc-sg`, `iwc-hk` | IWC | SG, HK | Wayback snapshots of https://www.iwc.com/sg/en/watch-collections/…, `/hk/en/` | official pages, archived | yes from about 2023: microdata and `data-product-price` (IW545901: S$ 110,000, Jun 2024); 2022 snapshots show no price | as above | n | archive |
| | Dior | VN | | | no `vi_vn` product pages in the archive | | | blocked |
| `dior-*` | Dior | VN, SG, HK | https://www.dior.com/ | official | VN: yes, VND (seen by the user in a normal browser, 2026-10-12). SG/HK: not checked | unreadable: robots.txt itself returns 403 | | blocked: Akamai "Page unavailable" 403 |
| `chanel-*` | Chanel | VN, SG, HK | https://www.chanel.com/ (`/vn/`, `/sg/`, `/hk-en/`) | official | unknown | unreadable: robots.txt itself returns 403 | | blocked: Akamai `403 Access Denied` |
| `vancleefarpels-*` | Van Cleef & Arpels | VN, SG, HK | https://www.vancleefarpels.com/ | official (VN boutique at Union Square HCMC since 2023) | unknown | unreadable: robots.txt itself returns 403 | | blocked: Akamai `403 Access Denied` |

## Notes
- **Blocked sites.** Every blocked site answers our first request with a 403 from Akamai, so this isn't rate limiting. We don't spoof a browser User-Agent and don't run a browser to get past it. Louis Vuitton, Dior, Chanel and Van Cleef & Arpels sell only through their own boutiques, so no authorized dealer can stand in.
- **robots.txt is 403.** RFC 9309 would allow crawling when robots.txt returns 4xx. Our client still treats any non-404 failure as "disallow everything", because here the 403 is the bot wall itself.
- **Ref codes.** Per-brand formats are in `../docs/DATA.md` (Rolex `M124060-0001`, Cartier `L3002764`). Still open for Omega, whose sources disagree: `210.30.42.20.03.001` (official) vs `310-92-44-51-01-001` (Cortina URL) vs `21030422003001` (official URL). Decide it with the first Omega adapter.
- **Cartier.** The JSON-LD `price` is a display string (`S$ 580`, `HK$ 3,200`, `VND 11,400,000`), parsed into a number. A page without an `Offer` gives `price: null`. In scope: jewellery, watches, bags, small leather goods (not fragrances, eyewear, pens or home). About 4,600 product pages over three markets on one host is too many for a daily run, so each product is re-checked once every `CARTIER_ROTATION_DAYS` (default 7) days: about 660 pages, roughly 55 minutes, per run. A price change can therefore show up to a week late; `offers.lastSeenAt` says when each price was last checked. Some SG/HK `specs.Material` values come in French from Cartier's own data.
- **Daily run time** with the defaults (5 s between requests per host): DAFC about 18 minutes, Cartier about 55 minutes.
- **Wayback backfill** (`npm run backfill`). For brands whose live site blocks us, the Internet Archive has many archived product pages (tens of thousands each for LV SG/HK, thousands for Dior SG/HK, over a thousand each for IWC SG/HK, from 2020 on). They give price **history** only: products and `price_points` with `origin: wayback` and the snapshot link, never an offer, because an archived price is not today's price. We take only the price in the product's own markup (JSON-LD Offer, microdata), not analytics data. One snapshot per page per quarter (prices change a few times a year at most), newest first, about 500 per run (all on one host: web.archive.org). The capture index (CDX) is slow and often answers 503/504: it is asked one year at a time (one quarter at a time, 1,000 results per request instead of 5,000, when a year times out), history starts at 2020 (older pages are mostly products no longer sold), a busy answer gets one retry after a minute, and the run stops if it stays busy. Chanel SG (2019–2021) and Van Cleef & Arpels SG (2020–2021) also have archived pages; not checked for prices yet.
