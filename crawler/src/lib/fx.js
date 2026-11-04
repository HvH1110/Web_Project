// Daily exchange rates for fx_rates, from Vietcombank, Vietnam's largest
// foreign-exchange bank: its public rate table for any date since early 2020,
// weekends and holidays included. We store the bank's sell rate, what a buyer
// in Vietnam pays for the foreign currency. Called from crawl.js.
import { politeFetch } from './http.js';
import { parsePrice } from './parse.js';
import { saveFxRate } from './store.js';
import { FxRate, PricePoint } from '../models/index.js';

const API = 'https://www.vietcombank.com.vn/api/exchangerates';
const SOURCE = 'vietcombank';
const CURRENCIES = ['SGD', 'HKD', 'USD'];
// The bank's table has nothing older, so a date before this is never asked for.
const FIRST_DATE = '2020-02-01';
// Past days per run: one request each, so a long gap can't eat the crawl's time.
// The next run continues. At the default delay this is about 5 minutes.
const PAST_DAYS_PER_RUN = 60;
const MAX_ERRORS_IN_A_ROW = 3;

const DAY_MS = 86_400_000;
const isoDate = (d) => d.toISOString().slice(0, 10);

// { SGD, HKD, USD } in VND for one date, or null when the bank has no table for
// it (a date not published yet) or the table lacks one of them: never a guess.
export async function fetchRates(date) {
  const res = await politeFetch(`${API}?date=${date}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Vietcombank answered HTTP ${res.status} for ${date}`);
  const { Date: tableDate, Data: rows } = await res.json();
  if (!tableDate?.startsWith(date)) return null;
  const vndPer = {};
  for (const currency of CURRENCIES) {
    const rate = parsePrice(rows?.find((row) => row.currencyCode === currency)?.sell);
    if (!(rate > 0)) return null;
    vndPer[currency] = rate;
  }
  return vndPer;
}

// Today's rates (asked again on every run, the table changes during the day),
// then past days with no rates yet, newest first, back to the oldest price
// point. Safe to re-run. `pastDays` caps the past days asked for in this run.
export async function updateFxRates({ pastDays = PAST_DAYS_PER_RUN, log = console.log } = {}) {
  const started = Date.now();
  const today = isoDate(new Date());
  const oldest = await PricePoint.findOne().sort({ observedAt: 1 }).select('observedAt').lean();
  const oldestDate = oldest ? isoDate(oldest.observedAt) : today;
  const first = oldestDate > FIRST_DATE ? oldestDate : FIRST_DATE;
  const stored = new Set(await FxRate.distinct('date', { date: { $gte: first } }));

  const missing = [];
  for (let t = Date.parse(today) - DAY_MS; isoDate(new Date(t)) >= first; t -= DAY_MS) {
    if (!stored.has(isoDate(new Date(t)))) missing.push(isoDate(new Date(t)));
  }

  const dates = [today, ...missing.slice(0, pastDays)];
  let saved = 0;
  let empty = 0;
  let errorsInARow = 0;
  for (const date of dates) {
    try {
      const vndPer = await fetchRates(date);
      errorsInARow = 0;
      if (vndPer) {
        await saveFxRate(date, vndPer, SOURCE);
        saved += 1;
      } else {
        empty += 1;
        log(`[fx] no rates published for ${date}`);
      }
    } catch (err) {
      errorsInARow += 1;
      log(`[fx] ${date}: ${err.message}`);
      if (errorsInARow >= MAX_ERRORS_IN_A_ROW) {
        throw new Error(`${MAX_ERRORS_IN_A_ROW} errors in a row, giving up (last: ${err.message})`, { cause: err });
      }
    }
  }
  const left = missing.length - Math.min(missing.length, pastDays);
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  log(`[fx] done in ${minutes} min: ${saved} days saved, ${empty} without rates, ${left} past days still to do (back to ${first})`);
}
