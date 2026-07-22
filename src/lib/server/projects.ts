import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './storage';

export type Project = {
  id: string;
  title: string;
  url: string;
  description: string;
};

const DATA_FILE = path.join(DATA_DIR, 'projects.json');

export async function getProjects(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2) + '\n', 'utf-8');
}
