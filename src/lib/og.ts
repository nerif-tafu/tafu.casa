/** Helpers for Open Graph / Discord / Messenger link embeds. */

const TAG_RE = /<[^>]+>/g;
const WS_RE = /\s+/g;

/** Plain-text excerpt from stored HTML for og:description / meta description. */
export function excerptFromHtml(html: string, maxLen = 160): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, ' ')
    .replace(TAG_RE, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(WS_RE, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** First raster <img src> in HTML (skips SVG — Discord rejects those), or null. */
export function firstImageSrc(html: string): string | null {
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (!/\.svg(\?|#|$)/i.test(src)) return src;
  }
  return null;
}

/** Resolve a possibly-relative URL against the site origin. */
export function absoluteUrl(href: string, origin: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return `https:${href}`;
  try {
    return new URL(href, origin).href;
  } catch {
    return href;
  }
}
