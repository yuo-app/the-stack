import type { OAuth2Tokens } from 'arctic'

export * from './providers/github'
export * from './utils'

export interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri?: string
  scope?: string[]
}

export interface AuthUser {
  id: string
  name: string
  email: string | null
  avatar: string | null
  raw: Record<string, unknown>
}

export interface OAuthProvider {
  id: string
  getAuthorizationUrl: (state: string, codeVerifier: string, options?: { scopes?: string[] }) => Promise<URL>
  validateCallback: (code: string, codeVerifier: string) => Promise<{ tokens: OAuth2Tokens, user: AuthUser }>
}
