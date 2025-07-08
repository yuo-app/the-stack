// @refresh reload
import { SessionProvider } from '@solid-mediakit/auth/client'
import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { listen } from '@tauri-apps/api/event'
import { onMount, Suspense } from 'solid-js'
import { clientEnv } from '~/env/client'
import { StoreProvider } from '~/stores/store'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

export default function App() {
  onMount(() => {
    const unlisten = listen<string>('deep-link://url', (event) => {
      const url = new URL(event.payload)
      const callbackUrl = new URL(`${clientEnv.VITE_API_URL}${url.pathname}${url.search}`)
      window.location.href = callbackUrl.href
    })

    return () => {
      unlisten.then(f => f())
    }
  })

  return (
    <Router
      root={props => (
        <SessionProvider baseUrl={clientEnv.VITE_API_URL}>
          <StoreProvider>
            <Suspense>{props.children}</Suspense>
          </StoreProvider>
        </SessionProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
