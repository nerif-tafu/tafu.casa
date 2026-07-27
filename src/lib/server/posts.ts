import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './storage';

export type Post = {
  id: string;
  slug: string;
  title: string;
  /** ISO date, yyyy-mm-dd */
  date: string;
  /** HTML produced by the admin WYSIWYG editor */
  html: string;
  /** When false, listed greyed-out and unlinked on /projects. Defaults to true. */
  active: boolean;
  /** Optional /media/… URL used first for link-preview embeds. */
  coverImage: string;
};

const DATA_FILE = path.join(DATA_DIR, 'posts.json');

function normalizePost(raw: Record<string, unknown>): Post | null {
  const title = typeof raw.title === 'string' ? raw.title : '';
  const slug = typeof raw.slug === 'string' ? raw.slug : '';
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!title || !slug || !id) return null;
  const cover =
    typeof raw.coverImage === 'string' && raw.coverImage.startsWith('/media/')
      ? raw.coverImage
      : '';
  return {
    id,
    slug,
    title,
    date: typeof raw.date === 'string' ? raw.date : '',
    html: typeof raw.html === 'string' ? raw.html : '',
    // Missing field → active (backwards compatible with older posts.json)
    active: raw.active !== false,
    coverImage: cover
  };
}

export async function getPosts(): Promise<Post[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => (p && typeof p === 'object' ? normalizePost(p as Record<string, unknown>) : null))
      .filter((p): p is Post => p !== null);
  } catch {
    return [];
  }
}

export async function savePosts(posts: Post[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(posts, null, 2) + '\n', 'utf-8');
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'post'
  );
}

export function uniqueSlug(title: string, posts: Post[], excludeId?: string): string {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (posts.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
