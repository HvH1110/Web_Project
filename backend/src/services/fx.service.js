import { FxRate } from '../models/fx-rate.model.js';
import { addDays, daysBetween, toDayString } from '../utils/dates.js';

// How far back a stored rate may be reused for a day without one (weekends, holidays).
const MAX_RATE_AGE_DAYS = 7;

// The most recent stored rates as { date, vndPer }, or null when none are stored yet.
export async function getLatestFx() {
  const doc = await FxRate.findOne().sort({ date: -1 }).select('date vndPer -_id').lean();
  return doc ? { date: doc.date, vndPer: doc.vndPer ?? {} } : null;
}

// VND per unit for each currency of `fx`, plus VND itself.
export function vndRates(fx) {
  return { ...fx?.vndPer, VND: 1 };
}

// Loads the rates stored between two dates and returns rateOn(currency, date):
// VND per unit on that day, from the closest earlier stored day at most
// MAX_RATE_AGE_DAYS back, or null. A 2018 price is converted at a 2018 rate.
export async function loadHistoricalRates(from, to) {
  const days = await FxRate.find({
    date: { $gte: toDayString(addDays(from, -MAX_RATE_AGE_DAYS)), $lte: toDayString(to) },
  })
    .sort({ date: 1 })
    .select('date vndPer -_id')
    .lean();

  return function rateOn(currency, date) {
    if (currency === 'VND') {
      return 1;
    }
    const day = toDayString(date);
    // Binary search for the last stored day <= day.
    let low = 0;
    let high = days.length - 1;
    let found = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (days[mid].date <= day) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (found === -1 || daysBetween(days[found].date, day) > MAX_RATE_AGE_DAYS) {
      return null;
    }
    return days[found].vndPer?.[currency] ?? null;
  };
}
