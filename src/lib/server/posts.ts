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
};

const DATA_FILE = path.join(DATA_DIR, 'posts.json');

export async function getPosts(): Promise<Post[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
