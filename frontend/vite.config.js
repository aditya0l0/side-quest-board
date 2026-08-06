import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  // Dev server proxy: mirrors Nginx's /api → backend routing.
  // This allows questApi.js to use a relative '/api' baseURL in both
  // local dev and production without any environment-specific config.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
