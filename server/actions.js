import fetch from "node-fetch";

// --- UTILITAIRES DÉS ---
function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

// Fonction améliorée pour retourner plus d'infos
function rollWithAdvantage(max, type) {
  const m = Math.max(1, Number(max) || 1);
  const v1 = d(m);
  
  if (type === 'n' || !type) return { chosen: v1, list: [v1], ignored: null };
  
  const v2 = d(m);
  // 'a' = Avantage (Max), 'm' = Malus (Min)
  const chosen = type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2);
  const ignored = v1 === chosen ? v2 : v1; // Note: si v1==v2, l'un est choisi, l'autre ignoré, peu importe lequel
  
  return { chosen, list: [v1, v2], ignored };
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

export function processExchange(player, container, fromCoin, toCoin, amount) {
  const val = Number(amount);
  if (!val || val <= 0) return { success: false, error: "Valeur invalide" };
  if (!['wallet', 'bank'].includes(container)) return { success: false, error: "Conteneur invalide" };
  if (fromCoin === toCoin) return { success: false, error: "Même type de pièce" };

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

  // Helper pour afficher le type d'avantage
  const advLabel = advType === 'a' ? 'AVANTAGE' : advType === 'm' ? 'DÉSAVANTAGE' : 'NORMAL';

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

    // LOG DÉTAILLÉ STAT
    console.log(`[ROLL: STAT] ${statName.toUpperCase()} | Mode: ${advLabel}`);
    console.log(`  > Dés lancés: [${rollData.list.join(', ')}]`);
    console.log(`  > Choix: ${rollData.chosen}`);
    console.log(`  > Modif: ${mod}`);
    console.log(`  > Résultat Final: ${result}`);
    if (cost > 0) console.log(`  > Coût: -${cost} ${costType}`);

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

    // LOG DÉTAILLÉ SORT
    console.log(`[ROLL: SORT] Mode: ${advLabel}`);
    console.log(`  > Intel Dispo: ${intelDispo} (Base: ${j.intelligence}, Coût Effets: ${totalEffectCost})`);
    console.log(`  > Jet Principal: [${mainRoll.list.join(', ')}] -> ${mainRoll.chosen} + Mod(${mod}) = ${mainResult}`);
    console.log(`  > Coût Mana: -${cost}`);
    if (effects.length > 0) {
      console.log(`  > Effets (${effects.length}):`);
      effects.forEach((effVal, idx) => {
        // Note: effectResults est un simple tableau de valeurs, on ne garde pas l'historique adv pour chaque effet individuellement ici pour simplifier le retour
        console.log(`    - Effet ${idx + 1} (Base ${effVal}): Résultat ${effectResults[idx]} (avec mod ${modEffect})`);
      });
    }

    return { success: true, result: mainResult, effectResults: effectResults, cost, costType: 'Mana', stat: 'Sort', mod };
  }

  // MODIFICATION POUR DÉS CLASSIQUES
  if (type === 'dice') {
    const min = Number(data.min) || 1;
    const max = Number(data.max) || 100;
    const count = Math.max(1, Number(data.count) || 1);

    // Fonction locale pour tirer un set de dés
    const rollSet = () => {
      let sum = 0;
      let rolls = [];
      for (let i = 0; i < count; i++) {
        const val = Math.floor(Math.random() * (max - min + 1)) + min;
        sum += val;
        rolls.push(val);
      }
      return { sum, rolls };
    };

    let resultObj;
    let chosenSet;
    let ignoredSet = null;

    // Si pas d'avantage/désavantage
    if (advType === 'n') {
      chosenSet = rollSet();
      resultObj = {
        result: chosenSet.sum + mod,
        details: chosenSet.rolls,
        mod
      };
    } else {
      // Si Avantage/Désavantage, on tire DEUX sets complets
      const set1 = rollSet();
      const set2 = rollSet();
      
      let isSet1Chosen;
      if (advType === 'a') {
        isSet1Chosen = set1.sum >= set2.sum; // Avantage : on garde le plus grand total
      } else {
        isSet1Chosen = set1.sum <= set2.sum; // Désavantage : on garde le plus petit total
      }

      chosenSet = isSet1Chosen ? set1 : set2;
      ignoredSet = isSet1Chosen ? set2 : set1;

      resultObj = {
        result: chosenSet.sum + mod,
        details: chosenSet.rolls, // On renvoie les dés du set choisi
        mod,
        // On peut renvoyer plus d'infos si le front veut afficher les deux lancers
        ignoredDetails: ignoredSet.rolls, 
        ignoredSum: ignoredSet.sum
      };
    }

    // LOG DÉTAILLÉ DÉ SIMPLE
    console.log(`[ROLL: DICE] ${count}d(${min}-${max}) | Mode: ${advLabel}`);
    if (ignoredSet) {
      console.log(`  > Lancer 1 (Somme: ${chosenSet.sum === rollSet().sum ? '?' : '?'}) : [${chosenSet.rolls.join(', ')}]`); // Simplification log
      console.log(`  > Set Choisi: [${chosenSet.rolls.join(', ')}] (Somme: ${chosenSet.sum})`);
      console.log(`  > Set Ignoré: [${ignoredSet.rolls.join(', ')}] (Somme: ${ignoredSet.sum})`);
    } else {
      console.log(`  > Résultats: [${chosenSet.rolls.join(', ')}] (Somme: ${chosenSet.sum})`);
    }
    console.log(`  > Modif: ${mod}`);
    console.log(`  > Total Final: ${resultObj.result}`);

    return { success: true, ...resultObj };
  }

  return { success: false, error: "Type de roll invalide" };
}