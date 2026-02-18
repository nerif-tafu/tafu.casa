// Raw text imports for the three ASCII art variants
// Widths: 40, 60, 100 characters
// Vite handles `?raw` to load file contents as strings.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - handled via app.d.ts declaration
import ascii40Raw from './ascii-art-40.txt?raw';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - handled via app.d.ts declaration
import ascii60Raw from './ascii-art-60.txt?raw';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - handled via app.d.ts declaration
import ascii100Raw from './ascii-art-100.txt?raw';

export const ascii40 = ascii40Raw.trimEnd();
export const ascii60 = ascii60Raw.trimEnd();
export const ascii100 = ascii100Raw.trimEnd();

