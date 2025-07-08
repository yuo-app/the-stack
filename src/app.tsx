// @refresh reload
import { SessionProvider } from '@solid-mediakit/auth/client'
import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import { clientEnv } from '~/env/client'
import { StoreProvider } from '~/stores/store'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

export default function App() {
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
