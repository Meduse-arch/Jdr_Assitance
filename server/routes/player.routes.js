// Fichier : server/routes/player.routes.js
import express from 'express';
import { readDB, writeDB } from '../db.js';
import { 
  calculateStats, processRepos, processRoll, 
  processResourceMod, processMoneyMod, processStatMod, 
  processTransfer, processExchange 
} from '../actions.js';

const router = express.Router();

// --- 1. ROUTES LECTURE & INIT ---

router.post("/player", async (req, res) => { 
  const { user_id, session_id } = req.body; 
  const db = await readDB(); 
  const session = db.sessions[session_id]; 
  if (!session) return res.status(404).json({ error: "Session introuvable" }); 
  const player = session.players?.[user_id]; 
  
  // Sécurité : on s'assure que le tableau d'inventaire existe
  if (player && !player.inventory) player.inventory = [];
  
  res.json(player || null); 
});

router.post("/player/init", async (req, res) => { 
  const { user_id, session_id, stats, money } = req.body; 
  const db = await readDB(); 
  if (!db.sessions[session_id]) return res.status(404).json({ error: "Session introuvable" }); 
  
  const derived = calculateStats(stats); 
  const existingUsername = db.sessions[session_id].players[user_id]?.username;

  const newPlayerData = { 
    username: existingUsername,
    joueur: { ...derived, hp: derived.hpMax, mana: derived.manaMax, stam: derived.stamMax }, 
    money: { bank: { pc:0, pa:0, po:0, pp:0 }, wallet: { pc: (Number(money) || 0), pa:0, po:0, pp:0 } },
    inventory: [] // On initialise l'inventaire vide
  }; 
  
  db.sessions[session_id].players[user_id] = newPlayerData;
  await writeDB(db); 
  
  console.log(`[INIT] Perso créé pour ${user_id} dans ${session_id}`);
  res.json({ success: true, player: newPlayerData }); 
});

// --- 2. GESTION INVENTAIRE (AJOUT / SUPPRESSION) ---

router.post("/player/inventory/add", async (req, res) => {
  const { user_id, session_id, item } = req.body; 
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });

  if (!player.inventory) player.inventory = [];

  const newItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: item.name || "Objet Inconnu",
    type: item.type || "autres",
    count: Number(item.count) || 1,
    description: item.description || "",
    // IMPORTANT : On enregistre les modificateurs ici (ex: { hp: 10, force: 3 })
    modifiers: item.modifiers || {} 
  };

  player.inventory.push(newItem);
  await writeDB(db);
  console.log(`[INVENTAIRE] ${player.username} + ${newItem.name}`);
  res.json({ success: true, inventory: player.inventory });
});

router.post("/player/inventory/remove", async (req, res) => {
  const { user_id, session_id, item_id, amount } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  if (!player.inventory) return res.json({ success: true, inventory: [] });

  const index = player.inventory.findIndex(i => i.id === item_id);
  if (index === -1) return res.status(404).json({ error: "Objet introuvable" });

  const currentItem = player.inventory[index];
  if (amount && amount < currentItem.count) {
    currentItem.count -= amount;
  } else {
    player.inventory.splice(index, 1);
  }

  await writeDB(db);
  res.json({ success: true, inventory: player.inventory });
});

// --- 3. UTILISER UN OBJET (Action) ---

router.post("/player/inventory/use", async (req, res) => {
  const { user_id, session_id, item_id } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });

  const itemIndex = player.inventory.findIndex(i => i.id === item_id);
  if (itemIndex === -1) return res.status(404).json({ error: "Objet introuvable" });

  const item = player.inventory[itemIndex];
  const j = player.joueur;
  let logs = [];

  // Application des modificateurs
  if (item.modifiers) {
    for (const [key, value] of Object.entries(item.modifiers)) {
      const val = Number(value);
      
      // Cas 1 : Ressources (HP, Mana, Stam) -> On ajoute et on clamp au Max
      if (['hp', 'mana', 'stam'].includes(key)) {
        const maxKey = key + 'Max';
        const oldVal = j[key];
        j[key] = Math.min(Math.max(0, j[key] + val), j[maxKey]); // Ne dépasse pas le max, ne descend pas sous 0
        logs.push(`${key.toUpperCase()} ${val > 0 ? '+' : ''}${val} (${oldVal} -> ${j[key]})`);
      }
      
      // Cas 2 : Stats (Force, Agi...) -> On modifie la stat de base et on recalcule les dérivés
      else if (['force', 'constitution', 'agilite', 'intelligence', 'perception'].includes(key)) {
        j[key] = (j[key] || 0) + val;
        
        // Recalcul des maximums (HP Max, Mana Max...) car la stat a changé
        const derived = calculateStats(j);
        j.hpMax = derived.hpMax;
        j.manaMax = derived.manaMax;
        j.stamMax = derived.stamMax;
        
        // On s'assure que les valeurs actuelles ne dépassent pas les nouveaux max
        j.hp = Math.min(j.hp, j.hpMax);
        j.mana = Math.min(j.mana, j.manaMax);
        j.stam = Math.min(j.stam, j.stamMax);
        
        logs.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${val > 0 ? '+' : ''}${val}`);
      }
    }
  }

  // Gestion de la consommation (Seulement si c'est un consommable)
  if (item.type === 'consommable') {
    if (item.count > 1) {
      item.count -= 1;
    } else {
      player.inventory.splice(itemIndex, 1); // Supprime l'objet s'il n'en reste qu'un
    }
    logs.push("(Consommé)");
  } else {
    // Pour les équipements, on pourrait imaginer un système "équipé/déséquipé" plus tard
    // Pour l'instant, cliquer sur "Use" applique le bonus
    logs.push("(Utilisé)"); 
  }

  await writeDB(db);
  console.log(`[USE] ${player.username} utilise ${item.name} : ${logs.join(', ')}`);
  res.json({ success: true, inventory: player.inventory, logs });
});

// --- 4. ROUTES STANDARD (Jeu, Dés, Argent) ---

router.post("/player/repos", async (req, res) => { 
  const { user_id, session_id, type, target, username } = req.body; 
  const db = await readDB(); 
  const player = db.sessions[session_id]?.players?.[user_id]; 
  if (!player) return res.status(404).json({ error: "Joueur introuvable" }); 
  const result = processRepos(player, type, target); 
  if (!result.success) return res.status(400).json({ error: result.error }); 
  await writeDB(db); 
  console.log(`[REPOS] ${username || user_id} (${type})`);
  res.json({ success: true }); 
});

router.post("/player/roll", async (req, res) => {
  const { user_id, session_id, type, data, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processRoll(player, type, data);
  if (!result.success) return res.status(400).json({ error: result.error });
  if (result.cost > 0) await writeDB(db);
  console.log(`[ROLL] ${username || user_id} -> ${result.result}`);
  res.json(result);
});

router.post("/player/resource", async (req, res) => {
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

router.post("/player/stat", async (req, res) => {
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

router.post("/player/money", async (req, res) => {
  const { user_id, session_id, target, action, coin, value, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processMoneyMod(player, target, action, coin, value);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  console.log(`[ARGENT] ${username || user_id} : ${action} ${value} ${coin}`);
  res.json({ success: true });
});

router.post("/player/transfer", async (req, res) => { 
  const { user_id, session_id, from, to, coin, amount, username } = req.body; 
  const db = await readDB(); 
  const player = db.sessions[session_id]?.players?.[user_id]; 
  if (!player) return res.status(404).json({ error: "Joueur introuvable" }); 
  const result = processTransfer(player, from, to, coin, amount); 
  if (!result.success) return res.status(400).json({ error: result.error }); 
  await writeDB(db); 
  console.log(`[TRANSFERT] ${username || user_id} : ${amount} ${coin}`);
  res.json({ success: true }); 
});

router.post("/player/exchange", async (req, res) => {
  const { user_id, session_id, container, from, to, amount, username } = req.body;
  const db = await readDB();
  const player = db.sessions[session_id]?.players?.[user_id];
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  const result = processExchange(player, container, from, to, amount);
  if (!result.success) return res.status(400).json({ error: result.error });
  await writeDB(db);
  console.log(`[ECHANGE] ${username || user_id}`);
  res.json({ success: true });
});

export default router;