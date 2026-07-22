import { error } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { MEDIA_TYPES, UPLOAD_DIR } from '$lib/server/media';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const name = params.file;
  // Strict allowlist so the param can never traverse out of the upload dir
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(name)) throw error(404, 'Not found');

  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const type = MEDIA_TYPES[ext];
  if (!type) throw error(404, 'Not found');

  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    throw error(404, 'Not found');
  }
};
