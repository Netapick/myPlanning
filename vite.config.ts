import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }
import { localStorePlugin } from './vite-plugin-local-store.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localStorePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 1430,
    strictPort: true,
    // 127.0.0.1 et pas `host: true` : l'app n'a pas d'authentification, elle
    // ne doit pas être exposée au réseau local.
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
