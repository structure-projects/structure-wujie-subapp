import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'StructureWujieSubapp',
      fileName: (format) => {
        if (format === 'es') {
          return 'index.mjs'
        }
        return 'index.js'
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', 'wujie-vue3']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
