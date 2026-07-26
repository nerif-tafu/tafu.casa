import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';
import { DATA_DIR } from './storage';

const execFileAsync = promisify(execFile);

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

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);

/**
 * Strict filename allowlist: `uuid.ext` or `uuid.hdr.ext` (HDR sibling of a video).
 */
export function isValidMediaName(name: string): boolean {
  const m = /^([a-f0-9-]{36})(?:\.hdr)?\.([a-z0-9]+)$/i.exec(name);
  if (!m) return false;
  return Boolean(MEDIA_TYPES[m[2].toLowerCase()]);
}

/** UUID prefix for a media filename (shared by SDR + HDR siblings). */
export function mediaIdFromName(name: string): string | null {
  const m = /^([a-f0-9-]{36})(?:\.hdr)?\./i.exec(name);
  return m ? m[1].toLowerCase() : null;
}

/** Collect `/media/<file>` references from stored HTML. */
export function mediaNamesInContent(content: string): Set<string> {
  const names = new Set<string>();
  const re = /\/media\/([a-f0-9-]{36}(?:\.hdr)?\.[a-z0-9]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

/** Delete upload files that are not referenced by any project writeup. */
export async function deleteUnusedMedia(contents: string[]): Promise<number> {
  const usedIds = new Set<string>();
  for (const c of contents) {
    for (const name of mediaNamesInContent(c)) {
      const id = mediaIdFromName(name);
      if (id) usedIds.add(id);
    }
  }

  let files: string[];
  try {
    files = await fs.readdir(UPLOAD_DIR);
  } catch {
    return 0;
  }

  let removed = 0;
  for (const name of files) {
    const lower = name.toLowerCase();
    if (!isValidMediaName(lower)) continue;
    const id = mediaIdFromName(lower);
    // Keep SDR + HDR siblings whenever either is referenced
    if (id && usedIds.has(id)) continue;
    try {
      await fs.unlink(path.join(UPLOAD_DIR, name));
      removed++;
    } catch {
      /* ignore missing/locked */
    }
  }
  return removed;
}

export type ProcessedMedia = {
  /** Compatible primary file (photos stripped; videos mobile-friendly H.264 / remux). */
  data: Buffer;
  /**
   * When the source was HDR, the preserved original (metadata-stripped remux)
   * stored alongside as `uuid.hdr.<ext>`.
   */
  hdr?: { ext: string; data: Buffer };
};

/**
 * Strip SVG `<metadata>` blocks and HTML/XML comments.
 * Replacements run until stable so nested markers (e.g. `<!<!---->-->`)
 * cannot reintroduce `<!--` after a single pass (CodeQL js/incomplete-multi-character-sanitization).
 */
function stripSvgExtras(svg: string): string {
  let prev = '';
  let out = svg;
  while (out !== prev) {
    prev = out;
    out = out
      .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  }
  return out;
}

/**
 * Strip embedded metadata from photos and videos.
 * Images: auto-orient + re-encode without EXIF/IPTC/XMP.
 * Videos: strip container metadata; if HDR, preserve original as sibling and
 * produce an SDR H.264 primary for broad (esp. mobile) playback.
 */
export async function processUploadedMedia(ext: string, data: Buffer): Promise<ProcessedMedia> {
  const e = ext.toLowerCase();

  if (e === 'svg') {
    return { data: Buffer.from(stripSvgExtras(data.toString('utf8')), 'utf8') };
  }

  if (IMAGE_EXTS.has(e)) {
    const img = sharp(data, { animated: e === 'gif' }).rotate();
    if (e === 'png') return { data: await img.png().toBuffer() };
    if (e === 'webp') return { data: await img.webp().toBuffer() };
    if (e === 'gif') return { data: await img.gif().toBuffer() };
    return { data: await img.jpeg({ quality: 92, mozjpeg: true }).toBuffer() };
  }

  if (VIDEO_EXTS.has(e)) {
    return processVideo(data, e);
  }

  return { data };
}

/** @deprecated use processUploadedMedia */
export async function stripMediaMetadata(ext: string, data: Buffer): Promise<Buffer> {
  return (await processUploadedMedia(ext, data)).data;
}

function ffmpegBin(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (process.platform === 'linux') return 'ffmpeg';
  return ffmpegStatic || 'ffmpeg';
}

/** ffmpeg -i prints stream info to stderr and exits non-zero when no output is set. */
async function ffmpegInfo(input: string): Promise<string> {
  try {
    await execFileAsync(ffmpegBin(), ['-hide_banner', '-i', input], { timeout: 60_000 });
    return '';
  } catch (e) {
    const err = e as { stderr?: Buffer | string };
    return typeof err.stderr === 'string' ? err.stderr : (err.stderr?.toString() ?? '');
  }
}

/** True when the stream is HDR (HLG/PQ) or 10-bit BT.2020. */
export function isHdrVideo(ffmpegStderr: string): boolean {
  return /arib-std-b67|smpte2084|smpte2094|bt2020-10|bt2020-12|yuv420p10|yuv422p10|yuv444p10|\bp010\b|\bp012\b/i.test(
    ffmpegStderr
  );
}

/** Needs a mobile-friendly H.264 MP4 (AV1/HEVC/VP9/10-bit/non-mp4). */
function needsCompatTranscode(ffmpegStderr: string, ext: string): boolean {
  if (isHdrVideo(ffmpegStderr)) return true;
  if (ext !== 'mp4' && ext !== 'mov') return true;
  if (/\bav1\b|\bav01\b|hevc|h265|prores|vp9|vp8|yuv420p10|yuv422p10/i.test(ffmpegStderr)) {
    return true;
  }
  // Odd containers without H.264
  if (!/\bh264\b|\bavc1\b/i.test(ffmpegStderr)) return true;
  return false;
}

/** Hable tone-map → BT.709 SDR 8-bit. Needs ffmpeg built with libzimg (zscale). */
const HDR_TO_SDR_VF =
  'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p';

async function processVideo(data: Buffer, ext: string): Promise<ProcessedMedia> {
  const id = randomUUID();
  const dir = tmpdir();
  const input = path.join(dir, `tafu-in-${id}.${ext}`);
  const primaryOut = path.join(dir, `tafu-out-${id}.mp4`);
  const hdrOut = path.join(dir, `tafu-hdr-${id}.${ext}`);
  await fs.writeFile(input, data);

  try {
    const info = await ffmpegInfo(input);
    const hdr = isHdrVideo(info);

    if (hdr) {
      // Preserve HDR bitstream (strip container tags only)
      await remuxCopy(input, hdrOut);
      // Compatible SDR primary for every client (incl. Firefox mobile)
      await toneMapHdrToSdr(input, primaryOut);
      return {
        data: await fs.readFile(primaryOut),
        hdr: { ext, data: await fs.readFile(hdrOut) }
      };
    }

    if (needsCompatTranscode(info, ext)) {
      await transcodeCompatSdr(input, primaryOut);
      return { data: await fs.readFile(primaryOut) };
    }

    // Already H.264-ish: remux with faststart for mobile progressive download
    await remuxCopy(input, primaryOut, true);
    return { data: await fs.readFile(primaryOut) };
  } finally {
    await Promise.all([
      fs.unlink(input).catch(() => {}),
      fs.unlink(primaryOut).catch(() => {}),
      fs.unlink(hdrOut).catch(() => {})
    ]);
  }
}

async function remuxCopy(input: string, output: string, faststart = false): Promise<void> {
  const args = ['-hide_banner', '-loglevel', 'error', '-i', input, '-map_metadata', '-1', '-c', 'copy'];
  if (faststart || output.endsWith('.mp4') || output.endsWith('.mov')) {
    args.push('-movflags', '+faststart');
  }
  args.push('-y', output);
  await execFileAsync(ffmpegBin(), args, { timeout: 120_000 });
}

async function toneMapHdrToSdr(input: string, output: string): Promise<void> {
  await execFileAsync(
    ffmpegBin(),
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      input,
      '-vf',
      HDR_TO_SDR_VF,
      '-map_metadata',
      '-1',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-colorspace',
      'bt709',
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-level',
      '4.0',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '20',
      '-preset',
      'medium',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      '-y',
      output
    ],
    { timeout: 600_000 }
  );
}

/** Non-HDR but exotic codecs → H.264 yuv420p for Firefox mobile. */
async function transcodeCompatSdr(input: string, output: string): Promise<void> {
  await execFileAsync(
    ffmpegBin(),
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      input,
      '-map_metadata',
      '-1',
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-level',
      '4.0',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '20',
      '-preset',
      'medium',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      '-y',
      output
    ],
    { timeout: 600_000 }
  );
}
