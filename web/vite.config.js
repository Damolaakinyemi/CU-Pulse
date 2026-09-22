import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // FastAPI runs on :8000 (see api/README); the browser only ever talks to /api.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
