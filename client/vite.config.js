import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Ajout

export default defineConfig({
  plugins: [react()], // Ajout du plugin
  envDir: '../',
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      clientPort: 443,
    },
  },
});