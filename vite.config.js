import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
	const config = {
		plugins: [sveltekit()],
		server: {
			host: true,
			port: 9000,
			strictPort: true,
			hmr: {
				clientPort: 443
			},
			proxy: {
				'/socket.io': {
					target: 'ws://backend:9000',
					ws: true
				}
			},
			cors: true,
			headers: {
				'Access-Control-Allow-Origin': '*'
			},
			host: '0.0.0.0',
			allowedHosts: [
				'localhost',
				'.tafu.casa',
				'staging.tafu.casa',
				'*.demo.tafu.casa'
			]
		},
		preview: {
			host: true,
			port: 9000,
			strictPort: true
		},
		optimizeDeps: {
			exclude: ['@sveltejs/kit']
		},
		fs: {
			strict: false,
			allow: ['.']
		}
	};

	// Add HTTPS configuration only if USE_SSL is true
	if (process.env.USE_SSL === 'true') {
		try {
			config.server.https = {
				key: fs.readFileSync(path.resolve('./docker/dev/setup/certs/private.key')),
				cert: fs.readFileSync(path.resolve('./docker/dev/setup/certs/certificate.crt'))
			};
		} catch (error) {
			console.warn('SSL certificates not found, falling back to HTTP');
		}
	}

	return config;
}); 