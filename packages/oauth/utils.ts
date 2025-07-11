import { generateCodeVerifier, generateState } from 'arctic'

export function createOAuthUris() {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  return {
    state,
    codeVerifier,
  }
}
