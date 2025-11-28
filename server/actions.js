import fetch from "node-fetch";

// --- CACHE ADMIN ---
const adminCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

// --- UTILITAIRES DÉS ---
function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

function rollWithAdvantage(max, type) {
  const m = Math.max(1, Number(max) || 1);
  const v1 = d(m);
  if (type === 'n' || !type) return { chosen: v1, list: [v1], ignored: null };
  const v2 = d(m);
  const chosen = type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2);
  const ignored = v1 === chosen ? v2 : v1; 
  return { chosen, list: [v1, v2], ignored };
}

// --- FONCTIONS UTILITAIRES SERVEUR ---

export async function checkAdmin(accessToken, guildId) {
  if (!guildId) return false;
  const cached = adminCache.get(accessToken);
  if (cached && cached.expires > Date.now()) return cached.isAdmin;

  try {
    const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return false;
    const member = await response.json();
    const perms = BigInt(member.permissions || 0);
    const ADMIN_BIT = 8n;
    const isAdmin = (perms & ADMIN_BIT) === ADMIN_BIT;
    adminCache.set(accessToken, { isAdmin, expires: Date.now() + CACHE_DURATION });
    return isAdmin;
  } catch (e) { return false; }
}

// --- CALCUL STATS & RESSOURCES (CORRIGÉ) ---
export function calculateStats(baseStats, equipment = {}) {
  // 1. Stats de base (valeurs brutes de la fiche)
  const base = {
    force: Number(baseStats.force) || 0,
    constitution: Number(baseStats.constitution) || 0,
    agilite: Number(baseStats.agilite) || 0,
    intelligence: Number(baseStats.intelligence) || 0,
    perception: Number(baseStats.perception) || 0
  };

  // 2. Calcul des Bonus d'équipement (isolés)
  let bonuses = { force: 0, constitution: 0, agilite: 0, intelligence: 0, perception: 0 };
  
  Object.values(equipment).forEach(item => {
    if (item && item.modifiers) {
        ['force', 'constitution', 'agilite', 'intelligence', 'perception'].forEach(s => {
            if (item.modifiers[s]) bonuses[s] += Number(item.modifiers[s]);
        });
    }
  });

  // 3. Calcul des Ressources de BASE (UNIQUEMENT sur les stats de base)
  // CORRECTION : Les bonus de stats (+200 Force) n'augmentent PAS les jauges Max ici.
  let hpMax = Math.max(0, base.constitution * 4);
  let manaMax = Math.max(0, base.intelligence * 20);
  let stamMax = Math.max(0, (base.force + base.agilite) * 10);

  // 4. Ajout des Bonus de Ressources DIRECTS (ex: un objet qui donne explicitement "HP +50")
  Object.values(equipment).forEach(item => {
    if (item && item.modifiers) {
        if (item.modifiers.hp) hpMax += Number(item.modifiers.hp);
        if (item.modifiers.mana) manaMax += Number(item.modifiers.mana);
        if (item.modifiers.stam) stamMax += Number(item.modifiers.stam);
    }
  });

  return {
    // Totaux (pour affichage fiche)
    force: base.force + bonuses.force,
    constitution: base.constitution + bonuses.constitution,
    agilite: base.agilite + bonuses.agilite,
    intelligence: base.intelligence + bonuses.intelligence,
    perception: base.perception + bonuses.perception,
    
    // On exporte les bonus isolés pour les calculs de jet
    bonuses,
    
    // Maxima calculés
    hpMax, manaMax, stamMax
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
  if (action === 'add') player.money[target][coin] += val;
  else if (action === 'remove') player.money[target][coin] = Math.max(0, player.money[target][coin] - val);
  return { success: true };
}

export function processExchange(player, container, fromCoin, toCoin, amount) {
  const val = Number(amount);
  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  if (fromCoin === toCoin) return { success: false, error: "Même type" };
  const currentStock = player.money[container][fromCoin] || 0;
  if (currentStock < val) return { success: false, error: "Pas assez de pièces" };

  const valueFrom = COIN_VALUES[fromCoin];
  const valueTo = COIN_VALUES[toCoin];
  const totalValue = val * valueFrom;
  const numTargetCoins = Math.floor(totalValue / valueTo);
  const remainderValue = totalValue % valueTo;
  const remainderInSourceCoin = remainderValue / valueFrom; 

  player.money[container][fromCoin] -= val;
  player.money[container][toCoin] += numTargetCoins;
  if (remainderInSourceCoin > 0) player.money[container][fromCoin] += remainderInSourceCoin;

  return { success: true, converted: numTargetCoins, refunded: remainderInSourceCoin };
}

// --- GESTION STATS & RESSOURCES ---
export function processStatMod(player, statName, action, value) {
  const j = player.joueur;
  const eq = player.equipment || {};
  const val = Number(value);
  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  
  // On modifie la stat de base
  if (action === 'add') j[statName] = (j[statName] || 0) + val;
  else if (action === 'remove') j[statName] = Math.max(0, (j[statName] || 0) - val);

  // Recalcul des dérivés
  const derived = calculateStats(j, eq);
  j.hpMax = derived.hpMax;
  j.manaMax = derived.manaMax;
  j.stamMax = derived.stamMax;

  // On clamp les valeurs actuelles
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
  }
  return { success: true };
}

export function processRepos(player, type, target) {
  const j = player.joueur;
  if (type === 'long') { j.hp = j.hpMax; j.mana = j.manaMax; j.stam = j.stamMax; }
  else if (type === 'court') { j.mana = j.manaMax; j.stam = j.stamMax; }
  else if (type === 'simple') {
    if (target === 'mana') j.mana = j.manaMax;
    else if (target === 'stam') j.stam = j.stamMax;
  }
  return { success: true };
}

// --- PROCESS ROLL (CORRIGÉ) ---
export function processRoll(player, type, data, activeWeapons = []) {
  const j = player.joueur;
  const eq = player.equipment || {};
  const advType = data.adv || 'n'; 
  const mod = Number(data.mod) || 0;

  // Filtrage de l'équipement actif pour le calcul des bonus
  const activeEquipment = { ...eq };
  if (!activeWeapons.includes('arme1')) delete activeEquipment.arme1;
  if (!activeWeapons.includes('arme2')) delete activeEquipment.arme2;

  // Récupération des stats (Base + Bonus séparés)
  const statsResult = calculateStats(j, activeEquipment);

  if (type === 'stat') {
    const statName = data.stat; 
    
    // 1. On lance le dé sur la stat de BASE
    // C'est ça qui garantit que le coût en Stamina reste raisonnable
    const baseStatValue = Number(j[statName]) || 0;
    
    // 2. On récupère le bonus d'équipement à part
    const equipBonus = statsResult.bonuses[statName] || 0;

    if (baseStatValue === undefined) return { success: false, error: "Stat inconnue" };
    if ((statName === 'force' || statName === 'agilite') && j.stam <= 0) return { success: false, error: "NO_STAM" };

    // ROLL (Sur la base)
    const rollData = rollWithAdvantage(baseStatValue, advType);
    
    // RÉSULTAT FINAL = Jet (Base) + Modif Manuel + Bonus Équipement
    const result = rollData.chosen + mod + equipBonus;
    
    let cost = 0;
    let costType = null;
    if (statName === 'force' || statName === 'agilite') {
      // Le coût est basé sur le jet de dé, donc sur la stat de base
      cost = rollData.chosen; 
      costType = 'Stamina';
      j.stam = Math.max(0, j.stam - cost);
    }

    console.log(`[ROLL: STAT] ${statName.toUpperCase()} (Base ${baseStatValue}) -> [${rollData.chosen}] + ${mod} + ${equipBonus} (Equip) = ${result}`);
    return { success: true, result, raw: rollData.chosen, list: rollData.list, cost, costType, stat: statName, mod, equipBonus };
  }

  if (type === 'sort') {
    if (j.mana <= 0) return { success: false, error: "NO_MANA" };

    const effects = data.effects || [];
    const modEffect = Number(data.modEffect) || 0;
    
    // Bonus effet sort de l'équipement
    let equipSpellBonus = 0;
    Object.values(activeEquipment).forEach(item => {
        if (item && item.modifiers && item.modifiers.modEffect) {
            equipSpellBonus += Number(item.modifiers.modEffect);
        }
    });

    const totalEffectCost = effects.reduce((a, b) => a + b, 0);
    
    // Intelligence de base pour le jet (Pour garder un coût Mana raisonnable)
    const baseIntel = Number(j.intelligence) || 0;
    const intelDispo = baseIntel - totalEffectCost;

    if (intelDispo <= 0) return { success: false, error: `Intelligence insuffisante` };

    const mainRoll = rollWithAdvantage(intelDispo, advType);
    
    // Résultat = Jet + Modif + Bonus Effet Sort
    // (Note : On pourrait ajouter statsResult.bonuses.intelligence ici si l'intel de l'équipement doit aussi booster le sort)
    const mainResult = mainRoll.chosen + mod + equipSpellBonus; 

    const effectResults = effects.map(val => {
      const r = rollWithAdvantage(val, advType);
      return r.chosen + modEffect + equipSpellBonus;
    });

    const cost = mainRoll.chosen;
    j.mana = Math.max(0, j.mana - cost);

    console.log(`[ROLL: SORT] Result: ${mainResult} (Jet ${mainRoll.chosen} + Mod ${mod} + Bonus ${equipSpellBonus})`);
    return { success: true, result: mainResult, effectResults: effectResults, cost, costType: 'Mana', stat: 'Sort', mod };
  }

  if (type === 'dice') {
    const min = Number(data.min) || 1;
    const max = Number(data.max) || 100;
    const count = Math.max(1, Number(data.count) || 1);
    const rollSet = () => {
      let sum = 0; let rolls = [];
      for (let i = 0; i < count; i++) {
        const val = Math.floor(Math.random() * (max - min + 1)) + min;
        sum += val; rolls.push(val);
      }
      return { sum, rolls };
    };
    let resultObj;
    if (advType === 'n') {
      const set = rollSet();
      resultObj = { result: set.sum + mod, details: set.rolls, mod };
    } else {
      const s1 = rollSet(); const s2 = rollSet();
      const chosen = advType === 'a' ? (s1.sum >= s2.sum ? s1 : s2) : (s1.sum <= s2.sum ? s1 : s2);
      const ignored = s1 === chosen ? s2 : s1;
      resultObj = { result: chosen.sum + mod, details: chosen.rolls, mod, ignoredDetails: ignored.rolls, ignoredSum: ignored.sum };
    }
    console.log(`[ROLL: DICE] Total: ${resultObj.result}`);
    return { success: true, ...resultObj };
  }

  return { success: false, error: "Type de roll invalide" };
}