import type { CreateAuthOptions } from '../../core'
import { createAuth } from '../../core'

/**
 * Creates an auth instance configured for Cloudflare Workers,
 * automatically trusting all hosts since Workers handle proxies securely.
 */
export function cloudflareAuth(options: CreateAuthOptions) {
  return createAuth({
    ...options,
    trustHosts: 'all',
  })
}
