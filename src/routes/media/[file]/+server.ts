import { error } from '@sveltejs/kit';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { MEDIA_TYPES, UPLOAD_DIR, isValidMediaName } from '$lib/server/media';
import type { RequestHandler } from './$types';

/** Parse a single `bytes=start-end` range (browsers send one for media). */
function parseRange(header: string, size: number): { start: number; end: number } | 'invalid' {
  const m = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!m) return 'invalid';
  const hasStart = m[1] !== '';
  const hasEnd = m[2] !== '';
  if (!hasStart && !hasEnd) return 'invalid';

  let start: number;
  let end: number;
  if (!hasStart) {
    // suffix: bytes=-500 → last 500 bytes
    const suffix = parseInt(m[2], 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(m[1], 10);
    end = hasEnd ? parseInt(m[2], 10) : size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return 'invalid';
  }
  return { start, end: Math.min(end, size - 1) };
}

export const GET: RequestHandler = async ({ params, request }) => {
  const name = params.file;
  // Allow uuid.ext and uuid.hdr.ext (HDR sibling)
  if (!isValidMediaName(name)) throw error(404, 'Not found');

  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const type = MEDIA_TYPES[ext];
  if (!type) throw error(404, 'Not found');

  const filePath = path.join(UPLOAD_DIR, name.toLowerCase());
  let size: number;
  try {
    size = (await fs.stat(filePath)).size;
  } catch {
    throw error(404, 'Not found');
  }

  const cache = 'public, max-age=31536000, immutable';
  const rangeHeader = request.headers.get('range');

  // Firefox (esp. mobile) requires byte-range support for <video> playback
  if (rangeHeader) {
    const parsed = parseRange(rangeHeader, size);
    if (parsed === 'invalid') {
      return new Response(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${size}`,
          'Accept-Ranges': 'bytes'
        }
      });
    }
    const { start, end } = parsed;
    const chunkLen = end - start + 1;
    const fh = await fs.open(filePath, 'r');
    try {
      const buf = Buffer.alloc(chunkLen);
      await fh.read(buf, 0, chunkLen, start);
      return new Response(new Uint8Array(buf), {
        status: 206,
        headers: {
          'Content-Type': type,
          'Content-Length': String(chunkLen),
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': cache
        }
      });
    } finally {
      await fh.close();
    }
  }

  const buf = await fs.readFile(filePath);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': type,
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': cache
    }
  });
};
