import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On remonte d'un dossier pour trouver le .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3001;
const DB_PATH = path.join(__dirname, '../bot/src/db/database.json');

app.use(express.json());

// --- Fonctions Base de Données ---
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { sessions: {}, userSessions: {} };
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// --- Routes ---

app.get("/api/sessions", async (req, res) => {
  const db = await readDB();
  res.json(Object.keys(db.sessions || {}));
});

// NOUVEAU : Récupérer les données d'un joueur
app.post("/api/player", async (req, res) => {
  const { user_id, session_id } = req.body;
  const db = await readDB();

  const session = db.sessions[session_id];
  if (!session) return res.status(404).json({ error: "Session introuvable" });

  const player = session.players?.[user_id];
  if (!player) {
    // Si le joueur n'existe pas encore, on renvoie une structure vide par défaut
    // pour éviter que le site plante
    return res.json({
      joueur: { force: 0, constitution: 0, agilite: 0, intelligence: 0, perception: 0, hp: 0, hpMax: 0, mana: 0, manaMax: 0, stam: 0, stamMax: 0 },
      money: { bank: { pc:0, pa:0, po:0, pp:0 }, wallet: { pc:0, pa:0, po:0, pp:0 } }
    });
  }

  res.json(player);
});

app.post("/api/token", async (req, res) => {
  try {
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.body.code,
      }),
    });
    const data = await response.json();
    res.send({ access_token: data.access_token });
  } catch (e) {
    res.status(500).send({ error: "Erreur interne" });
  }
});

app.post("/api/join", async (req, res) => {
  const { user_id, session_id } = req.body;
  if (!user_id || !session_id) return res.status(400).json({ error: "Manque des infos" });

  const db = await readDB();
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session inexistante" });
  
  if (!db.userSessions) db.userSessions = {};
  db.userSessions[user_id] = session_id;

  if (!db.sessions[session_id].players) db.sessions[session_id].players = {};
  // On initialise le joueur s'il n'existe pas
  if (!db.sessions[session_id].players[user_id]) {
    db.sessions[session_id].players[user_id] = {
      joueur: { force: 10, constitution: 10, agilite: 10, intelligence: 10, perception: 10, hp: 20, hpMax: 20, mana: 50, manaMax: 50, stam: 50, stamMax: 50 },
      money: { bank: { pc: 0, pa: 0, po: 0, pp: 0 }, wallet: { pc: 0, pa: 0, po: 0, pp: 0 } },
    };
    await writeDB(db);
  } else {
    // On met à jour le lien userSession même si le joueur existe
    await writeDB(db);
  }
  
  console.log(`Joueur ${user_id} -> Session ${session_id}`);
  res.json({ success: true, session_id });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});