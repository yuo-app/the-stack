import type { CreateAuthOptions } from './createAuth'
import type { RequestLike, ResponseLike } from './index'
import { createOAuthUris } from '../oauth'
import {
  Cookies,
  CSRF_COOKIE_NAME,
  CSRF_MAX_AGE,
  DEFAULT_COOKIE_SERIALIZE_OPTIONS,
  parseCookies,
  PKCE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from './cookies'
import { createAuth } from './createAuth'
import { json, redirect } from './index'

type Auth = ReturnType<typeof createAuth>

async function handleSignIn(request: RequestLike, auth: Auth, providerId: string): Promise<ResponseLike> {
  const provider = auth.providerMap.get(providerId)
  if (!provider)
    return json({ error: 'Provider not found' }, { status: 400 })

  const { state, codeVerifier } = createOAuthUris()
  const authUrl = await provider.getAuthorizationUrl(state, codeVerifier)

  const requestCookies = parseCookies(request.headers.get('Cookie'))
  const cookies = new Cookies(requestCookies, DEFAULT_COOKIE_SERIALIZE_OPTIONS)

  cookies.set(CSRF_COOKIE_NAME, state, { maxAge: CSRF_MAX_AGE })
  cookies.set(PKCE_COOKIE_NAME, codeVerifier, { maxAge: CSRF_MAX_AGE })

  const response = redirect(authUrl.toString())
  cookies.toHeaders().forEach((value, key) => {
    response.headers.append(key, value)
  })

  return response
}

async function handleCallback(request: RequestLike, auth: Auth, providerId: string): Promise<ResponseLike> {
  const provider = auth.providerMap.get(providerId)
  if (!provider)
    return json({ error: 'Provider not found' }, { status: 400 })

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state)
    return json({ error: 'Missing code or state' }, { status: 400 })

  const requestCookies = parseCookies(request.headers.get('Cookie'))
  const cookies = new Cookies(requestCookies, DEFAULT_COOKIE_SERIALIZE_OPTIONS)

  const savedState = cookies.get(CSRF_COOKIE_NAME)
  if (!savedState || savedState !== state)
    return json({ error: 'Invalid CSRF token' }, { status: 403 })

  const codeVerifier = cookies.get(PKCE_COOKIE_NAME)
  if (!codeVerifier)
    return json({ error: 'Missing PKCE code verifier' }, { status: 400 })

  const { user: providerUser, tokens } = await provider.validateCallback(code, codeVerifier)

  const userFromAccount = await auth.getUserByAccount(providerId, providerUser.id)

  let user = userFromAccount

  if (!user) {
    if (providerUser.email) {
      const existingUser = await auth.getUserByEmail(providerUser.email)
      if (existingUser) {
        const alreadyLinked = await auth.getUserByAccount(providerId, providerUser.id)
        if (alreadyLinked)
          return json({ error: 'Account already linked to another user' }, { status: 400 })

        user = existingUser
      }
    }
    if (!user) {
      try {
        user = await auth.createUser({
          name: providerUser.name,
          email: providerUser.email,
          image: providerUser.avatar,
        })
      }
      catch (error) {
        console.error('Failed to create user:', error)
        return json({ error: 'Failed to create user' }, { status: 500 })
      }
    }
  }

  if (!userFromAccount) {
    // GitHub sometimes doesn't return these which causes arctic to throw an error
    let refreshToken: string | null
    try {
      refreshToken = tokens.refreshToken()
    }
    catch {
      refreshToken = null
    }

    let expiresAt: number | undefined
    try {
      const expiresAtDate = tokens.accessTokenExpiresAt()
      if (expiresAtDate)
        expiresAt = Math.floor(expiresAtDate.getTime() / 1000)
    }
    catch {
    }

    let idToken: string | null
    try {
      idToken = tokens.idToken()
    }
    catch {
      idToken = null
    }

    try {
      await auth.linkAccount({
        userId: user.id,
        provider: providerId,
        providerAccountId: providerUser.id,
        accessToken: tokens.accessToken(),
        refreshToken,
        expiresAt,
        tokenType: tokens.tokenType?.() ?? null,
        scope: tokens.scopes()?.join(' ') ?? null,
        idToken,
      })
    }
    catch (error) {
      console.error('Error linking account:', error)
      return json({ error: 'Failed to link account' }, { status: 500 })
    }
  }

  const sessionToken = await auth.createSession(user.id)

  cookies.set(SESSION_COOKIE_NAME, sessionToken, { maxAge: auth.jwt.ttl })
  cookies.delete(CSRF_COOKIE_NAME)
  cookies.delete(PKCE_COOKIE_NAME)

  const response = redirect('/')
  cookies.toHeaders().forEach((value, key) => {
    response.headers.append(key, value)
  })

  return response
}

async function handleSession(request: RequestLike, auth: Auth): Promise<ResponseLike> {
  const requestCookies = parseCookies(request.headers.get('Cookie'))
  const sessionToken = requestCookies.get(SESSION_COOKIE_NAME)

  if (!sessionToken)
    return json({ user: null, session: null }, { status: 401 })

  try {
    const { user, session } = await auth.validateSession(sessionToken)

    if (!user || !session)
      return json({ user: null, session: null }, { status: 401 })

    return json({ user, session })
  }
  catch (error) {
    console.error('Error validating session:', error)
    return json({ error: 'Failed to validate session' }, { status: 500 })
  }
}

async function handleSignOut(request: RequestLike, _auth: Auth): Promise<ResponseLike> {
  const requestCookies = parseCookies(request.headers.get('Cookie'))
  const cookies = new Cookies(requestCookies, DEFAULT_COOKIE_SERIALIZE_OPTIONS)
  cookies.delete(SESSION_COOKIE_NAME)

  const response = json({ message: 'Signed out' })
  cookies.toHeaders().forEach((value, key) => {
    response.headers.append(key, value)
  })

  return response
}

export function createHandler(options: CreateAuthOptions) {
  const auth = createAuth(options)
  const { providerMap, basePath } = auth

  return async function (request: RequestLike): Promise<ResponseLike> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith(basePath))
      return json({ error: 'Not Found' }, { status: 404 })

    const path = url.pathname.substring(basePath.length)
    const parts = path.split('/').filter(Boolean)
    const action = parts[0]

    if (!action)
      return json({ error: 'Not Found' }, { status: 404 })

    if (request.method === 'GET') {
      if (providerMap.has(action)) {
        if (parts.length === 2 && parts[1] === 'callback')
          return await handleCallback(request, auth, action)

        if (parts.length === 1)
          return await handleSignIn(request, auth, action)
      }
      else if (parts.length === 1 && action === 'session') {
        return await handleSession(request, auth)
      }
    }

    if (request.method === 'POST') {
      if (parts.length === 1 && action === 'signout')
        return await handleSignOut(request, auth)
    }

    return json({ error: 'Not Found' }, { status: 404 })
  }
}
