import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle/migrations/',
  dbCredentials: {
    url: process.env.DB_URL,
  },
})
