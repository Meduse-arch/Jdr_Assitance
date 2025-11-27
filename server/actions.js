import fetch from "node-fetch";

// --- UTILITAIRES DÉS ---
function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

function rollWithAdvantage(max, type) {
  const m = Math.max(1, Number(max) || 1);
  const v1 = d(m);
  
  if (type === 'n' || !type) return { chosen: v1, list: [v1] };
  
  const v2 = d(m);
  const chosen = type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2);
  return { chosen, list: [v1, v2] };
}

// --- FONCTIONS UTILITAIRES SERVEUR ---

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

// --- GESTION ARGENT ---

const COIN_VALUES = { pc: 1, pa: 10, po: 100, pp: 1000 };

export function processTransfer(player, from, to, coin, amount) {
  if (amount <= 0) return { success: false, error: "Montant invalide" };
  if (from === to) return { success: false, error: "Source identique" };

  const current = player.money[from][coin] || 0;
  if (current < amount) return { success: false, error: "Fonds insuffisants" };

  player.money[from][coin] -= amount;
  player.money[to][coin] += amount;

  return { success: true };
}

export function processMoneyMod(player, target, action, coin, value) {
  const val = Number(value);
  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  if (!['wallet', 'bank'].includes(target)) return { success: false, error: "Cible invalide" };
  if (!['pc', 'pa', 'po', 'pp'].includes(coin)) return { success: false, error: "Pièce invalide" };

  if (action === 'add') {
    player.money[target][coin] += val;
  } else if (action === 'remove') {
    player.money[target][coin] = Math.max(0, player.money[target][coin] - val);
  } else {
    return { success: false, error: "Action inconnue" };
  }

  return { success: true };
}

// NOUVELLE FONCTION : ÉCHANGE / CONVERSION
export function processExchange(player, container, fromCoin, toCoin, amount) {
  const val = Number(amount);
  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  if (!['wallet', 'bank'].includes(container)) return { success: false, error: "Conteneur invalide" };
  if (fromCoin === toCoin) return { success: false, error: "Même type de pièce" };

  const currentStock = player.money[container][fromCoin] || 0;
  if (currentStock < val) return { success: false, error: "Pas assez de pièces" };

  const valueFrom = COIN_VALUES[fromCoin];
  const valueTo = COIN_VALUES[toCoin];

  // 1. Calcul de la valeur totale en "base PC" de ce qu'on veut convertir
  const totalValue = val * valueFrom;

  // 2. Combien de pièces "Cibles" on peut obtenir ?
  const numTargetCoins = Math.floor(totalValue / valueTo);

  // 3. Calcul du reste (ce qui n'a pas pu être converti)
  const remainderValue = totalValue % valueTo;
  
  // 4. On convertit le reste en pièces d'origine (logique : on rend la monnaie)
  const remainderInSourceCoin = remainderValue / valueFrom; 

  // Mise à jour : On retire TOUT ce que le joueur a mis
  player.money[container][fromCoin] -= val;
  
  // On ajoute les nouvelles pièces
  player.money[container][toCoin] += numTargetCoins;

  // On rend la monnaie (le reste)
  if (remainderInSourceCoin > 0) {
    player.money[container][fromCoin] += remainderInSourceCoin;
  }

  return { success: true, converted: numTargetCoins, refunded: remainderInSourceCoin };
}

// --- GESTION STATS & RESSOURCES ---

export function processStatMod(player, statName, action, value) {
  const j = player.joueur;
  const val = Number(value);
  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  
  const allowedStats = ['force', 'constitution', 'agilite', 'intelligence', 'perception'];
  if (!allowedStats.includes(statName)) return { success: false, error: "Stat inconnue" };

  if (action === 'add') {
    j[statName] = (j[statName] || 0) + val;
  } else if (action === 'remove') {
    j[statName] = Math.max(0, (j[statName] || 0) - val);
  } else {
    return { success: false, error: "Action inconnue" };
  }

  const derived = calculateStats(j);
  j.hpMax = derived.hpMax;
  j.manaMax = derived.manaMax;
  j.stamMax = derived.stamMax;

  j.hp = Math.min(j.hp, j.hpMax);
  j.mana = Math.min(j.mana, j.manaMax);
  j.stam = Math.min(j.stam, j.stamMax);

  return { success: true };
}

export function processResourceMod(player, target, action, value) {
  const j = player.joueur;
  const val = Number(value);

  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  
  let current, max;
  
  if (target === 'hp') { current = j.hp; max = j.hpMax; }
  else if (target === 'mana') { current = j.mana; max = j.manaMax; }
  else if (target === 'stam') { current = j.stam; max = j.stamMax; }
  else return { success: false, error: "Cible invalide" };

  if (action === 'add') {
    const newVal = Math.min(current + val, max);
    if (target === 'hp') j.hp = newVal;
    if (target === 'mana') j.mana = newVal;
    if (target === 'stam') j.stam = newVal;
  } else if (action === 'remove') {
    const newVal = Math.max(current - val, 0);
    if (target === 'hp') j.hp = newVal;
    if (target === 'mana') j.mana = newVal;
    if (target === 'stam') j.stam = newVal;
  } else {
    return { success: false, error: "Action inconnue" };
  }

  return { success: true };
}

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
    if (target === 'mana') { j.mana = j.manaMax; return { success: true }; }
    if (target === 'stam') { j.stam = j.stamMax; return { success: true }; }
    return { success: false, error: "Cible invalide" };
  }

  return { success: false, error: "Type de repos inconnu" };
}

// --- PROCESS ROLL ---

export function processRoll(player, type, data) {
  const j = player.joueur;
  const advType = data.adv || 'n'; 
  const mod = Number(data.mod) || 0;

  if (type === 'stat') {
    const statName = data.stat; 
    const statValue = j[statName];
    if (statValue === undefined) return { success: false, error: "Stat inconnue" };

    if ((statName === 'force' || statName === 'agilite') && j.stam <= 0) {
      return { success: false, error: "NO_STAM" };
    }

    const rollData = rollWithAdvantage(statValue, advType);
    const result = rollData.chosen + mod;
    
    let cost = 0;
    let costType = null;

    if (statName === 'force' || statName === 'agilite') {
      cost = rollData.chosen;
      costType = 'Stamina';
      j.stam = Math.max(0, j.stam - cost);
    }

    return { success: true, result, raw: rollData.chosen, list: rollData.list, cost, costType, stat: statName, mod };
  }

  if (type === 'sort') {
    if (j.mana <= 0) return { success: false, error: "NO_MANA" };

    const effects = data.effects || [];
    const modEffect = Number(data.modEffect) || 0;
    
    const totalEffectCost = effects.reduce((a, b) => a + b, 0);
    const intelDispo = j.intelligence - totalEffectCost;

    if (intelDispo <= 0) {
      return { success: false, error: `Intelligence insuffisante` };
    }

    const mainRoll = rollWithAdvantage(intelDispo, advType);
    const mainResult = mainRoll.chosen + mod;

    const effectResults = effects.map(val => {
      const r = rollWithAdvantage(val, advType);
      return r.chosen + modEffect;
    });

    const cost = mainRoll.chosen;
    j.mana = Math.max(0, j.mana - cost);

    return { success: true, result: mainResult, effectResults: effectResults, cost, costType: 'Mana', stat: 'Sort', mod };
  }

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