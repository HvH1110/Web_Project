# Entering prices by hand

For official sites that block crawlers: Chanel, Van Cleef & Arpels, and current prices for Louis Vuitton, Dior and IWC. About 10 to 20 signature products per brand.

1. Copy `prices.template.csv` to `prices.csv` in this folder.
2. Open the product page on the official site in your normal browser, in the market you're entering (`sg.louisvuitton.com`, `dior.com/en_hk`, ...).
3. Add one row per product per market, with exactly what the page shows. If a page shows no price, leave that product out: never fill in a price from anywhere else.
4. Check the file, then import it (from the `crawler` folder):
   ```
   npm run import-prices -- --dry-run
   npm run import-prices
   ```

If any row is wrong, nothing is imported and every problem is listed with its line number. Fix them and run it again. Re-running is safe.

## Columns

| Column | Required | What to write | Example |
|---|---|---|---|
| `brand` | yes | `chanel`, `van-cleef-arpels`, `louis-vuitton`, `dior` or `iwc` | `chanel` |
| `market` | yes | `VN`, `SG` or `HK` | `SG` |
| `ref` | yes | The reference code on the page, exactly | `AS3888` |
| `name` | yes | The product name on the page | `Classic Flap Bag` |
| `category` | yes | `bags`, `accessories`, `shoes`, `clothing`, `jewelry` or `watches` | `bags` |
| `collection` | no | The collection name, if the page gives one | `Classic` |
| `price` | yes | The number on the page, no currency sign. Write VND in full | `13450` or `13,450` |
| `currency` | yes | `VND` for VN, `SGD` for SG, `HKD` for HK | `SGD` |
| `url` | yes | The product page's full address, on the official site | `https://www.chanel.com/sg/...` |
| `date_seen` | yes | The day you saw the price, as `YYYY-MM-DD` | `2026-11-04` |
| `image_urls` | no | Up to 4 picture addresses from that site, separated by `\|` | `https://...a.jpg\|https://...b.jpg` |
| `description` | no | The product's description | |

Reference codes by brand: Louis Vuitton is 6 letters and digits (`M12929`), Dior is style and colour joined by `_` (`M0538ONGE_M27V`), IWC is `IW` and 6 more (`IW545901`).

## Good to know

- **Using the same code as the catalog matters.** That's how a price joins an existing product and its history. After an import, the command lists every new product it created: if one should already exist, its `ref` is probably mistyped.
- **Checking a price again later:** add a new row with the new `date_seen` and keep the old row. The site shows the newest date as the date it was checked, and adds to the price history only if the price changed.
- **Fixing a mistake:** correct the price in the row and import again. Changing a `date_seen` adds a new entry instead, and deleting a row doesn't remove what was already imported.
- **A product that already exists keeps its name, pictures and description.** Your values only fill what is still empty, or replace pictures when you give more of them.
- **Excel:** save as "CSV UTF-8". Excel may rewrite dates (`04/11/2026`) and long numbers (`1.2E+05`); the import rejects those rather than guess, so set those columns to Text first.
- **Keep `prices.csv`.** It's the record of what was checked and when, so it's worth committing to the repo.
