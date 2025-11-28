// Fichier : server/routes/auth.routes.js
import express from 'express';
import fetch from "node-fetch";
import { readDB, writeDB } from '../db.js';
import { checkAdmin } from '../actions.js';

const router = express.Router();

// Obtenir token Discord
router.post("/token", async (req, res) => { 
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

// Vérifier si admin
router.post("/check-admin", async (req, res) => { 
  const { access_token, guild_id } = req.body; 
  const isAdmin = await checkAdmin(access_token, guild_id); 
  res.json({ isAdmin }); 
});

// Liste des sessions
router.get("/sessions", async (req, res) => { 
  const db = await readDB(); 
  res.json(Object.keys(db.sessions || {})); 
});

// Rejoindre une session
router.post("/join", async (req, res) => { 
  const { user_id, session_id, username } = req.body; 
  const db = await readDB(); 
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session inexistante" }); 
  
  if (!db.userSessions) db.userSessions = {}; 
  db.userSessions[user_id] = session_id; 
  
  if (!db.sessions[session_id].players) db.sessions[session_id].players = {}; 
  
  // Sauvegarde/Mise à jour pseudo
  if (db.sessions[session_id].players[user_id]) {
    db.sessions[session_id].players[user_id].username = username;
  } else {
    db.sessions[session_id].players[user_id] = { username };
  }

  await writeDB(db); 
  console.log(`[SESSION] ${username || user_id} a rejoint "${session_id}"`);
  res.json({ success: true, session_id }); 
});

export default router;