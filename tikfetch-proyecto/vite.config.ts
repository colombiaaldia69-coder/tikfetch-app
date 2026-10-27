import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        'fsevents',
        'fs',
        'path',
        'crypto',
        'stream',
        'http',
        'https',
        'url',
        'util',
        'os',
        'buffer'
      ]
    }
  }
});
