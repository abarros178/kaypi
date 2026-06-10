import { defineConfig } from 'drizzle-kit';

/**
 * Se ejecuta desde la RAÍZ del repo (ver scripts `db:push`/`db:studio` en el package.json raíz),
 * por eso los paths y la url file: son relativos a la raíz → mismo `kaypi.db` que usa el client.
 */
export default defineConfig({
  schema: './packages/db/src/schema.ts',
  out: './packages/db/drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./kaypi.db',
    ...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}),
  },
});
