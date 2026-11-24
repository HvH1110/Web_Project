// Blocks shared by the endpoint docs in src/routes/*.routes.js (apiDoc, https://apidocjs.com).
// This file only holds comments; nothing imports it. Build the docs with `npm run docs`.

/**
 * @apiDefine Catalog Catalog
 * Houses, products, prices and price history. Public, cached for 5 minutes (`Cache-Control: public, max-age=300` and an `ETag`).
 */

/**
 * @apiDefine Account Accounts
 * Sign-up, login and the member's own profile. The session is a random token in the `httpOnly` cookie `sid`, valid 30 days.
 */

/**
 * @apiDefine Forum Forum
 * Members only, reading included. Text is plain text (never HTML). Each topic and reply carries `permissions`, so the website shows only the buttons that will work; the server checks again on every request.
 */

/**
 * @apiDefine Moderation Moderation
 * Moderators and admins only.
 */

/**
 * @apiDefine Member Logged-in member
 * Needs a valid session cookie. Without one: **401** `Log in required`.
 */

/**
 * @apiDefine Moderator Moderator or admin
 * Needs a session of a member whose `role` is `moderator` or `admin` and who is not banned. Others: **403** `Moderators only`.
 */

/**
 * @apiDefine Public Anyone
 * No login needed.
 */

/**
 * @apiDefine ErrorDb
 * @apiError (Error 5xx) 503 `Database unavailable`: the API is not connected to MongoDB. In the first 20 seconds after a start, requests wait for the connection instead.
 */

/**
 * @apiDefine ErrorRate
 * @apiError (Error 4xx) 429 `Too many attempts, try again later`, with a `Retry-After` header in seconds. Above 300 requests a minute from one IP address or 1,200 overall, or the endpoint's own tighter limit.
 */

/**
 * @apiDefine ErrorLogin
 * @apiError (Error 4xx) 401 `Log in required`: no valid session cookie.
 */

/**
 * @apiDefine ErrorBanned
 * @apiError (Error 4xx) 403 `Your account is banned from posting`.
 */

/**
 * @apiDefine ErrorOrigin
 * @apiError (Error 4xx) 403 `Cross-origin request refused`: the `Origin` header is not the website's own (CSRF protection; browsers set it themselves).
 */

/**
 * @apiDefine ErrorExample
 * @apiErrorExample {json} Error body
 *     HTTP/1.1 400 Bad Request
 *     { "error": { "message": "limit must be an integer from 1 to 60" } }
 */

/**
 * @apiDefine Paging
 * @apiSuccess {Number} page Page number.
 * @apiSuccess {Number} limit Results per page.
 * @apiSuccess {Number} total Number of results across all pages.
 * @apiSuccess {Number} totalPages Number of pages.
 */

/**
 * @apiDefine Fx
 * @apiSuccess {Object} fx Exchange rate used for every `priceVnd` in the response, or `null` when no rate is stored yet.
 * @apiSuccess {String} fx.date Day of the rate, `YYYY-MM-DD`.
 * @apiSuccess {Object} fx.vndPer VND for 1 unit of each currency: `SGD`, `HKD`, `USD` (Vietcombank sell rate).
 */

/**
 * @apiDefine UserResponse
 * @apiSuccess {Object} user The logged-in member (only ever returned to that member).
 * @apiSuccess {String} user.id Member ID, 24 hex characters.
 * @apiSuccess {String} user.email Email, lowercase.
 * @apiSuccess {String} user.displayName Name shown on the forum. 2 to 30 characters: letters, digits, spaces, `.`, `_`, `-`. Unique, ignoring case.
 * @apiSuccess {String="member","moderator","admin"} user.role Role. Set by the site owner with `npm run set-role`, never through the API.
 * @apiSuccess {Boolean} user.banned `true` when a moderator banned the member from posting (they can still log in and read).
 * @apiSuccess {String} user.createdAt When the account was created (ISO 8601, UTC).
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "user": {
 *         "id": "6720f1c2a1b2c3d4e5f60719",
 *         "email": "an@example.com",
 *         "displayName": "Nguyễn An",
 *         "role": "member",
 *         "banned": false,
 *         "createdAt": "2026-10-21T08:00:00.000Z"
 *       }
 *     }
 */

/**
 * @apiDefine TopicResponse
 * @apiSuccess {Object} topic The topic.
 * @apiSuccess {String} topic.id Topic ID.
 * @apiSuccess {String} topic.title Title, one line.
 * @apiSuccess {String} topic.body Plain text; keep its newlines.
 * @apiSuccess {Object} topic.brand The house it is about, `{ slug, name }`, or `null`.
 * @apiSuccess {Object} topic.author `{ id, displayName, role }`, or `null` when the account no longer exists. Show a badge from `role`.
 * @apiSuccess {Object[]} topic.images Images, `{ id, url, width, height }`: WebP, at most 2048 px, without photo metadata.
 * @apiSuccess {Number} topic.replyCount Visible replies.
 * @apiSuccess {Boolean} topic.pinned Shown first in the list.
 * @apiSuccess {Boolean} topic.locked No new replies or edits, except by moderators.
 * @apiSuccess {Object} topic.hidden `null`, or `{ at, reason }` when a moderator hid it (only its author and moderators still see it).
 * @apiSuccess {String} topic.createdAt When it was posted.
 * @apiSuccess {String} topic.editedAt When the author last edited it, or `null`.
 * @apiSuccess {String} topic.lastActivityAt When it or its latest visible reply was posted.
 * @apiSuccess {Object} topic.permissions What the viewer may do: `{ edit, delete, reply, moderate }`.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "topic": {
 *         "id": "6720f3b10c1d2e3f40516273",
 *         "title": "Rolex Submariner: buy in Hong Kong or Singapore?",
 *         "body": "The SG price looks lower after the latest rate change, but…\n\nAnyone bought there recently?",
 *         "brand": { "slug": "rolex", "name": "Rolex" },
 *         "author": { "id": "6720f1c2a1b2c3d4e5f60719", "displayName": "Nguyễn An", "role": "member" },
 *         "images": [{ "id": "6720f2aa0b1c2d3e4f506172", "url": "https://…/forum/9f2c4e0b.webp", "width": 1600, "height": 1200 }],
 *         "replyCount": 5,
 *         "pinned": false,
 *         "locked": false,
 *         "hidden": null,
 *         "createdAt": "2026-11-21T08:30:00.000Z",
 *         "editedAt": null,
 *         "lastActivityAt": "2026-11-21T10:12:00.000Z",
 *         "permissions": { "edit": true, "delete": true, "reply": true, "moderate": false }
 *       }
 *     }
 */

/**
 * @apiDefine ReplyResponse
 * @apiSuccess {Object} reply The reply.
 * @apiSuccess {String} reply.id Reply ID.
 * @apiSuccess {String} reply.topicId Its topic.
 * @apiSuccess {String} reply.body Plain text; can be `""` when the reply has images.
 * @apiSuccess {Object} reply.author `{ id, displayName, role }`, or `null`.
 * @apiSuccess {Object[]} reply.images Images, `{ id, url, width, height }`.
 * @apiSuccess {Object} reply.hidden `null`, or `{ at, reason }`.
 * @apiSuccess {String} reply.createdAt When it was posted.
 * @apiSuccess {String} reply.editedAt When the author last edited it, or `null`.
 * @apiSuccess {Object} reply.permissions What the viewer may do: `{ edit, delete, moderate }`.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "reply": {
 *         "id": "6720f4c20d1e2f3041526374",
 *         "topicId": "6720f3b10c1d2e3f40516273",
 *         "body": "Bought mine at the Pacific Place boutique in August.",
 *         "author": { "id": "6720f1c2a1b2c3d4e5f60720", "displayName": "Atelier Moderator", "role": "moderator" },
 *         "images": [],
 *         "hidden": null,
 *         "createdAt": "2026-11-21T10:12:00.000Z",
 *         "editedAt": null,
 *         "permissions": { "edit": true, "delete": true, "moderate": true }
 *       }
 *     }
 */

/**
 * @apiDefine ProductFields
 * @apiSuccess {String} items.id Product ID.
 * @apiSuccess {String} items.brand Brand slug, e.g. `rolex`. With `ref`, identifies the product in URLs.
 * @apiSuccess {String} items.brandName Brand name, or `null` if the brand is unknown.
 * @apiSuccess {String} items.ref The house's reference code, uppercase, no spaces.
 * @apiSuccess {String} items.name Product name.
 * @apiSuccess {String} items.category `bags`, `accessories`, `shoes`, `clothing`, `jewelry` or `watches`.
 * @apiSuccess {String} items.collection Collection, or `null`.
 * @apiSuccess {Object[]} items.images 0 to 4 pictures: `{ url, alt, sourceId }`. Pictures belong to their owners: credit the store whose `source.id` is `sourceId`.
 * @apiSuccess {Number} items.lowestPriceVnd Lowest current price in VND among the offers, or `null`.
 * @apiSuccess {Object[]} items.offers Current prices, one per store; empty for products known only from the Internet Archive.
 * @apiSuccess {String="VN","SG","HK"} items.offers.market Market.
 * @apiSuccess {Object} items.offers.source Store: `{ id, name, type }`, `type` is `official` or `authorized-dealer`.
 * @apiSuccess {String} items.offers.url The product page at that store ("where to buy").
 * @apiSuccess {String="VND","SGD","HKD"} items.offers.currency Currency of `price`.
 * @apiSuccess {Number} items.offers.price Price in major units as the store shows it, or `null`.
 * @apiSuccess {Number} items.offers.priceVnd Price in VND at the latest rate, or `null`.
 * @apiSuccess {Boolean} items.offers.available In stock: `true`, `false` or `null` (unknown).
 * @apiSuccess {String} items.offers.lastSeenAt When the price was last confirmed.
 * @apiSuccess {String="crawl","manual"} items.offers.origin `crawl`: read by the crawler. `manual`: read by a person; show it with its date, not as a live price.
 */
