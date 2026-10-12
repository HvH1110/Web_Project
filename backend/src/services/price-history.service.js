import { addDays, startOfUtcDay } from '../utils/dates.js';
import { marketRank } from './products.service.js';

export const HISTORY_RANGES = ['1y', '5y', 'all'];
const RANGE_YEARS = { '1y': 1, '5y': 5 };
// Spacing of the VND samples, in days.
const SAMPLE_DAYS = { '1y': 1, '5y': 7, all: 7 };

// Left edge of the chart. For 'all' it is the oldest history point.
export function rangeStart(range, to, oldestObservedAt) {
  if (range === 'all') {
    return oldestObservedAt ?? to;
  }
  const from = new Date(to);
  from.setUTCFullYear(from.getUTCFullYear() - RANGE_YEARS[range]);
  return from;
}

function toPoint(point) {
  return {
    date: point.observedAt,
    price: point.price,
    origin: point.origin,
    archiveUrl: point.archiveUrl ?? null,
    carried: false,
  };
}

// The step line converted to VND, sampled every `stepDays` days plus at each
// price change and at both ends. Each sample uses the rate of its own day.
function sampleVnd(points, end, currency, stepDays, rateOn) {
  const times = new Set([end, ...points.map((point) => point.date)].map((date) => date.getTime()));
  for (let day = addDays(startOfUtcDay(points[0].date), stepDays); day < end; day = addDays(day, stepDays)) {
    times.add(day.getTime());
  }

  let current = 0;
  return [...times]
    .sort((a, b) => a - b)
    .map((time) => {
      while (current + 1 < points.length && points[current + 1].date.getTime() <= time) {
        current += 1;
      }
      const date = new Date(time);
      const rate = rateOn(currency, date);
      return { date, priceVnd: rate == null ? null : Math.round(points[current].price * rate) };
    });
}

// Chart series for one product, one per source (docs/API.md, product history).
// `pricePoints` must be sorted by observedAt ascending; `offers` are the
// product's current offers; `rateOn` comes from loadHistoricalRates().
export function buildHistorySeries({ pricePoints, offers, range, from, to, rateOn }) {
  const offersBySource = new Map(offers.map((offer) => [offer.source?.id, offer]));
  const pointsBySource = new Map();
  for (const point of pricePoints) {
    if (!pointsBySource.has(point.sourceId)) {
      pointsBySource.set(point.sourceId, []);
    }
    pointsBySource.get(point.sourceId).push(point);
  }

  const series = [];
  for (const [sourceId, sourcePoints] of pointsBySource) {
    const offer = offersBySource.get(sourceId);
    // The last price holds until the source was last seen showing a price.
    const lastSeenAt = offer?.price != null ? (offer.lastSeenAt ?? null) : null;
    const before = sourcePoints.filter((point) => point.observedAt < from).at(-1);
    const inRange = sourcePoints.filter((point) => point.observedAt >= from && point.observedAt <= to);

    // Skip sources whose line ends before the range starts.
    if (inRange.length === 0 && !(before && lastSeenAt && lastSeenAt >= from)) {
      continue;
    }

    const points = inRange.map(toPoint);
    if (before) {
      points.unshift({ ...toPoint(before), date: from, carried: true });
    }
    const latest = inRange.at(-1) ?? before;
    const lastDate = points.at(-1).date;
    const end = lastSeenAt && lastSeenAt > lastDate ? new Date(Math.min(lastSeenAt, to)) : lastDate;

    series.push({
      market: latest.market,
      source: {
        id: sourceId,
        name: offer?.source?.name ?? null,
        type: offer?.source?.type ?? null,
      },
      currency: latest.currency,
      lastSeenAt,
      points,
      vnd: sampleVnd(points, end, latest.currency, SAMPLE_DAYS[range], rateOn),
    });
  }

  return series.sort(
    (a, b) =>
      marketRank(a.market) - marketRank(b.market) || String(a.source.id).localeCompare(String(b.source.id)),
  );
}
