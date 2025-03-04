import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig(({ mode }) => {
	const useSSL = process.env.USE_SSL === 'true';
	
	return {
		plugins: [sveltekit()],
		server: {
			host: '0.0.0.0',
			port: 3000,
			strictPort: true,
			watch: {
				usePolling: true
			},
			...(useSSL && {
				https: {
					key: fs.readFileSync('./nginx/certs/private.key'),
					cert: fs.readFileSync('./nginx/certs/certificate.crt'),
				}
			})
		}
	};
}); 