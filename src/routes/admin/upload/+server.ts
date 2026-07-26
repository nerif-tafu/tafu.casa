import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isAuthed } from '$lib/server/auth';
import {
  isValidMediaName,
  MAX_UPLOAD_BYTES,
  MEDIA_TYPES,
  processUploadedMedia,
  UPLOAD_DIR
} from '$lib/server/media';
import type { RequestHandler } from './$types';

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);

export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!isAuthed(cookies)) throw error(401, 'Not signed in');

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) throw error(400, 'No file');
  if (file.size > MAX_UPLOAD_BYTES) throw error(413, 'File too large (max 100 MB)');

  const srcExt = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!MEDIA_TYPES[srcExt]) {
    throw error(415, `Unsupported file type .${srcExt}`);
  }

  // Videos always land as uuid.mp4 (H.264/SDR primary) so mobile clients can play them.
  // HDR originals are stored alongside as uuid.hdr.<srcExt>.
  const isVideo = VIDEO_EXTS.has(srcExt);
  const primaryExt = isVideo ? 'mp4' : srcExt;

  const requested = String(form.get('name') ?? '');
  let name: string;
  if (requested) {
    if (!isValidMediaName(requested) || requested.toLowerCase().includes('.hdr.')) {
      throw error(400, 'Invalid file name');
    }
    if (!requested.toLowerCase().endsWith(`.${primaryExt}`)) {
      throw error(400, 'Invalid file name');
    }
    name = requested.toLowerCase();
  } else {
    name = `${randomUUID()}.${primaryExt}`;
  }

  const raw = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processUploadedMedia(srcExt, raw);
  } catch (e) {
    console.error('Failed to process upload:', e);
    throw error(500, 'Failed to process upload');
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), processed.data);

  let hdrUrl: string | null = null;
  if (processed.hdr) {
    const base = name.slice(0, name.lastIndexOf('.'));
    const hdrName = `${base}.hdr.${processed.hdr.ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, hdrName), processed.hdr.data);
    hdrUrl = `/media/${hdrName}`;
  }

  return json({ url: `/media/${name}`, hdrUrl });
};
