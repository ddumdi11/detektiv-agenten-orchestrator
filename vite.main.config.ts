import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    rollupOptions: {
      // Externalize ChromaDB dependencies to avoid bundling issues in Electron
      external: [
        '@chroma-core/default-embed',
        '@chroma-core/chromadb',
        'chromadb',
      ],
    },
  },
});
