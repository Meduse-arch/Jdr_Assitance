import fetch from "node-fetch";

// --- UTILITAIRES DÉS ---
function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

// Logique Avantage (a), Malus (m), Normal (n)
function rollWithAdvantage(max, type) { // type: 'a', 'm', 'n'
  const m = Math.max(1, Number(max) || 1);
  const v1 = d(m);
  
  if (type === 'n' || !type) return { chosen: v1, list: [v1] };
  
  const v2 = d(m);
  const chosen = type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2);
  return { chosen, list: [v1, v2] };
}

// --- FONCTIONS EXISTANTES ---
export async function checkAdmin(accessToken, guildId) {
  if (!guildId) return false;
  try {
    const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const member = await response.json();
    const perms = BigInt(member.permissions || 0);
    const ADMIN_BIT = 8n;
    return (perms & ADMIN_BIT) === ADMIN_BIT;
  } catch (e) { return false; }
}

export function calculateStats(stats) {
  const force = Number(stats.force) || 0;
  const constitution = Number(stats.constitution) || 0;
  const agilite = Number(stats.agilite) || 0;
  const intelligence = Number(stats.intelligence) || 0;
  const perception = Number(stats.perception) || 0;
  return {
    force, constitution, agilite, intelligence, perception,
    hpMax: Math.max(0, constitution * 4),
    manaMax: Math.max(0, intelligence * 20),
    stamMax: Math.max(0, (force + agilite) * 10)
  };
}

export function processTransfer(player, from, to, coin, amount) {
  if (amount <= 0) return { success: false, error: "Montant invalide" };
  if (from === to) return { success: false, error: "Source identique" };
  const current = player.money[from][coin] || 0;
  if (current < amount) return { success: false, error: "Fonds insuffisants" };
  player.money[from][coin] -= amount;
  player.money[to][coin] += amount;
  return { success: true };
}

export function processRepos(player, type, target) {
  const j = player.joueur;
  if (type === 'long') { j.hp = j.hpMax; j.mana = j.manaMax; j.stam = j.stamMax; return { success: true }; }
  if (type === 'court') { j.mana = j.manaMax; j.stam = j.stamMax; return { success: true }; }
  if (type === 'simple') {
    if (target === 'mana') { j.mana = j.manaMax; return { success: true }; }
    if (target === 'stam') { j.stam = j.stamMax; return { success: true }; }
    return { success: false, error: "Cible invalide" };
  }
  return { success: false, error: "Type inconnu" };
}

// --- PROCESS ROLL (Mis à jour) ---
export function processRoll(player, type, data) {
  const j = player.joueur;
  const advType = data.adv || 'n'; // 'a', 'm', 'n'
  const mod = Number(data.mod) || 0;

  // 1. Roll de STAT (Force, Agilité...)
  if (type === 'stat') {
    const statName = data.stat; 
    const statValue = j[statName];
    if (statValue === undefined) return { success: false, error: "Stat inconnue" };

    const rollData = rollWithAdvantage(statValue, advType);
    const result = rollData.chosen + mod;
    
    let cost = 0;
    let costType = null;

    // Coût Stamina pour Force/Agilité
    if (statName === 'force' || statName === 'agilite') {
      cost = rollData.chosen; // Coût basé sur le dé brut (sans modif)
      costType = 'Stamina';
      j.stam = Math.max(0, j.stam - cost);
    }

    return { success: true, result, raw: rollData.chosen, list: rollData.list, cost, costType, stat: statName, mod };
  }

  // 2. Roll de SORT (Basé sur Intelligence, coûte du Mana)
  if (type === 'sort') {
    const statValue = j.intelligence; // Les sorts utilisent l'intelligence
    const rollData = rollWithAdvantage(statValue, advType);
    const result = rollData.chosen + mod;

    // Coût Mana = Résultat du dé brut
    const cost = rollData.chosen;
    j.mana = Math.max(0, j.mana - cost);

    return { success: true, result, raw: rollData.chosen, list: rollData.list, cost, costType: 'Mana', stat: 'Sort', mod };
  }

  // 3. Roll CLASSIQUE (Libre)
  if (type === 'dice') {
    const min = Number(data.min) || 1;
    const max = Number(data.max) || 100;
    const count = Math.max(1, Number(data.count) || 1);

    let total = 0;
    const details = [];

    for (let i = 0; i < count; i++) {
      const val = Math.floor(Math.random() * (max - min + 1)) + min;
      total += val;
      details.push(val);
    }
    // On ajoute le modificateur au total
    total += mod;

    return { success: true, result: total, details, mod };
  }

  return { success: false, error: "Type de roll invalide" };
}