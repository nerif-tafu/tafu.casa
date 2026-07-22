import { error } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isAuthed } from '$lib/server/auth';
import { getProjects } from '$lib/server/projects';
import { getPosts } from '$lib/server/posts';
import { UPLOAD_DIR } from '$lib/server/media';
import { createTar, type TarEntry } from '$lib/server/tar';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  if (!isAuthed(cookies)) throw error(401, 'Not signed in');

  const database = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      projects: await getProjects(),
      posts: await getPosts()
    },
    null,
    2
  );

  const entries: TarEntry[] = [{ name: 'database.json', data: Buffer.from(database, 'utf-8') }];

  let mediaFiles: string[] = [];
  try {
    mediaFiles = await fs.readdir(UPLOAD_DIR);
  } catch {
    /* no uploads yet */
  }
  for (const name of mediaFiles) {
    if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(name)) continue;
    entries.push({ name: `uploads/${name}`, data: await fs.readFile(path.join(UPLOAD_DIR, name)) });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(createTar(entries)), {
    headers: {
      'Content-Type': 'application/x-tar',
      'Content-Disposition': `attachment; filename="tafu-casa-backup-${stamp}.tar"`
    }
  });
};
