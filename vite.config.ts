import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  build: {
    outDir: 'build/public',
  },
  server: {
    host: '0.0.0.0',
    port: 2023,
    proxy: {
      '/api': 'http://127.0.0.1:1885',
      '/ws': {
        target: 'ws://127.0.0.1:1885',
        ws: true,
        rewriteWsOrigin: true,
      },
    }
  }
})
