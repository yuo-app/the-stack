import process from 'node:process'
import { defineConfig } from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  ssr: true,
  vite: {
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
  },
  server: {
    preset: 'cloudflare_pages',
    routeRules: {
      '/**': { headers: { 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Opener-Policy': 'same-origin' } },
    },
  },
})
