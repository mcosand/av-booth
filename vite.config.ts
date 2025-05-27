import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build/public',
  },
  server: {
    host: '0.0.0.0',
    port: 2023,
    proxy: {
      '/api': 'http://127.0.0.1:1885'
    }
  }
})
