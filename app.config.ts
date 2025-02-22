import process from 'node:process'
import { defineConfig } from '@solidjs/start/config'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  ssr: false,
  server: {
    routeRules: {
      '/**': { headers: { 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Opener-Policy': 'same-origin' } },
    },
  },
  vite: {
    server: {
      port: 3000,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 3001,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    optimizeDeps: {
      exclude: ['sqlocal'],
    },
  },
})
