// Fichier : server/routes/admin.routes.js
import express from 'express';
import { readDB, writeDB } from '../db.js';
import { checkAdmin } from '../actions.js';
import { getLogs } from '../utils/logger.js';

const router = express.Router();

// Récupérer les logs
router.get("/admin/logs", (req, res) => {
  res.json(getLogs());
});

// Récupérer joueurs/PNJ d'une session
router.post("/admin/session/players", async (req, res) => {
  const { access_token, guild_id, session_id } = req.body;
  
  if (!session_id) return res.json({ players: [], pnjs: [] });
  if (!await checkAdmin(access_token, guild_id)) return res.status(403).json({ error: "Non autorisé" });
  
  const db = await readDB();
  const session = db.sessions[session_id];
  
  if (!session) return res.json({ players: [], pnjs: [] });

  const playersList = Object.entries(session.players || {}).map(([id, data]) => ({
    id,
    username: data.username || "Inconnu",
    type: 'player'
  }));

  const pnjList = Object.entries(session.pnj || {}).map(([id, data]) => ({
    id,
    username: data.nom || "PNJ Sans Nom",
    type: 'pnj'
  }));

  res.json({ players: playersList, pnjs: pnjList });
});

// Créer une session
router.post("/sessions/create", async (req, res) => { 
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

// Supprimer une session
router.post("/sessions/delete", async (req, res) => { 
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

// Route pour SUPPRIMER un personnage (celle que tu voulais ajouter)
router.post("/players/delete", async (req, res) => {
  const { access_token, guild_id, session_id, target_id, type } = req.body;
  if (!await checkAdmin(access_token, guild_id)) return res.status(403).json({ error: "Non autorisé" });

  const db = await readDB();
  const session = db.sessions[session_id];
  if (!session) return res.status(404).json({ error: "Session introuvable" });

  let deleted = false;

  if (type === 'player') {
    if (session.players && session.players[target_id]) {
      delete session.players[target_id];
      // Si le joueur est actuellement connecté sur cette session, on le détache
      if (db.userSessions && db.userSessions[target_id] === session_id) {
        delete db.userSessions[target_id];
      }
      deleted = true;
    }
  } else if (type === 'pnj') {
    if (session.pnj && session.pnj[target_id]) {
      delete session.pnj[target_id];
      deleted = true;
    }
  }

  if (deleted) {
    await writeDB(db);
    console.log(`[ADMIN] Suppression ${type} : ${target_id} dans ${session_id}`);
    res.json({ success: true });
  } else {
    res.json({ success: false, error: "Introuvable" });
  }
});

export default router;