import { error } from '@sveltejs/kit';
import { absoluteUrl, excerptFromHtml, firstImageSrc } from '$lib/og';
import { getPosts } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) throw error(404, 'Post not found');

  const origin = url.origin;
  const description =
    excerptFromHtml(post.html) || `Project writeup on tafu.casa — ${post.title}`;
  // Prefer explicit cover → first inline photo → site favicon
  const img = post.coverImage || firstImageSrc(post.html) || '/favicon.jpg';
  const image = absoluteUrl(img, origin);
  const pageUrl = absoluteUrl(`/projects/${post.slug}`, origin);

  return {
    post,
    og: {
      title: post.title,
      description,
      url: pageUrl,
      image,
      siteName: 'tafu.casa'
    }
  };
};
