import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csrf: {
			checkOrigin: false
		},
		paths: {
			base: ''
		},
		alias: {
			$lib: './src/lib'
		},
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				if (message.includes('Not Found')) {
					return;
				}
				throw new Error(`${path} ${referrer} ${message}`);
			}
		}
	}
};

export default config; 