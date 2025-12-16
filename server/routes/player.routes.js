import express from 'express';
import { readDB, writeDB } from '../db.js';
import { 
  calculateStats, processRepos, processRoll, 
  processResourceMod, processMoneyMod, processStatMod, 
  processTransfer, processExchange 
} from '../actions.js';

const router = express.Router();

const updatePlayerMaxStats = (player) => {
    const derived = calculateStats(player.joueur, player.equipment);
    player.joueur.hpMax = derived.hpMax;
    player.joueur.manaMax = derived.manaMax;
    player.joueur.stamMax = derived.stamMax;
    
    player.joueur.hp = Math.min(player.joueur.hp, player.joueur.hpMax);
    player.joueur.mana = Math.min(player.joueur.mana, player.joueur.manaMax);
    player.joueur.stam = Math.min(player.joueur.stam, player.joueur.stamMax);
};

// --- ROUTES ---

// Route principale pour récupérer la fiche
router.post("/player", async (req, res) => { 
  const { user_id, session_id } = req.body; 
  const db = await readDB(); 
  const session = db.sessions[session_id]; 
  if (!session) return res.status(404).json({ error: "Session introuvable" }); 
  
  // MODIFICATION CRITIQUE ICI : On cherche dans players OU dans pnj
  let player = session.players?.[user_id] || session.pnj?.[user_id];
  
  if (player) {
    if (!player.inventory) player.inventory = [];
    if (!player.equipment) player.equipment = { 
        arme1: null, arme2: null, tete: null, corp: null, dos: null, pantalon: null, pied: null,
        bijou1: null, bijou2: null, bijou3: null, bijou4: null 
    };
    if (player.equipment && !('bijou3' in player.equipment)) {
        player.equipment.bijou3 = null;
        player.equipment.bijou4 = null;
    }
  }
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
    inventory: [],
    equipment: { 
        arme1: null, arme2: null, tete: null, corp: null, dos: null, pantalon: null, pied: null,
        bijou1: null, bijou2: null, bijou3: null, bijou4: null 
    }
  }; 
  
  db.sessions[session_id].players[user_id] = newPlayerData;
  await writeDB(db); 
  res.json({ success: true, player: newPlayerData }); 
});

// Helper pour récupérer joueur ou PNJ dans les autres routes
const getActor = (db, session_id, user_id) => {
    return db.sessions[session_id]?.players?.[user_id] || db.sessions[session_id]?.pnj?.[user_id];
};

router.post("/player/inventory/add", async (req, res) => {
  const { user_id, session_id, item } = req.body; 
  const db = await readDB();
  const player = getActor(db, session_id, user_id);
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });

  if (!player.inventory) player.inventory = [];

  const newItem = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name: item.name || "Objet Inconnu",
    type: item.type || "autres",
    count: Number(item.count) || 1,
    description: item.description || "",
    modifiers: item.modifiers || {},
    slot: item.slot || null,
    isEquipped: false
  };

  player.inventory.push(newItem);
  await writeDB(db);
  res.json({ success: true, inventory: player.inventory });
});

router.post("/player/inventory/adjust", async (req, res) => {
  const { user_id, session_id, item_id, amount } = req.body;
  const db = await readDB();
  const player = getActor(db, session_id, user_id);
  const item = player?.inventory.find(i => i.id === item_id);
  if (!item) return res.status(404).json({ error: "Objet introuvable" });

  item.count += parseInt(amount);
  
  if (item.count <= 0) {
    player.inventory = player.inventory.filter(i => i.id !== item_id);
    if (item.isEquipped) {
       for (const slot in player.equipment) {
         if (player.equipment[slot] && player.equipment[slot].id === item_id) {
           player.equipment[slot] = null;
         }
       }
       updatePlayerMaxStats(player);
    }
  }

  await writeDB(db);
  res.json({ success: true, inventory: player.inventory });
});

router.post("/player/inventory/remove", async (req, res) => {
  const { user_id, session_id, item_id } = req.body;
  const db = await readDB();
  const player = getActor(db, session_id, user_id);
  
  const index = player?.inventory.findIndex(i => i.id === item_id);
  if (index !== undefined && index !== -1) {
    const item = player.inventory[index];
    if (item.isEquipped) {
        for (const slot in player.equipment) {
            if (player.equipment[slot]?.id === item.id) player.equipment[slot] = null;
        }
        updatePlayerMaxStats(player);
    }
    player.inventory.splice(index, 1);
    await writeDB(db);
  }
  res.json({ success: true, inventory: player?.inventory || [] });
});

router.post("/player/inventory/use", async (req, res) => {
  const { user_id, session_id, item_id } = req.body;
  const db = await readDB();
  const player = getActor(db, session_id, user_id);
  const itemIndex = player?.inventory.findIndex(i => i.id === item_id);
  if (!player || itemIndex === -1) return res.status(404).json({ error: "Objet introuvable" });

  const item = player.inventory[itemIndex];
  const j = player.joueur;
  let logs = [];

  if (item.modifiers) {
    for (const [key, value] of Object.entries(item.modifiers)) {
      const val = Number(value);
      if (['hp', 'mana', 'stam'].includes(key)) {
        const maxKey = key + 'Max';
        j[key] = Math.min(Math.max(0, j[key] + val), j[maxKey]);
        logs.push(`${key.toUpperCase()} ${val > 0 ? '+' : ''}${val}`);
      }
    }
  }

  if (item.type === 'consommable') {
    if (item.count > 1) item.count -= 1;
    else player.inventory.splice(itemIndex, 1);
    logs.push("(Consommé)");
  } else {
    logs.push("(Utilisé)"); 
  }

  await writeDB(db);
  res.json({ success: true, inventory: player.inventory, logs });
});

router.post("/player/inventory/equip", async (req, res) => {
  const { user_id, session_id, item_id, target_slot } = req.body;
  const db = await readDB();
  const player = getActor(db, session_id, user_id);
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });

  if (!player.equipment) player.equipment = { 
    arme1: null, arme2: null, tete: null, corp: null, dos: null, pantalon: null, pied: null, 
    bijou1: null, bijou2: null, bijou3: null, bijou4: null 
  };

  const itemIndex = player.inventory.findIndex(i => i.id === item_id);
  if (itemIndex === -1) return res.status(404).json({ error: "Objet introuvable" });
  
  let item = player.inventory[itemIndex];
  let slotToUse = target_slot;

  if (!slotToUse) {
    if (item.type === 'arme') {
        slotToUse = !player.equipment.arme1 ? 'arme1' : (!player.equipment.arme2 ? 'arme2' : 'arme1');
    } else if (item.type === 'bijoux') {
        if (!player.equipment.bijou1) slotToUse = 'bijou1';
        else if (!player.equipment.bijou2) slotToUse = 'bijou2';
        else if (!player.equipment.bijou3) slotToUse = 'bijou3';
        else if (!player.equipment.bijou4) slotToUse = 'bijou4';
        else slotToUse = 'bijou1';
    } else if (item.slot) {
        slotToUse = item.slot;
    } else {
        return res.status(400).json({ error: "Objet non équipable" });
    }
  }

  const currentEquippedRef = player.equipment[slotToUse];
  if (currentEquippedRef) {
    const invItem = player.inventory.find(i => i.id === currentEquippedRef.id);
    if (invItem) invItem.isEquipped = false;
  }

  if (item.count > 1) {
    item.count -= 1;
    const newItem = { ...item, count: 1, isEquipped: true, id: Date.now().toString(36) + Math.random().toString(36).substr(2) };
    player.inventory.push(newItem);
    item = newItem; 
  } else {
    item.isEquipped = true;
  }

  player.equipment[slotToUse] = { ...item };
  updatePlayerMaxStats(player);

  await writeDB(db);
  res.json({ success: true, inventory: player.inventory, equipment: player.equipment });
});

router.post("/player/inventory/unequip", async (req, res) => {
    const { user_id, session_id, item_id } = req.body;
    const db = await readDB();
    const player = getActor(db, session_id, user_id);
    
    const item = player?.inventory.find(i => i.id === item_id);
    if (item) {
        item.isEquipped = false;
    }

    if (player) {
        for (const slot in player.equipment) {
            if (player.equipment[slot]?.id === item_id) {
                player.equipment[slot] = null;
            }
        }
        updatePlayerMaxStats(player);
        await writeDB(db);
    }
    
    res.json({ success: true, inventory: player?.inventory, equipment: player?.equipment });
});

router.post("/player/roll", async (req, res) => {
  const { user_id, session_id, type, data, username, activeWeapons } = req.body;
  const db = await readDB();
  const player = getActor(db, session_id, user_id);
  if (!player) return res.status(404).json({ error: "Joueur introuvable" });
  
  const result = processRoll(player, type, data, activeWeapons || []);
  if (!result.success) return res.status(400).json({ error: result.error });
  if (result.cost > 0) await writeDB(db);
  
  console.log(`[ROLL] ${username || user_id} -> ${result.result}`);
  res.json(result);
});

// Helper pour les routes d'action
const withPlayer = async (req, res, callback) => {
    const { user_id, session_id } = req.body;
    const db = await readDB();
    const player = getActor(db, session_id, user_id);
    if (!player) return res.status(404).json({ error: "Joueur introuvable" });
    await callback(player, db);
};

router.post("/player/repos", (req, res) => withPlayer(req, res, async (player, db) => {
    const { type, target, username } = req.body;
    const result = processRepos(player, type, target);
    if (!result.success) return res.status(400).json({ error: result.error });
    await writeDB(db);
    console.log(`[REPOS] ${username || "Inconnu"} (${type})`);
    res.json({ success: true });
}));

router.post("/player/resource", (req, res) => withPlayer(req, res, async (player, db) => {
    const { target, action, value, username } = req.body;
    const result = processResourceMod(player, target, action, value);
    if (!result.success) return res.status(400).json({ error: result.error });
    await writeDB(db);
    console.log(`[RESOURCE] ${username || "Inconnu"} : ${action} ${value} ${target}`);
    res.json({ success: true });
}));

router.post("/player/stat", (req, res) => withPlayer(req, res, async (player, db) => {
    const { stat, action, value, username } = req.body;
    const result = processStatMod(player, stat, action, value);
    if (!result.success) return res.status(400).json({ error: result.error });
    await writeDB(db);
    console.log(`[STAT] ${username || "Inconnu"} : ${action} ${value} ${stat}`);
    res.json({ success: true });
}));

router.post("/player/money", (req, res) => withPlayer(req, res, async (player, db) => {
    const { target, action, coin, value, username } = req.body;
    const result = processMoneyMod(player, target, action, coin, value);
    if (!result.success) return res.status(400).json({ error: result.error });
    await writeDB(db);
    console.log(`[ARGENT] ${username || "Inconnu"} : ${action} ${value} ${coin}`);
    res.json({ success: true });
}));

router.post("/player/transfer", (req, res) => withPlayer(req, res, async (player, db) => {
    const { from, to, coin, amount, username } = req.body;
    const result = processTransfer(player, from, to, coin, amount);
    if (!result.success) return res.status(400).json({ error: result.error });
    await writeDB(db);
    console.log(`[TRANSFERT] ${username || "Inconnu"} : ${amount} ${coin}`);
    res.json({ success: true });
}));

router.post("/player/exchange", (req, res) => withPlayer(req, res, async (player, db) => {
    const { container, from, to, amount, username } = req.body;
    const result = processExchange(player, container, from, to, amount);
    if (!result.success) return res.status(400).json({ error: result.error });
    await writeDB(db);
    console.log(`[ECHANGE] ${username || "Inconnu"}`);
    res.json({ success: true });
}));

export default router;