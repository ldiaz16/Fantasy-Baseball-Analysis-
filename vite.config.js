import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'frontend',                 // 👈 tell Vite where index.html lives
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    outDir: 'dist',                 // output to frontend/dist
    emptyOutDir: true
  }
})
