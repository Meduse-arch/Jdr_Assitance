import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from 'url';

import { readDB, writeDB } from './db.js';
import { checkAdmin, calculateStats, processTransfer, processRepos, processRoll, processResourceMod, processMoneyMod, processStatMod, processExchange } from './actions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3001;

app.use(express.json());

// --- SYSTÈME DE LOGS (ADMIN CONSOLE) ---
const globalLogs = [];
const MAX_LOGS = 50;

// On surcharge console.log pour capturer les messages
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args); // On continue d'afficher dans le vrai terminal
  
  // On formate le message pour le stocker
  const msg = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  // On ajoute au début du tableau (plus récent en haut)
  globalLogs.unshift({ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text: msg });
  
  // On garde seulement les X derniers logs
  if (globalLogs.length > MAX_LOGS) globalLogs.pop();
};

// --- ROUTES ---

// Route pour récupérer les logs (Admin seulement en théorie)
app.get("/api/admin/logs", (req, res) => {
  res.json(globalLogs);
});

// Route Admin pour récupérer la liste des joueurs/PNJ d'une session (SÉPARÉE)
app.post("/api/admin/session/players", async (req, res) => {
  const { access_token, guild_id, session_id } = req.body;
  if (!await checkAdmin(access_token, guild_id)) return res.status(403).json({ error: "Non autorisé" });
  
  const db = await readDB();
  const session = db.sessions[session_id];
  
  // Si la session n'existe pas, on renvoie des tableaux vides
  if (!session) return res.json({ players: [], pnjs: [] });

  // 1. Récupération des Joueurs
  const playersList = Object.entries(session.players || {}).map(([id, data]) => ({
    id,
    username: data.username || "Inconnu",
    type: 'player'
  }));

  // 2. Récupération des PNJ (Même si "pnj" n'existe pas encore dans la DB, ça renverra vide sans planter)
  const pnjList = Object.entries(session.pnj || {}).map(([id, data]) => ({
    id,
    username: data.nom || "PNJ Sans Nom", // On suppose que les PNJ auront une prop "nom"
    type: 'pnj'
  }));

  res.json({ players: playersList, pnjs: pnjList });
});

app.get("/api/sessions", async (req, res) => { 
  const db = await readDB(); 
  res.json(Object.keys(db.sessions || {})); 
});

app.post("/api/check-admin", async (req, res) => { 
  const { access_token, guild_id } = req.body; 
  const isAdmin = await checkAdmin(access_token, guild_id); 
  res.json({ isAdmin }); 
});

app.post("/api/sessions/create", async (req, res) => { 
  const { access_token, guild_id, session_id, force } = req.body; 
  if (!await checkAdmin(access_token, guild_id)) return res.status(403).json({ error: "Non autorisé" }); 
  if (!session_id) return res.status(400).json({ error: "Nom vide" }); 
  const db = await readDB(); 
  if (db.sessions[session_id] && !force) return res.status(409).json({ error: "Existe déjà" }); 
  db.sessions[session_id] = { players: {} }; 
  await writeDB(db); 
  console.log(`[ADMIN] Session créée : ${session_id}`);
  res.json({ success: true, list: Object.keys(db.sessions) }); 
});

app.post("/api/sessions/delete", async (req, res) => { 
  const { access_token, guild_id, session_id } = req.body; 
  if (!await checkAdmin(access_token, guild_id)) return res.status(403).json({ error: "Non autorisé" }); 
  const db = await readDB(); 
  if (db.sessions[session_id]) { 
    delete db.sessions[session_id]; 
    for (const uid in db.userSessions) { 
      if (db.userSessions[uid] === session_id) delete db.userSessions[uid]; 
    } 
    await writeDB(db); 
    console.log(`[ADMIN] Session supprimée : ${session_id}`);
  } 
  res.json({ success: true, list: Object.keys(db.sessions) }); 
});

// ROUTE JOIN : Ne fait que mettre à jour le pseudo ou créer l'entrée minimale
app.post("/api/join", async (req, res) => { 
  const { user_id, session_id, username } = req.body; 
  const db = await readDB(); 
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session inexistante" }); 
  
  if (!db.userSessions) db.userSessions = {}; 
  db.userSessions[user_id] = session_id; 
  
  if (!db.sessions[session_id].players) db.sessions[session_id].players = {}; 
  
  // Sauvegarde du username si présent, ou mise à jour
  if (db.sessions[session_id].players[user_id]) {
    db.sessions[session_id].players[user_id].username = username;
  } else {
    // Initialisation minimale avec le username
    db.sessions[session_id].players[user_id] = { username };
  }

  await writeDB(db); 
  
  console.log(`[SESSION] ${username || user_id} a rejoint la session "${session_id}"`);
  res.json({ success: true, session_id }); 
});

app.post("/api/player", async (req, res) => { 
  const { user_id, session_id } = req.body; 
  const db = await readDB(); 
  const session = db.sessions[session_id]; 
  if (!session) return res.status(404).json({ error: "Session introuvable" }); 
  const player = session.players?.[user_id]; 
  if (!player) return res.json(null); 
  res.json(player); 
});

// ROUTE INIT : Crée les stats complètes
app.post("/api/player/init", async (req, res) => { 
  const { user_id, session_id, stats, money } = req.body; 
  const db = await readDB(); 
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session introuvable" }); 
  
  const derived = calculateStats(stats); 
  
  // On récupère le username s'il a été sauvegardé au join
  const existingUsername = db.sessions[session_id].players[user_id]?.username;

  // Création de la fiche complète
  const newPlayerData = { 
    username: existingUsername,
    joueur: { ...derived, hp: derived.hpMax, mana: derived.manaMax, stam: derived.stamMax }, 
    money: { bank: { pc:0, pa:0, po:0, pp:0 }, wallet: { pc: (Number(money) || 0), pa:0, po:0, pp:0 } } 
  }; 
  
  db.sessions[session_id].players[user_id] = newPlayerData;
  await writeDB(db); 
  
  console.log(`[INIT] Personnage créé pour ${user_id} dans ${session_id}`);
  
  // IMPORTANT : On renvoie directement le joueur créé pour éviter le bug de chargement infini côté client
  res.json({ success: true, player: newPlayerData }); 
});

app.post("/api/player/repos", async (req, res) => { 
  const { user_id, session_id, type, target, username } = req.body; 
  const db = await readDB(); 
  const player = db.sessions[session_id]?.players?.[user_id]; 
  if (!player) return res.status(404).json({ error: "Joueur introuvable" }); 
  const result = processRepos(player, type, target); 
  if (!result.success) return res.status(400).json({ error: result.error }); 
  await writeDB(db); 
  
  console.log(`[REPOS] ${username || user_id} a effectué un repos ${type} ${target ? `(${target})` : ''}`);
  res.json({ success: true }); 
});

app.post("/api/player/roll", async (req, res) => {
  const { user_id, session_id, type, data, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processRoll(player, type, data);
  if (!result.success) return res.status(400).json({ error: result.error });
  if (result.cost > 0) await writeDB(db);
  
  // NOTE: Les logs détaillés sont gérés dans actions.js via console.log, qui est maintenant intercepté !
  console.log(`[ROLL: RESULT] ${username || user_id} -> ${result.result}`);
  res.json(result);
});

app.post("/api/player/resource", async (req, res) => {
  const { user_id, session_id, target, action, value, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processResourceMod(player, target, action, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  
  console.log(`[RESOURCE] ${username || user_id} : ${action} ${value} ${target}`);
  res.json({ success: true });
});

app.post("/api/player/money", async (req, res) => {
  const { user_id, session_id, target, action, coin, value, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processMoneyMod(player, target, action, coin, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  
  console.log(`[ARGENT] ${username || user_id} : ${action} ${value} ${coin} (${target})`);
  res.json({ success: true });
});

app.post("/api/player/stat", async (req, res) => {
  const { user_id, session_id, stat, action, value, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processStatMod(player, stat, action, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  
  console.log(`[STAT] ${username || user_id} : ${action} ${value} ${stat}`);
  res.json({ success: true });
});

app.post("/api/player/transfer", async (req, res) => { 
  const { user_id, session_id, from, to, coin, amount, username } = req.body; 
  const db = await readDB(); 
  const player = db.sessions[session_id]?.players?.[user_id]; 
  if (!player) return res.status(404).json({ error: "Joueur introuvable" }); 
  const result = processTransfer(player, from, to, coin, amount); 
  if (!result.success) return res.status(400).json({ error: result.error }); 
  await writeDB(db); 
  
  console.log(`[TRANSFERT] ${username || user_id} : ${amount} ${coin} de ${from} vers ${to}`);
  res.json({ success: true }); 
});

app.post("/api/player/exchange", async (req, res) => {
  const { user_id, session_id, container, from, to, amount, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  
  const result = processExchange(player, container, from, to, amount);
  if (!result.success) return res.status(400).json({ error: result.error });
  
  await writeDB(db);
  console.log(`[ECHANGE] ${username || user_id} : ${amount} ${from} -> ${to} (${container})`);
  res.json({ success: true });
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
        code: req.body.code 
      }), 
    }); 
    const data = await response.json(); 
    res.send({ access_token: data.access_token }); 
  } catch (e) { 
    res.status(500).send({ error: "Erreur interne" }); 
  } 
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});