The REST API behind [maison-prix.vercel.app](https://maison-prix.vercel.app). The website calls it at `/api` on its own address; Vercel forwards those requests to the Express server on Render. The full contract, with every rule, is `docs/API.md` in the repository.

- **Format:** JSON request and response bodies, except the sitemap (XML) and image uploads (`multipart/form-data`).
- **Errors:** a status code of 400 or above, with the body `{ "error": { "message": "Human-readable message" } }`.
- **Login:** register and login set a session cookie, `sid` (`httpOnly`, so JavaScript can't read it). Send every request with credentials (`fetch(url, { credentials: 'include' })`). Endpoints marked *Logged-in member* answer **401** without it.
- **CSRF protection:** requests other than GET are refused with **403** when their `Origin` header is not the website's own.
- **Dates** are ISO 8601 strings in UTC, e.g. `2026-10-12T02:00:00.000Z`.
- **Prices** are numbers in major units, exactly as the store shows them (`13450` SGD). `priceVnd` values are converted at Vietcombank's sell rate and rounded to whole VND.
- **Markets:** `VN`, `SG`, `HK`. **Currencies:** `VND`, `SGD`, `HKD`.
- **Caching:** `/api/brands`, `/api/products` and `/api/deals` send `Cache-Control: public, max-age=300` and an `ETag`.
- **Limits:** above 300 requests a minute from one IP address, or 1,200 overall, every endpoint except the health check answers **429** with `Retry-After`. Some endpoints have tighter limits, listed with them.
- **Waking up:** the free host sleeps after 15 idle minutes, so the first request can take about a minute.
