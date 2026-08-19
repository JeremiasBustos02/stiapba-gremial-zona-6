import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
