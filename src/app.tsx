// @refresh reload
import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { AuthProvider } from 'packages/client/solid'
import { Suspense } from 'solid-js'
import { clientEnv } from '~/env/client'
import { StoreProvider } from '~/stores/store'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

console.log('clientEnv.VITE_API_URL', clientEnv.VITE_API_URL)

export default function App() {
  return (
    <Router
      root={props => (
        <AuthProvider baseUrl={clientEnv.VITE_API_URL}>
          <StoreProvider>
            <Suspense>{props.children}</Suspense>
          </StoreProvider>
        </AuthProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
