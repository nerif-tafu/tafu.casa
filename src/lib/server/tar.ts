/**
 * Minimal USTAR tar writer/parser — enough to bundle the database JSON and
 * uploaded media into one backup archive without external dependencies.
 * Handles regular files only.
 */

export type TarEntry = { name: string; data: Buffer };

function writeOctal(header: Buffer, offset: number, length: number, value: number): void {
  header.write(value.toString(8).padStart(length - 1, '0'), offset, 'ascii');
}

export function createTar(entries: TarEntry[]): Buffer {
  const blocks: Buffer[] = [];
  for (const { name, data } of entries) {
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'utf-8');
    writeOctal(header, 100, 8, 0o644); // mode
    writeOctal(header, 108, 8, 0); // uid
    writeOctal(header, 116, 8, 0); // gid
    writeOctal(header, 124, 12, data.length); // size
    writeOctal(header, 136, 12, Math.floor(Date.now() / 1000)); // mtime
    header.fill(0x20, 148, 156); // checksum field = spaces while summing
    header.write('0', 156, 'ascii'); // typeflag: regular file
    header.write('ustar', 257, 'ascii');
    header.write('00', 263, 'ascii');
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');

    blocks.push(header, data);
    const remainder = data.length % 512;
    if (remainder) blocks.push(Buffer.alloc(512 - remainder));
  }
  blocks.push(Buffer.alloc(1024)); // end-of-archive marker
  return Buffer.concat(blocks);
}

export function parseTar(buf: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const name = header.subarray(0, 100).toString('utf-8').replace(/\0.*$/s, '');
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/s, '').trim();
    const size = parseInt(sizeText, 8) || 0;
    const typeflag = String.fromCharCode(header[156]);
    offset += 512;
    if (typeflag === '0' || typeflag === '\0') {
      entries.push({ name, data: Buffer.from(buf.subarray(offset, offset + size)) });
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}
