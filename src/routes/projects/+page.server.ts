import { getPosts } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const posts = await getPosts();
  return {
    posts: posts
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(({ slug, title, date }) => ({ slug, title, date }))
  };
};
