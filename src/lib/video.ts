/**
 * Firefox's Windows HDR path overexposes HLG (and sometimes PQ) video.
 * When a writeup ships both HDR and SDR <source>s, drop the HDR ones on
 * Firefox so it uses the tone-mapped SDR fallback. Chrome/Safari/Edge keep HDR.
 */
export function preferSdrOnFirefox(root: ParentNode = document): void {
  if (typeof navigator === 'undefined') return;
  const ua = navigator.userAgent;
  if (!/firefox/i.test(ua) || /seamonkey/i.test(ua)) return;

  for (const video of root.querySelectorAll('video')) {
    let changed = false;
    for (const source of [...video.querySelectorAll('source')]) {
      const media = source.getAttribute('media') ?? '';
      if (/video-dynamic-range:\s*high|dynamic-range:\s*high/i.test(media)) {
        source.remove();
        changed = true;
      }
    }
    if (changed) {
      // Force the element to re-evaluate remaining sources
      video.load();
    }
  }
}

/** Build the HTML embed for a video, optionally with an HDR sibling source. */
export function videoEmbedHtml(url: string, hdrUrl?: string | null): string {
  if (hdrUrl) {
    return `<video controls playsinline><source src="${hdrUrl}" type="video/mp4" media="(video-dynamic-range: high)"><source src="${url}" type="video/mp4"></video>`;
  }
  return `<video controls playsinline src="${url}"></video>`;
}
