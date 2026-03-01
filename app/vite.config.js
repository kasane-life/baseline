import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  base: '/baseline/app/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 8787,
  },
  plugins: [
    tailwindcss(),
  ],
});
