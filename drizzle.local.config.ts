import { defineConfig } from 'drizzle-kit'
import { serverEnv } from '~/env/server'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/local.ts',
  out: './drizzle/localMigrations',
  dbCredentials: {
    url: serverEnv.DB_URL,
  },
})
