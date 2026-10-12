const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// 'YYYY-MM-DD' in UTC, the format of fx_rates.date.
export function toDayString(date) {
  return date.toISOString().slice(0, 10);
}

// Whole days from one 'YYYY-MM-DD' string to another.
export function daysBetween(fromDay, toDay) {
  return Math.round((Date.parse(toDay) - Date.parse(fromDay)) / DAY_MS);
}
