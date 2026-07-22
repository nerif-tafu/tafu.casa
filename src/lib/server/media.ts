import path from 'node:path';
import { DATA_DIR } from './storage';

/** Uploaded media lives outside the build so it survives redeploys. */
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

/** Allowed upload extensions and the content type they are served with. */
export const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime'
};

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
