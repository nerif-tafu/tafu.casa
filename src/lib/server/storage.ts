import path from 'node:path';
import { env } from '$env/dynamic/private';

/**
 * All persistent site data (JSON stores + uploaded media) lives here.
 * Defaults to ./data for local dev; the Docker image sets DATA_DIR=/data
 * and mounts a volume there so data survives container restarts.
 */
export const DATA_DIR = env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.resolve('data');
