import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
	const config = {
		plugins: [sveltekit()],
		server: {
			host: '0.0.0.0',
			port: 9000,
			strictPort: true,
			watch: {
				usePolling: true
			}
		}
	};

	// Add HTTPS configuration only if USE_SSL is true
	if (process.env.USE_SSL === 'true') {
		try {
			config.server.https = {
				key: fs.readFileSync(path.resolve('./certs/private.key')),
				cert: fs.readFileSync(path.resolve('./certs/certificate.crt'))
			};
		} catch (error) {
			console.warn('SSL certificates not found, falling back to HTTP');
		}
	}

	return config;
}); 