import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isAuthed } from '$lib/server/auth';
import { MAX_UPLOAD_BYTES, MEDIA_TYPES, UPLOAD_DIR } from '$lib/server/media';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!isAuthed(cookies)) throw error(401, 'Not signed in');

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) throw error(400, 'No file');
  if (file.size > MAX_UPLOAD_BYTES) throw error(413, 'File too large (max 100 MB)');

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!MEDIA_TYPES[ext]) {
    throw error(415, `Unsupported file type .${ext}`);
  }

  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return json({ url: `/media/${name}` });
};
