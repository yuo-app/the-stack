import type { ParentProps } from 'solid-js'
import type { SetStoreFunction, Store } from 'solid-js/store'
import { useAuth } from 'packages/client/solid'
import { createContext, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { localDb } from '~/db'

interface StoreState {
  initialized: Promise<void>
  user: any | undefined
}

type StoreContextType = [
  Store<StoreState>,
  SetStoreFunction<StoreState>,
]

const StoreContext = createContext<StoreContextType>()

export function StoreProvider(props: ParentProps) {
  const { session } = useAuth()
  let resolveInitialized: () => void

  const [state, setState] = createStore<StoreState>({
    initialized: new Promise((resolve) => { resolveInitialized = resolve }),
    user: undefined,
  })

  onMount(async () => {
    const s = session()
    if (!s)
      setState({ user: undefined })
    else if (s.user)
      setState({ user: s.user })
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
