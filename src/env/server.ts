import type { ZodFormattedError } from 'zod'
import process from 'node:process'
import { serverScheme } from './schema'

export function formatErrors(errors: ZodFormattedError<Map<string, string>, string>) {
  return Object.entries(errors)
    .map(([name, value]) => {
      if (value && '_errors' in value)
        return `${name}: ${value._errors.join(', ')}\n`
      return ''
    })
    .filter(Boolean)
}

const env = serverScheme.safeParse(process.env)

if (env.success === false) {
  console.error(
    '❌ Invalid server environment variables:\n',
    ...formatErrors(env.error.format()),
  )
  throw new Error('Invalid server environment variables')
}

export const serverEnv = env.data
