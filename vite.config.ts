import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const isContentScript = process.env.BUILD_TARGET === 'content'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: isContentScript
    ? {
        rollupOptions: {
          input: { content: resolve(__dirname, 'src/content/index.tsx') },
          output: {
            entryFileNames: '[name].js',
            assetFileNames: 'assets/[name].[ext]',
            inlineDynamicImports: true,
          },
        },
        outDir: 'dist',
        emptyOutDir: false,
      }
    : {
        rollupOptions: {
          input: {
            popup: resolve(__dirname, 'popup.html'),
            background: resolve(__dirname, 'src/background/index.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name].[hash].js',
            assetFileNames: 'assets/[name].[ext]',
          },
        },
        outDir: 'dist',
        emptyOutDir: true,
      },
})
