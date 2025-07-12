import type { Accessor, ParentProps } from 'solid-js'
import type { User } from '../../core'
import { listen } from '@tauri-apps/api/event'
import { createContext, createResource, onMount, useContext } from 'solid-js'
import { isServer } from 'solid-js/web'

interface Session {
  user: User | null
}

interface AuthContextValue {
  session: Accessor<Session | null>
  signIn: (provider: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>()

function getStoredToken() {
  if (typeof localStorage === 'undefined')
    return null
  return localStorage.getItem('gau-token')
}

function storeToken(token: string) {
  try {
    localStorage.setItem('gau-token', token)
  }
  catch {}
}

function clearToken() {
  try {
    localStorage.removeItem('gau-token')
  }
  catch {}
}

export function AuthProvider(props: ParentProps & { baseUrl: string }) {
  const [session, { refetch }] = createResource<Session | null>(
    async () => {
      if (isServer)
        return null

      const token = getStoredToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const res = await fetch(`${props.baseUrl}/session`, { credentials: 'include', headers })
      if (!res.ok)
        return null

      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json'))
        return res.json()

      return null
    },
    { initialValue: null },
  )

  const isTauri = !!import.meta.env.TAURI_ENV_PLATFORM

  async function signIn(provider: string) {
    // For Tauri, the final redirect after the backend is done should be our custom protocol.
    const redirectTo = encodeURIComponent('the-stack://oauth/callback')
    const authUrl = `${props.baseUrl}/${provider}?redirectTo=${redirectTo}`

    if (isTauri) {
      const shell = await import('@tauri-apps/plugin-shell')
      await shell.open(authUrl)
    }
    else {
      // Standard web flow
      window.location.href = authUrl
    }
  }

  const signOut = async () => {
    clearToken()
    document.cookie = '__gau-session-token=; path=/; max-age=0'
    await fetch(`${props.baseUrl}/signout`, { method: 'POST', credentials: 'include' })
    refetch()
  }

  async function handleDeepLink(url: string) {
    console.log(`[handleDeepLink] Received URL: ${url}`)
    const parsed = new URL(url)
    if (parsed.protocol !== 'the-stack:') {
      console.log(`[handleDeepLink] URL protocol is not 'the-stack:', ignoring.`)
      return
    }

    const code = parsed.searchParams.get('code')
    const state = parsed.searchParams.get('state')
    const token = parsed.searchParams.get('token')

    if (token) {
      // We received a token from the backend redirect. Set it as a cookie and refetch the session.
      // This is a client-side cookie for the app's domain, which is fine.
      document.cookie = `__gau-session-token=${token}; path=/; max-age=31536000; samesite=lax`
      storeToken(token)
      console.log('[handleDeepLink] Session token received and set. Refetching session...')
      await refetch()
      return
    }

    console.log(`[handleDeepLink] Extracted code: ${code}, state: ${state}`)

    if (code && state) {
      console.log('[handleDeepLink] Code and state found, attempting to finalize sign-in...')
      const callbackUrl = `${props.baseUrl}/github/callback?code=${code}&state=${state}&redirect=false`
      console.log(`[handleDeepLink] Fetching: ${callbackUrl}`)
      const callbackRes = await fetch(callbackUrl, { credentials: 'include' })

      console.log(`[handleDeepLink] Callback response status: ${callbackRes.status}`)
      if (callbackRes.ok) {
        console.log('[handleDeepLink] Callback successful, refetching session.')
        refetch()
      }
      else {
        console.error('[handleDeepLink] Callback request failed.', await callbackRes.text())
      }
    }
  }

  onMount(async () => {
    console.log('[onMount] Setting up deep link listener...')
    if (!isTauri) {
      console.log('[onMount] Not a Tauri environment, skipping deep link setup.')
      return
    }

    await listen<string>('deep-link', async (event) => {
      console.log('[deep-link] Event received. URL:', event.payload)
      await handleDeepLink(event.payload)
    })

    console.log('[onMount] deep-link listener attached.')

    // For initial launch with URL, it should be emitted from Rust setup
  })

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context)
    throw new Error('useAuth must be used within an AuthProvider')
  return context
}
