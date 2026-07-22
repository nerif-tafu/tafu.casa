import type { Handle } from '@sveltejs/kit';
import { recordVisit } from '$lib/server/metrics';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.request.method === 'GET') {
    // Client-side navigations fetch <path>/__data.json instead of the HTML,
    // so normalize both to the page path and count each once.
    let page = event.url.pathname;
    if (page.endsWith('/__data.json')) page = page.slice(0, -'/__data.json'.length) || '/';

    const trackable =
      !page.startsWith('/admin') &&
      !page.startsWith('/media/') &&
      !page.startsWith('/_app') &&
      !/\.[a-z0-9]+$/i.test(page);

    if (trackable) {
      let ip = 'unknown';
      try {
        ip = event.getClientAddress();
      } catch {
        /* not available (e.g. prerender) */
      }
      void recordVisit(page, ip);
    }
  }
  return resolve(event);
};
