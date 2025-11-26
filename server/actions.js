import fetch from "node-fetch";

// --- UTILITAIRES DÉS ---
function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

function adv(max) {
  // Logique "Avantage" : on lance 2 dés et on garde le meilleur (ou juste 1 dé selon ta règle)
  // Ici je mets un jet simple pour l'instant comme dans ton bot
  const m = Math.max(1, Number(max) || 1);
  return d(m);
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

// --- NOUVEAU : LOGIQUE DE ROLL ---
export function processRoll(player, type, data) {
  const j = player.joueur;

  // 1. Roll de Stat (Force, Agilité...)
  if (type === 'stat') {
    const statName = data.stat; 
    const statValue = j[statName];

    if (statValue === undefined) return { success: false, error: "Stat inconnue" };

    // Lancer le dé (basé sur la stat)
    const result = adv(statValue);
    
    let cost = 0;
    let costType = null;

    // Coût en Stamina pour Force et Agilité
    if (statName === 'force' || statName === 'agilite') {
      cost = result; // Le coût = le résultat du dé
      costType = 'Stamina';
      // On applique le coût
      j.stam = Math.max(0, j.stam - cost);
    }

    return { success: true, result, cost, costType, stat: statName };
  }

  // 2. Roll Libre (1d100 etc)
  if (type === 'dice') {
    const min = Number(data.min) || 1;
    const max = Number(data.max) || 100;
    const count = Math.max(1, Number(data.count) || 1);

    let total = 0;
    for (let i = 0; i < count; i++) {
      // Formule random inclusive [min, max]
      total += Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return { success: true, result: total };
  }

  return { success: false, error: "Type de roll invalide" };
}