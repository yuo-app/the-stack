import type { Accessor, ParentProps } from 'solid-js'
import type { User } from '../../core'
import { createContext, createResource, useContext } from 'solid-js'
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

  const signIn = async (provider: string) => {
    const redirectTo = encodeURIComponent(window.location.href)
    const res = await fetch(`${props.baseUrl}/${provider}?redirect=false&redirectTo=${redirectTo}`, { credentials: 'include' })
    const data = await res.json()
    if (data.url)
      window.location.href = data.url
  }

  const signOut = async () => {
    await fetch(`${props.baseUrl}/signout`, { method: 'POST', credentials: 'include' })
    refetch()
  }

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
