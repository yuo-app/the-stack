// TODO: Implement provider-agnostic OAuth helpers
export interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri?: string
}

export const _oauthPlaceholder = true
