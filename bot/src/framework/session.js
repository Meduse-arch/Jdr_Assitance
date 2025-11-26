const { promises: fs } = require('node:fs');
const path = require('node:path');

const dbFile = path.join(__dirname, '../db/database.json');

async function ensureDB() {
  try {
    await fs.access(dbFile);
  } catch {
    await fs.mkdir(path.dirname(dbFile), { recursive: true });
    await fs.writeFile(dbFile, JSON.stringify({ sessions: {}, userSessions: {} }, null, 2), 'utf8');
  }
}

async function readDB() {
  await ensureDB();
  const raw = await fs.readFile(dbFile, 'utf8');
  return raw.trim() ? JSON.parse(raw) : { sessions: {}, userSessions: {} };
}

async function writeDB(db) {
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf8');
}

async function getSession(userId) {
  const db = await readDB();
  return db.userSessions?.[userId] || '1';
}

async function setSession(userId, sessionId) {
  const sid = String(sessionId);
  const db = await readDB();
  if (!db.sessions[sid]) throw new Error('Session inconnue');
  db.userSessions[userId] = sid;
  await writeDB(db);
}

async function sessionExists(sessionId) {
  const db = await readDB();
  return Boolean(db.sessions?.[sessionId]);
}

async function createSession(sessionId) {
  const db = await readDB();
  if (!db.sessions[sessionId]) {
    db.sessions[sessionId] = { players: {} };
    await writeDB(db);
  }
}

async function deleteSession(sessionId) {
  const db = await readDB();
  if (db.sessions[sessionId]) delete db.sessions[sessionId];
  for (const [uid, sid] of Object.entries(db.userSessions || {})) {
    if (sid === String(sessionId)) delete db.userSessions[uid];
  }
  await writeDB(db);
}

async function getPlayer(userId) {
  const db = await readDB();
  const sessionId = db.userSessions?.[userId] || '1';
  return db.sessions?.[sessionId]?.players?.[userId] || null;
}

async function setPlayer(userId, playerData) {
  const db = await readDB();
  const sessionId = db.userSessions?.[userId] || '1';
  if (!db.sessions[sessionId]) db.sessions[sessionId] = { players: {} };
  db.sessions[sessionId].players[userId] = playerData;
  await writeDB(db);
}

async function ensurePlayer(userId) {
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
    await writeDB(db);
  }
  return db.sessions[sessionId].players[userId];
}

let installed = false;
async function installGlobalPaths() {
  if (installed && global.PATHS) return;
  global.PATHS = { db: () => dbFile };
  installed = true;
}

module.exports = {
  readDB, writeDB,
  getSession, setSession,
  sessionExists, createSession, deleteSession,
  getPlayer, setPlayer, ensurePlayer,
  installGlobalPaths,
};
