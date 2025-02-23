import { defineConfig } from 'drizzle-kit'
import { serverEnv } from '~/env/server'

export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema/remote.ts',
  out: './drizzle/remoteMigrations',
  dbCredentials: {
    url: serverEnv.TURSO_DB_URL,
    authToken: serverEnv.TURSO_AUTH_TOKEN,
  },
})
