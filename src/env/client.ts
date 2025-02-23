import type { ZodFormattedError } from 'zod'
import { clientScheme } from './schema'

export function formatErrors(errors: ZodFormattedError<Map<string, string>, string>) {
  return Object.entries(errors)
    .map(([name, value]) => {
      if (value && '_errors' in value)
        return `${name}: ${value._errors.join(', ')}\n`
      return ''
    })
    .filter(Boolean)
}

const env = clientScheme.safeParse(import.meta.env)

if (env.success === false) {
  console.error(
    '❌ Invalid client environment variables:\n',
    ...formatErrors(env.error.format()),
  )
  throw new Error('Invalid client environment variables')
}

export const clientEnv = env.data
