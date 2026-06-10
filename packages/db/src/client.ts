import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * Encuentra la raíz del monorepo (el package.json con name "kaypi") subiendo desde
 * el cwd. Así la DB local vive SIEMPRE en `<raíz>/kaypi.db`, sin importar desde dónde
 * se ejecute (Next en apps/web, seed/drizzle-kit en la raíz, etc.).
 */
function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const j = JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string };
        if (j.name === 'kaypi') return dir;
      } catch {
        /* ignorar package.json ilegible */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const url = process.env.DATABASE_URL ?? `file:${join(repoRoot(), 'kaypi.db')}`;
const authToken = process.env.DATABASE_AUTH_TOKEN;

export const libsql = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(libsql, { schema });
export type DB = typeof db;
