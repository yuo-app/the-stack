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

export function AuthProvider(props: ParentProps & { baseUrl: string }) {
  const [session, { refetch }] = createResource<Session | null>(
    async () => {
      if (isServer)
        return null
      const res = await fetch(`${props.baseUrl}/session`, { credentials: 'include' })
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
    const redirectTo = encodeURIComponent(window.location.href)
    let fetchUrl = `${props.baseUrl}/${provider}?redirect=false&redirectTo=${redirectTo}`
    let openFunc = (url: string) => {
      window.location.href = url
      return Promise.resolve()
    }

    if (isTauri) {
      const callbackUri = 'the-stack://oauth/callback'
      fetchUrl += `&callbackUri=${encodeURIComponent(callbackUri)}`
      const shell = await import('@tauri-apps/plugin-shell')
      openFunc = shell.open
    }

    const res = await fetch(fetchUrl, { credentials: 'include' })
    const data = await res.json()
    if (data.url)
      await openFunc(data.url)
  }

  const signOut = async () => {
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
