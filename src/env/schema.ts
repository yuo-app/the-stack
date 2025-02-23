import { z } from 'zod'

export const serverScheme = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AUTH_GITHUB_ID: z.string(),
  AUTH_GITHUB_SECRET: z.string(),
  AUTH_SECRET: z.string(),
  AUTH_TRUST_HOST: z.string(),
  AUTH_URL: z.string(),
  DB_URL: z.string(),
  TURSO_DB_URL: z.string(),
  TURSO_AUTH_TOKEN: z.string(),
})

export const clientScheme = z.object({
  MODE: z.enum(['development', 'production', 'test']).default('development'),
})
