import { fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { deleteUnusedMedia, isValidMediaName, MEDIA_TYPES, UPLOAD_DIR } from '$lib/server/media';
import { parseTar } from '$lib/server/tar';
import { safeClientAddress } from '$lib/server/client-ip';
import {
  checkPassword,
  clearLoginFailures,
  clearSession,
  isAuthed,
  loginAllowed,
  recordLoginFailure,
  setSession,
  throttleFailedLogin
} from '$lib/server/auth';
import { getProjects, saveProjects } from '$lib/server/projects';
import { getPosts, savePosts, uniqueSlug } from '$lib/server/posts';
import { getMetrics } from '$lib/server/metrics';
import type { Actions, PageServerLoad } from './$types';

async function pruneOrphanMedia() {
  const posts = await getPosts();
  await deleteUnusedMedia(posts.flatMap((p) => [p.html, p.coverImage].filter(Boolean)));
}

export const load: PageServerLoad = async ({ cookies }) => {
  const authed = isAuthed(cookies);
  return {
    authed,
    projects: authed ? await getProjects() : [],
    posts: authed ? (await getPosts()).sort((a, b) => b.date.localeCompare(a.date)) : [],
    metrics: authed ? await getMetrics() : null
  };
};

export const actions: Actions = {
  login: async ({ request, cookies, getClientAddress }) => {
    const ip = safeClientAddress(getClientAddress);
    const gate = loginAllowed(ip);
    if (!gate.ok) {
      return fail(429, {
        error: `Too many failed attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} min.`
      });
    }
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    if (!checkPassword(password)) {
      recordLoginFailure(ip);
      await throttleFailedLogin();
      return fail(401, { error: 'Wrong password' });
    }
    clearLoginFailures(ip);
    setSession(cookies);
  },

  logout: async ({ cookies }) => {
    clearSession(cookies);
  },

  addSite: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    if (!title) return fail(400, { error: 'Title is required' });
    const projects = await getProjects();
    projects.push({
      id: randomUUID(),
      title,
      url: String(form.get('url') ?? '').trim(),
      description: String(form.get('description') ?? '').trim()
    });
    await saveProjects(projects);
  },

  updateSite: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const title = String(form.get('title') ?? '').trim();
    if (!title) return fail(400, { error: 'Title is required' });
    const projects = await getProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) return fail(404, { error: 'Site not found' });
    project.title = title;
    project.url = String(form.get('url') ?? '').trim();
    project.description = String(form.get('description') ?? '').trim();
    await saveProjects(projects);
  },

  reorderSites: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const order = String(form.get('order') ?? '')
      .split(',')
      .filter(Boolean);
    const projects = await getProjects();
    const byId = new Map(projects.map((p) => [p.id, p]));
    const reordered = order.flatMap((id) => byId.get(id) ?? []);
    // Keep any rows missing from the submitted order (e.g. added concurrently)
    for (const p of projects) {
      if (!reordered.includes(p)) reordered.push(p);
    }
    if (reordered.length !== projects.length) return fail(400, { error: 'Bad order' });
    await saveProjects(reordered);
  },

  deleteSite: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const projects = await getProjects();
    await saveProjects(projects.filter((p) => p.id !== id));
  },

  savePost: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const title = String(form.get('title') ?? '').trim();
    const date = String(form.get('date') ?? '').trim();
    const html = String(form.get('html') ?? '');
    const active = form.getAll('active').pop() === '1';
    const coverRaw = String(form.get('coverImage') ?? '').trim();
    const coverImage = /^\/media\/[a-f0-9-]{36}(?:\.hdr)?\.[a-z0-9]+$/i.test(coverRaw)
      ? coverRaw
      : '';
    if (!title) return fail(400, { error: 'Title is required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date is required' });

    const posts = await getPosts();
    if (id) {
      const post = posts.find((p) => p.id === id);
      if (!post) return fail(404, { error: 'Post not found' });
      post.title = title;
      post.date = date;
      post.html = html;
      post.active = active;
      post.coverImage = coverImage;
    } else {
      posts.push({
        id: randomUUID(),
        slug: uniqueSlug(title, posts),
        title,
        date,
        html,
        active,
        coverImage
      });
    }
    await savePosts(posts);
    await pruneOrphanMedia();
  },

  deletePost: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const posts = await getPosts();
    await savePosts(posts.filter((p) => p.id !== id));
    await pruneOrphanMedia();
  },

  restore: async ({ request, cookies }) => {
    if (!isAuthed(cookies)) return fail(401, { error: 'Not signed in' });
    const form = await request.formData();
    const file = form.get('backup');
    if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'No backup file' });
    if (file.size > 500 * 1024 * 1024) return fail(400, { error: 'Backup file too large' });

    let databaseJson: string;
    let media: { name: string; data: Buffer }[] = [];

    if (file.name.toLowerCase().endsWith('.tar')) {
      const entries = parseTar(Buffer.from(await file.arrayBuffer()));
      const db = entries.find((e) => e.name === 'database.json');
      if (!db) return fail(400, { error: 'Backup archive has no database.json' });
      databaseJson = db.data.toString('utf-8');
      media = entries
        .filter((e) => e.name.startsWith('uploads/'))
        .map((e) => ({ name: e.name.slice('uploads/'.length), data: e.data }))
        .filter(
          (e) =>
            isValidMediaName(e.name) &&
            MEDIA_TYPES[e.name.split('.').pop()?.toLowerCase() ?? '']
        );
    } else {
      // Legacy JSON-only backup
      databaseJson = await file.text();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(databaseJson);
    } catch {
      return fail(400, { error: 'Backup database is not valid JSON' });
    }
    const bundle = parsed as { projects?: unknown; posts?: unknown };
    if (!Array.isArray(bundle.projects) || !Array.isArray(bundle.posts)) {
      return fail(400, { error: 'Backup must contain "projects" and "posts" arrays' });
    }

    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const projects = bundle.projects
      .map((p) => {
        const raw = p as Record<string, unknown>;
        return {
          id: str(raw.id) || randomUUID(),
          title: str(raw.title),
          url: str(raw.url),
          description: str(raw.description)
        };
      })
      .filter((p) => p.title);
    const posts = bundle.posts
      .map((p) => {
        const raw = p as Record<string, unknown>;
        return {
          id: str(raw.id) || randomUUID(),
          slug: str(raw.slug),
          title: str(raw.title),
          date: str(raw.date),
          html: str(raw.html),
          active: raw.active !== false,
          coverImage:
            typeof raw.coverImage === 'string' && raw.coverImage.startsWith('/media/')
              ? raw.coverImage
              : ''
        };
      })
      .filter((p) => p.title && p.slug);

    await saveProjects(projects);
    await savePosts(posts);
    if (media.length) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      for (const m of media) {
        await fs.writeFile(path.join(UPLOAD_DIR, m.name), m.data);
      }
    }
    await pruneOrphanMedia();
    return { restored: true };
  }
};
