import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/notes-ai/',
  optimizeDeps: {
    include: [
      '@tiptap/react', 
      '@tiptap/core', 
      '@tiptap/starter-kit',
      'use-sync-external-store'
    ]
  }
})
