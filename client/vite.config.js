import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // 1. On définit le chemin vers la racine du projet (là où est le .env)
  const rootPath = path.resolve(process.cwd()); // Utilise le dossier courant comme base
  
  // 2. On charge le .env depuis la racine
  const env = loadEnv(mode, rootPath, '');

  // 3. (DEBUG) On affiche l'ID dans le terminal pour être sûr qu'il est chargé
  console.log("🔹 CHARGEMENT ENV - ID CLIENT TROUVÉ :", env.CLIENT_ID);

  return {
    plugins: [react()],
    define: {
      // On injecte la variable pour le client
      'process.env.CLIENT_ID': JSON.stringify(env.CLIENT_ID),
    },
    envDir: '../', // Indique à Vite que les fichiers d'env sont au niveau supérieur
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
  };
});