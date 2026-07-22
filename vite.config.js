import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'client',
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    proxy: { '/api': 'http://localhost:4100' },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
