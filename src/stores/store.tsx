import type { Session } from '@solid-mediakit/auth'
import type { ParentProps } from 'solid-js'
import type { SetStoreFunction, Store } from 'solid-js/store'
import { useAuth } from '@solid-mediakit/auth/client'
import { createContext, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { localDb } from '~/db'

interface StoreState {
  initialized: Promise<void>
  user: Session['user']
}

type StoreContextType = [
  Store<StoreState>,
  SetStoreFunction<StoreState>,
]

const StoreContext = createContext<StoreContextType>()

export function StoreProvider(props: ParentProps) {
  const auth = useAuth()
  let resolveInitialized: () => void

  const [state, setState] = createStore<StoreState>({
    initialized: new Promise((resolve) => { resolveInitialized = resolve }),
    user: undefined,
  })

  onMount(async () => {
    const session = auth.session()
    if (!session)
      setState({ user: undefined })
    else if (session.user)
      setState({ user: session.user })
  })

  onMount(async () => {
    await localDb.connect()
    resolveInitialized()
  })

  return (
    <StoreContext.Provider value={[state, setState]}>
      {props.children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context)
    throw new Error('useStore must be used within a StoreProvider')

  return context
}
