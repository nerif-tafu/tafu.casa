import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  server: {
    // Uploads change under data/; watching them races with ffmpeg/writes on Windows
    watch: {
      ignored: ['**/data/**']
    }
  }
};

export default config;
