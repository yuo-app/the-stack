import type { createAuth } from './createAuth'
import type { RequestLike, ResponseLike } from './index'
import { createOAuthUris } from '../oauth'
import {
  Cookies,
  CSRF_COOKIE_NAME,
  CSRF_MAX_AGE,
  parseCookies,
  PKCE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from './cookies'
import { json, redirect } from './index'

type Auth = ReturnType<typeof createAuth>

async function handleSignIn(request: RequestLike, auth: Auth, providerId: string): Promise<ResponseLike> {
  const provider = auth.providerMap.get(providerId)
  if (!provider)
    return json({ error: 'Provider not found' }, { status: 400 })

  const { state: originalState, codeVerifier } = createOAuthUris()
  const url = new URL(request.url)
  const redirectTo = url.searchParams.get('redirectTo')
  const state = redirectTo ? `${originalState}.${btoa(redirectTo)}` : originalState
  const authUrl = await provider.getAuthorizationUrl(state, codeVerifier)

  const requestCookies = parseCookies(request.headers.get('Cookie'))
  const cookies = new Cookies(requestCookies, auth.cookieOptions)

  cookies.set(CSRF_COOKIE_NAME, originalState, { maxAge: CSRF_MAX_AGE, sameSite: 'none' })
  cookies.set(PKCE_COOKIE_NAME, codeVerifier, { maxAge: CSRF_MAX_AGE, sameSite: 'none' })

  const redirectParam = url.searchParams.get('redirect')

  if (redirectParam === 'false') {
    const response = json({ url: authUrl.toString() })
    cookies.toHeaders().forEach((value, key) => {
      response.headers.append(key, value)
    })
    return response
  }

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
  const cookies = new Cookies(requestCookies, auth.cookieOptions)

  let savedState: string | undefined
  let redirectTo = '/'
  if (state.includes('.')) {
    const [originalSavedState, encodedRedirect] = state.split('.')
    savedState = originalSavedState
    try {
      redirectTo = atob(encodedRedirect ?? '') || '/'
    }
    catch {
      redirectTo = '/'
    }
  }
  else {
    savedState = state
  }

  const csrfToken = cookies.get(CSRF_COOKIE_NAME)

  if (!csrfToken || csrfToken !== savedState)
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

  cookies.set(SESSION_COOKIE_NAME, sessionToken, { maxAge: auth.jwt.ttl, sameSite: 'none', secure: true })
  cookies.delete(CSRF_COOKIE_NAME)
  cookies.delete(PKCE_COOKIE_NAME)

  const response = redirect(redirectTo)
  cookies.toHeaders().forEach((value, key) => {
    response.headers.append(key, value)
  })

  return response
}

async function handleSession(request: RequestLike, auth: Auth): Promise<ResponseLike> {
  const rawCookieHeader = request.headers.get('Cookie')
  const requestCookies = parseCookies(rawCookieHeader)
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

async function handleSignOut(request: RequestLike, auth: Auth): Promise<ResponseLike> {
  const requestCookies = parseCookies(request.headers.get('Cookie'))
  const cookies = new Cookies(requestCookies, auth.cookieOptions)
  cookies.delete(SESSION_COOKIE_NAME, { sameSite: 'none', secure: true })

  const response = json({ message: 'Signed out' })
  cookies.toHeaders().forEach((value, key) => {
    response.headers.append(key, value)
  })

  return response
}

export function createHandler(auth: Auth) {
  const { providerMap, basePath } = auth

  function applyCors(request: RequestLike, response: Response): Response {
    const origin = request.headers.get('Origin') || request.headers.get('origin')
    if (!origin)
      return response
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response
  }

  return async function (request: RequestLike): Promise<ResponseLike> {
    // Handle preflight requests early
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || request.headers.get('origin') || '*'
      const res = new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      })
      return res
    }

    const url = new URL(request.url)
    if (!url.pathname.startsWith(basePath))
      return applyCors(request, json({ error: 'Not Found' }, { status: 404 }))

    if (request.method === 'POST' && !verifyRequestOrigin(request, auth.trustHosts))
      return applyCors(request, json({ error: 'Forbidden' }, { status: 403 }))

    const path = url.pathname.substring(basePath.length)
    const parts = path.split('/').filter(Boolean)
    const action = parts[0]

    if (!action)
      return applyCors(request, json({ error: 'Not Found' }, { status: 404 }))

    let response: ResponseLike

    if (request.method === 'GET') {
      if (providerMap.has(action)) {
        if (parts.length === 2 && parts[1] === 'callback')
          response = await handleCallback(request, auth, action)
        else if (parts.length === 1)
          response = await handleSignIn(request, auth, action)
        else
          response = json({ error: 'Not Found' }, { status: 404 })
      }
      else if (parts.length === 1 && action === 'session') {
        response = await handleSession(request, auth)
      }
      else {
        response = json({ error: 'Not Found' }, { status: 404 })
      }
    }
    else if (request.method === 'POST') {
      if (parts.length === 1 && action === 'signout')
        response = await handleSignOut(request, auth)
      else
        response = json({ error: 'Not Found' }, { status: 404 })
    }
    else {
      response = json({ error: 'Method Not Allowed' }, { status: 405 })
    }

    return applyCors(request, response as Response)
  }
}

function verifyRequestOrigin(request: RequestLike, trustHosts: 'all' | string[]): boolean {
  if (trustHosts === 'all')
    return true

  const origin = request.headers.get('origin')

  if (!origin)
    return false

  let originHost: string
  try {
    originHost = new URL(origin).host
  }
  catch {
    return false
  }

  const requestUrl = new URL(request.url)
  const requestHost = requestUrl.host
  const requestOrigin = `${requestUrl.protocol}//${requestHost}`

  if (origin === requestOrigin)
    return true

  return trustHosts.includes(originHost)
}
