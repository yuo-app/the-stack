import type { AuthUser, OAuthProvider, OAuthProviderConfig } from '../index'
import { CodeChallengeMethod, OAuth2Client } from 'arctic'

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_URL = 'https://api.github.com'

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  name: string
  email: string | null
  [key: string]: unknown
}

async function getUser(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'gau',
      'Accept': 'application/vnd.github+json',
    },
  })
  const data: GitHubUser = await response.json()

  return {
    id: data.id.toString(),
    name: data.name ?? data.login,
    email: data.email,
    avatar: data.avatar_url,
    raw: data,
  }
}

export function GitHub(config: OAuthProviderConfig): OAuthProvider {
  const defaultClient = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri ?? null)

  function getClient(redirectUri?: string): OAuth2Client {
    if (!redirectUri || (config.redirectUri && redirectUri === config.redirectUri))
      return defaultClient

    return new OAuth2Client(config.clientId, config.clientSecret, redirectUri)
  }

  return {
    id: 'github',

    async getAuthorizationUrl(state: string, codeVerifier: string, options?: { scopes?: string[], redirectUri?: string }) {
      const client = getClient(options?.redirectUri)
      const scopes = options?.scopes ?? config.scope ?? []
      const url = await client.createAuthorizationURLWithPKCE(GITHUB_AUTH_URL, state, CodeChallengeMethod.S256, codeVerifier, scopes)
      return url
    },

    async validateCallback(code: string, codeVerifier: string, redirectUri?: string) {
      const client = getClient(redirectUri)
      const tokens = await client.validateAuthorizationCode(GITHUB_TOKEN_URL, code, codeVerifier)
      const user = await getUser(tokens.accessToken())
      return { tokens, user }
    },
  }
}
