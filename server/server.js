// Fichier : server/server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

// Import des nouveaux modules
import { initLogger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import playerRoutes from './routes/player.routes.js';

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3001;

app.use(express.json());

// Initialise le système de logs personnalisé
initLogger();

// --- MONTAGE DES ROUTES ---
// Toutes les routes sont préfixées par /api
app.use('/api', authRoutes);   // Token, Join, Liste Sessions
app.use('/api', adminRoutes);  // Admin, Logs, Création/Suppression Sessions
app.use('/api', playerRoutes); // Jeu, Stats, Argent

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});