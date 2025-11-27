import fetch from "node-fetch";

// --- UTILITAIRES DÉS ---
function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

// Logique Avantage (a), Malus (m), Normal (n)
function rollWithAdvantage(max, type) {
  const m = Math.max(1, Number(max) || 1);
  const v1 = d(m);
  
  if (type === 'n' || !type) return { chosen: v1, list: [v1] };
  
  const v2 = d(m);
  // 'a' = Avantage (Max), 'm' = Malus (Min)
  const chosen = type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2);
  return { chosen, list: [v1, v2] };
}

// --- FONCTIONS UTILITAIRES SERVEUR ---

// Vérifie si l'utilisateur est Admin
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
  } catch (e) {
    return false;
  }
}

// Calcul des stats dérivées
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

// Logique de transfert d'argent
export function processTransfer(player, from, to, coin, amount) {
  if (amount <= 0) return { success: false, error: "Montant invalide" };
  if (from === to) return { success: false, error: "Source identique" };

  const current = player.money[from][coin] || 0;
  if (current < amount) return { success: false, error: "Fonds insuffisants" };

  player.money[from][coin] -= amount;
  player.money[to][coin] += amount;

  return { success: true };
}

// Logique de repos (Restauration)
export function processRepos(player, type, target) {
  const j = player.joueur;

  if (type === 'long') {
    j.hp = j.hpMax;
    j.mana = j.manaMax;
    j.stam = j.stamMax;
    return { success: true };
  }
  
  if (type === 'court') {
    j.mana = j.manaMax;
    j.stam = j.stamMax;
    return { success: true };
  }
  
  if (type === 'simple') {
    if (target === 'mana') {
      j.mana = j.manaMax;
      return { success: true };
    }
    if (target === 'stam') {
      j.stam = j.stamMax;
      return { success: true };
    }
    return { success: false, error: "Cible invalide" };
  }

  return { success: false, error: "Type de repos inconnu" };
}

// --- PROCESS ROLL (LOGIQUE PRINCIPALE DES DÉS) ---
export function processRoll(player, type, data) {
  const j = player.joueur;
  const advType = data.adv || 'n'; // 'a', 'm', 'n'
  const mod = Number(data.mod) || 0;

  // 1. Roll de STAT (Force, Agilité...)
  if (type === 'stat') {
    const statName = data.stat; 
    const statValue = j[statName];
    if (statValue === undefined) return { success: false, error: "Stat inconnue" };

    // Vérification Stamina pour Force/Agilité
    if ((statName === 'force' || statName === 'agilite') && j.stam <= 0) {
      return { success: false, error: "NO_STAM" };
    }

    const rollData = rollWithAdvantage(statValue, advType);
    const result = rollData.chosen + mod;
    
    let cost = 0;
    let costType = null;

    if (statName === 'force' || statName === 'agilite') {
      cost = rollData.chosen; // Coût = Résultat brut
      costType = 'Stamina';
      j.stam = Math.max(0, j.stam - cost);
    }

    return { success: true, result, raw: rollData.chosen, list: rollData.list, cost, costType, stat: statName, mod };
  }

  // 2. Roll de SORT (Intelligence)
  if (type === 'sort') {
    // Vérification Mana global
    if (j.mana <= 0) {
      return { success: false, error: "NO_MANA" };
    }

    const effects = data.effects || [];
    const modEffect = Number(data.modEffect) || 0;
    
    // Calcul Intelligence Disponible (Intel - Coût Effets)
    const totalEffectCost = effects.reduce((a, b) => a + b, 0);
    const intelDispo = j.intelligence - totalEffectCost;

    // CONDITION STRICTE : Si Intel <= 0, impossible de lancer
    if (intelDispo <= 0) {
      return { success: false, error: `Intelligence insuffisante (${j.intelligence} - ${totalEffectCost} = ${intelDispo})` };
    }

    // Roll Principal (Réussite du sort)
    const mainRoll = rollWithAdvantage(intelDispo, advType);
    const mainResult = mainRoll.chosen + mod;

    // Roll des Effets (Indépendants)
    const effectResults = effects.map(val => {
      const r = rollWithAdvantage(val, advType);
      return r.chosen + modEffect;
    });

    // Coût en Mana = Résultat du jet principal
    const cost = mainRoll.chosen;
    j.mana = Math.max(0, j.mana - cost);

    return { 
      success: true, 
      result: mainResult, 
      effectResults: effectResults, 
      cost, 
      costType: 'Mana',
      stat: 'Sort',
      mod
    };
  }

  // 3. Roll CLASSIQUE (1d100...)
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
    total += mod;

    return { success: true, result: total, details, mod };
  }

  return { success: false, error: "Type de roll invalide" };
}