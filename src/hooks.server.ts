import type { Handle } from '@sveltejs/kit';
import { recordVisit } from '$lib/server/metrics';
import { safeClientAddress } from '$lib/server/client-ip';

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
      void recordVisit(page, safeClientAddress(() => event.getClientAddress()));
    }
  }
  return resolve(event);
};
