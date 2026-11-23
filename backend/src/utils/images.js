// Image in docs/API.md, from a product's stored `images`. Leaves out what a page
// can't show as a picture: non-http(s) links and embedded video players (some
// Louis Vuitton pages list a video among their images). URLs are normalized, so
// raw spaces come out percent-encoded, and duplicates are dropped.
export function toImageDtos(images) {
  const seen = new Set();
  const result = [];
  for (const image of images ?? []) {
    const url = pictureUrl(image?.url);
    if (url && !seen.has(url)) {
      seen.add(url);
      result.push({ url, alt: image.alt ?? null, sourceId: image.sourceId ?? null });
    }
  }
  return result;
}

function pictureUrl(raw) {
  if (typeof raw !== 'string') {
    return null;
  }
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  if (url.hostname.startsWith('player.') || /\/embed\//i.test(url.pathname)) {
    return null;
  }
  return url.href;
}
