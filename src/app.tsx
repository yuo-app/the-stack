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
    const unlisten = listen<string>('deep-link://url', async (event) => {
      const url = new URL(event.payload)
      const callbackUrl = new URL(`${clientEnv.VITE_API_URL}${url.pathname}${url.search}`)

      try {
        await fetch(callbackUrl.href, { credentials: 'include' })
        window.location.reload()
      }
      catch (error) {
        console.error('Failed to process auth callback:', error)
      }
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
