import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from 'url';

import { readDB, writeDB } from './db.js';
// Ajout de processStatMod dans les imports
import { checkAdmin, calculateStats, processTransfer, processRepos, processRoll, processResourceMod, processMoneyMod, processStatMod } from './actions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3001;

app.use(express.json());

// --- ROUTES ---

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
  } 
  res.json({ success: true, list: Object.keys(db.sessions) }); 
});

app.post("/api/join", async (req, res) => { 
  const { user_id, session_id } = req.body; 
  const db = await readDB(); 
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session inexistante" }); 
  if (!db.userSessions) db.userSessions = {}; 
  db.userSessions[user_id] = session_id; 
  if (!db.sessions[session_id].players) db.sessions[session_id].players = {}; 
  await writeDB(db); 
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

app.post("/api/player/init", async (req, res) => { 
  const { user_id, session_id, stats, money } = req.body; 
  const db = await readDB(); 
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session introuvable" }); 
  const derived = calculateStats(stats); 
  db.sessions[session_id].players[user_id] = { 
    joueur: { ...derived, hp: derived.hpMax, mana: derived.manaMax, stam: derived.stamMax }, 
    money: { bank: { pc:0, pa:0, po:0, pp:0 }, wallet: { pc: (Number(money) || 0), pa:0, po:0, pp:0 } } 
  }; 
  await writeDB(db); 
  res.json({ success: true }); 
});

app.post("/api/player/repos", async (req, res) => { 
  const { user_id, session_id, type, target } = req.body; 
  const db = await readDB(); 
  const player = db.sessions[session_id]?.players?.[user_id]; 
  if (!player) return res.status(404).json({ error: "Joueur introuvable" }); 
  const result = processRepos(player, type, target); 
  if (!result.success) return res.status(400).json({ error: result.error }); 
  await writeDB(db); 
  res.json({ success: true }); 
});

app.post("/api/player/roll", async (req, res) => {
  const { user_id, session_id, type, data } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processRoll(player, type, data);
  if (!result.success) return res.status(400).json({ error: result.error });
  if (result.cost > 0) await writeDB(db);
  res.json(result);
});

app.post("/api/player/resource", async (req, res) => {
  const { user_id, session_id, target, action, value } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processResourceMod(player, target, action, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  res.json({ success: true });
});

app.post("/api/player/money", async (req, res) => {
  const { user_id, session_id, target, action, coin, value } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processMoneyMod(player, target, action, coin, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  res.json({ success: true });
});

// NOUVELLE ROUTE STATS
app.post("/api/player/stat", async (req, res) => {
  const { user_id, session_id, stat, action, value } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processStatMod(player, stat, action, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  res.json({ success: true });
});

app.post("/api/player/transfer", async (req, res) => { 
  const { user_id, session_id, from, to, coin, amount } = req.body; 
  const db = await readDB(); 
  const player = db.sessions[session_id]?.players?.[user_id]; 
  if (!player) return res.status(404).json({ error: "Joueur introuvable" }); 
  const result = processTransfer(player, from, to, coin, amount); 
  if (!result.success) return res.status(400).json({ error: result.error }); 
  await writeDB(db); 
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