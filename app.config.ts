import process from 'node:process'
import { defineConfig } from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'

const host = process.env.TAURI_DEV_HOST
const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  ssr: false,
  vite: {
    worker: {
      format: 'es',
    },
    plugins: [UnoCSS()],
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
      include: ['@auth/core'],
    },
    envPrefix: ['VITE_', 'TAURI_'],
  },
  server: {
    compatibilityDate: '2025-07-08',
    preset: isTauri ? 'static' : 'cloudflare_module',
    routeRules: {
      '/**': { headers: { 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Opener-Policy': 'same-origin' } },
    },
    cloudflare: isTauri
      ? undefined
      : {
          deployConfig: true,
          wrangler: {
            observability: {
              enabled: true,
            },
          },
        },
  },
})
