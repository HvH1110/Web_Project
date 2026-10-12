# Sources

Every candidate source for prices, one row per site and market. Only official brand sites and authorized dealers (see `../docs/PRODUCT.md`).

Survey run 2026-10-12 from Vietnam with our own client (`npm run probe -- <url>`): Node `fetch`, honest User-Agent `MaisonPrixBot/0.1 (non-commercial university project; +https://github.com/HvH1110/Web_Project)`, at least 5 s between requests per host. Re-run the probe before writing an adapter: sites change.

**Status values**
- `ready`: page loads for us, price is in the HTML, no adapter yet
- `active`: adapter written and in `npm run crawl`
- `no-price`: the source loads but shows no price
- `blocked`: the site refuses our crawler (bot protection). We don't work around it.
- `todo`: candidate found, not verified yet
- `none`: no official or authorized online source found for this market

## Coverage

| Brand | VN | SG | HK |
|---|---|---|---|
| Louis Vuitton | blocked | blocked | blocked |
| Dior | blocked | blocked | blocked |
| Chanel | blocked | blocked | blocked |
| Cartier | **ready** (`cartier-vn`) | **ready** (`cartier-sg`) | **ready** (`cartier-hk`) |
| Van Cleef & Arpels | blocked | blocked | blocked |
| Rolex | **ready** (`dafc-vn`) | **ready** (`thehourglass-sg`) | todo (dealers listed below) |
| Omega | none | no-price | **ready** (`omega-hk`) |
| IWC | blocked / no-price | blocked | blocked |

## Sources

| Source id | Brand | Market | URL | Type and how verified | Prices shown | robots.txt | Browser | Status |
|---|---|---|---|---|---|---|---|---|
| `cartier-vn` | Cartier | VN | https://www.cartier.com/en-vn/ | official (brand domain) | yes, VND, in JSON-LD `Offer` (e.g. CRL3002764: `VND 11,400,000`) | product paths allowed; disallows `/search/`, `/*/account`, `/*/checkout`, collection filter query strings, contact/appointment forms. No crawl-delay. | n | ready |
| `cartier-sg` | Cartier | SG | https://www.cartier.com/en-sg/ | official | yes, SGD, JSON-LD (`S$ 580` for CRL3002764) | same file as above | n | ready |
| `cartier-hk` | Cartier | HK | https://www.cartier.com/en-hk/ (also `zh-hk`) | official | yes, HKD, JSON-LD (`HK$ 3,200` for CRL3002764) | same file as above | n | ready |
| `omega-hk` | Omega | HK | https://www.omegawatches.com.hk/en-hk/ | official (brand's HK domain, `hreflang` from omegawatches.com) | yes, HKD, JSON-LD `Offer` (210.30.42.20.03.001: 46,800). The page also has offers for related watches: match by SKU. | `omegawatches.com.hk/robots.txt` is 404 (no rules). `omegawatches.com` allows `/`, disallows wishlist, cart, account, `?search=`, `?price=`, filter params. Sitemaps: `sitemap-hk-*.xml` | n | ready |
| `omega-sg` | Omega | SG | https://www.omegawatches.com/ (international) | official | no: no `en-sg` locale exists (404); the international page has no price | as above | n | no-price |
| `cortina-sg` | Omega | SG | https://www.cortinawatch.com/en/omega/ | authorized dealer (Cortina Watch, carries Omega per its brand pages; not cross-checked on Omega's store locator) | no price on Omega product pages | allows all; WooCommerce sitemaps | n | no-price |
| | Omega | VN | none | no `vi-vn` / `en-vn` locale on omegawatches.com; no Vietnamese authorized dealer with an online catalog found | | | | none |
| `rolex-*` | Rolex | all | https://www.rolex.com/ | official | unknown | allows `/watches/`, `Crawl-delay: 2`, disallows search, wishlist, `/content/rolex/`, some dealer sub-pages | | blocked: Akamai `403 Access Denied` on every product page |
| `dafc-vn` | Rolex | VN | https://rolex.dafc.com.vn/rolex/ | authorized dealer: DAFC (Duy Anh Fashion & Cosmetics) is listed on rolex.com's store locator (`/rolex-dealers/duyanhfashioncosmetics-3220/...`); site title "Official Rolex Retailer in Vietnam" | yes, VND, JSON-LD `Offer` + `meta[itemprop=price]` (M52509-0002: 863,260,000) | no rules (allows all). Sitemap `product-sitemap.xml`: 420 URLs (EN + `/vi/`) | n | ready |
| `thehourglass-sg` | Rolex | SG | https://www.thehourglass.com/rolex/ | authorized dealer: The Hour Glass is on rolex.com's store locator (`/rolex-dealers/pmtthehourglass-28/...`) | yes, SGD, JSON-LD (M124060-0001: 14,150). `__NEXT_DATA__` also carries prices for other THG countries, including VND 287,231,000 (The Hour Glass has a Rolex store in Ho Chi Minh City). The VND figure isn't shown on the page we get, so we don't use it until confirmed. | allows all (only `Host` and sitemaps). Rolex sitemap `/rolex/sitemap/rolex.xml`: 261 URLs | n | ready |
| | Rolex | HK | Oriental Watch, Chow Sang Sang, Dickson Watch & Jewellery, Europe Watch, Yes Watch, Fung Leung Kee, Unique Timepieces | authorized dealers per rolex.com dealer pages (seen in search results; rolex.com itself blocks us) | not found yet: orientalwatch.com has no `/rolex/` section; chowsangsang.com loads (`Crawl-delay: 5`) but Rolex pages not checked | | | todo |
| `iwc-*` | IWC | all | https://www.iwc.com/ | official | unknown | unreadable: robots.txt itself returns 403 | | blocked: Akamai `403 Access Denied` on pages and robots.txt |
| `ssgroup-vn` | IWC | VN | http://ssgroup.net/ | authorized distributor: S&S Group runs the IWC boutique at the Metropole Hanoi (Tatler Asia; IWC boutique page) | no: corporate site, no catalog | allows all | n | no-price |
| | IWC | SG | https://www.cortinawatch.com/en/iwc-schaffhausen/ | dealer page redirects to the home page: IWC no longer listed | | | | none |
| `louisvuitton-*` | Louis Vuitton | VN, SG, HK | https://vn.louisvuitton.com/vie-vn/, https://sg.louisvuitton.com/eng-sg/, https://hk.louisvuitton.com/eng-hk/ | official | VN: yes, VND (seen by the user in a normal browser, 2026-10-12). SG/HK: not checked | allows product pages; disallows `mylv/`, search, `sort=`, `utag/`. Product sitemaps are readable (7,134 SG product URLs) | | blocked: Akamai `403` "Access denied. We invite you to return at a later time" on the home page and product pages |
| `dior-*` | Dior | VN, SG, HK | https://www.dior.com/ | official | VN: yes, VND (seen by the user in a normal browser, 2026-10-12). SG/HK: not checked | unreadable: robots.txt itself returns 403 | | blocked: Akamai "Page unavailable" 403 |
| `chanel-*` | Chanel | VN, SG, HK | https://www.chanel.com/ (`/vn/`, `/sg/`, `/hk-en/`) | official | unknown | unreadable: robots.txt itself returns 403 | | blocked: Akamai `403 Access Denied` |
| `vancleefarpels-*` | Van Cleef & Arpels | VN, SG, HK | https://www.vancleefarpels.com/ | official (VN boutique at Union Square HCMC since 2023) | unknown | unreadable: robots.txt itself returns 403 | | blocked: Akamai `403 Access Denied` |

## Notes
- **Blocked sites.** Every blocked site answers our first request with a 403 from Akamai, so this isn't rate limiting. We don't spoof a browser User-Agent and don't run a browser to get past it. Louis Vuitton, Dior, Chanel and Van Cleef & Arpels sell only through their own boutiques, so no authorized dealer can stand in.
- **robots.txt is 403.** RFC 9309 would allow crawling when robots.txt returns 4xx. Our client still treats any non-404 failure as "disallow everything", because here the 403 is the bot wall itself.
- **Ref codes differ by source.** Omega: `210.30.42.20.03.001` (official) vs `310-92-44-51-01-001` (Cortina URL) vs `21030422003001` (official URL). Rolex: `M124060-0001` (both dealers). Cartier: `CRL3002764`. Normalization must make these match. Decide it with the first adapters and record it in `../docs/DATA.md`.
- **Cartier price format.** The JSON-LD `price` is a display string (`S$ 580`, `HK$ 3,200`, `VND 11,400,000`) and must be parsed into a number. Pieces sold "on request" probably have no `Offer`, so they get `price: null`. Not yet verified.
- **Wayback backfill (phase 2).** Blocked brand sites may still have archived product pages. That's a separate source, `origin: wayback`.
