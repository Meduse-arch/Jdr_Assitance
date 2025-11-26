const { readDB, writeDB } = require('./session');

function updateDerived(joueur) {
  joueur.hpMax = Math.max(0, joueur.constitution * 4);
  joueur.manaMax = Math.max(0, joueur.intelligence * 20);
  joueur.stamMax = Math.max(0, (joueur.force + joueur.agilite) * 10);
  joueur.hp = Math.min(joueur.hp, joueur.hpMax);
  joueur.mana = Math.min(joueur.mana, joueur.manaMax);
  joueur.stam = Math.min(joueur.stam, joueur.stamMax);
}

async function readPlayerDB(userId) {
  const db = await readDB();
  const sessionId = db.userSessions?.[userId] || '1';
  if (!db.sessions[sessionId]) db.sessions[sessionId] = { players: {} };
  if (!db.sessions[sessionId].players[userId]) {
    db.sessions[sessionId].players[userId] = {
      joueur: {
        force: 0, constitution: 0, agilite: 0, intelligence: 0, perception: 0,
        hp: 0, hpMax: 0, mana: 0, manaMax: 0, stam: 0, stamMax: 0,
      },
      money: {
        bank: { pc: 0, pa: 0, po: 0, pp: 0 },
        wallet: { pc: 0, pa: 0, po: 0, pp: 0 },
      },
    };
  }
  return { db, sessionId, player: db.sessions[sessionId].players[userId] };
}

async function writePlayerDB(db) {
  await writeDB(db);
}

function ensureUser(playerData) {
  if (!playerData.joueur) {
    playerData.joueur = {
      force: 0, constitution: 0, agilite: 0, intelligence: 0, perception: 0,
      hp: 0, hpMax: 0, mana: 0, manaMax: 0, stam: 0, stamMax: 0,
    };
  }
  if (!playerData.money) {
    playerData.money = {
      bank: { pc: 0, pa: 0, po: 0, pp: 0 },
      wallet: { pc: 0, pa: 0, po: 0, pp: 0 },
    };
  }
  return playerData.joueur;
}

module.exports = { readPlayerDB, writePlayerDB, ensureUser, updateDerived };
