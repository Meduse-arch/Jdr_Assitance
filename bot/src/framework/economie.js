const { ok, fail } = require('./replies');
const { readDB, writeDB, getSession } = require('./session');

const COIN_VALUE = { pc: 1, pa: 10, po: 100, pp: 1000 };
const COIN_LABEL = { pc: 'Cuivre (PC)', pa: 'Argent (PA)', po: 'Or (PO)', pp: 'Platine (PP)' };
const COIN_NAME = { pc: 'Cuivre', pa: 'Argent', po: 'Or', pp: 'Platine' };

async function getPlayerMoney(userId) {
  const db = await readDB();
  const sessionId = db.userSessions?.[userId] || '1';
  if (!db.sessions[sessionId]) db.sessions[sessionId] = { players: {} };
  if (!db.sessions[sessionId].players[userId]) {
    db.sessions[sessionId].players[userId] = {
      joueur: { force: 0, constitution: 0, agilite: 0, intelligence: 0, perception: 0, hp: 0, hpMax: 0, mana: 0, manaMax: 0, stam: 0, stamMax: 0 },
      money: { bank: { pc: 0, pa: 0, po: 0, pp: 0 }, wallet: { pc: 0, pa: 0, po: 0, pp: 0 } },
    };
  }
  return { db, sessionId, player: db.sessions[sessionId].players[userId] };
}

function validateTarget(v) {
  if (v !== 'wallet' && v !== 'banque') throw new Error('cible invalide');
  return v;
}

function validatePiece(p) {
  if (!COIN_VALUE[p]) throw new Error('pièce invalide');
  return p;
}

async function add(userId, cible, piece, montant) {
  const { db, player } = await getPlayerMoney(userId);
  player.money[cible][piece] += montant;
  await writeDB(db);
  return player.money[cible][piece];
}

async function remove(userId, cible, piece, montant) {
  const { db, player } = await getPlayerMoney(userId);
  player.money[cible][piece] = Math.max(0, player.money[cible][piece] - montant);
  await writeDB(db);
  return player.money[cible][piece];
}

async function transfer(userId, from, to, piece, qty) {
  if (from === to) return { ok: false, reason: 'same_target' };
  const { db, player } = await getPlayerMoney(userId);
  const dispo = player.money[from][piece] ?? 0;
  if (dispo < qty) return { ok: false, reason: 'insufficient', dispo };
  player.money[from][piece] -= qty;
  player.money[to][piece] += qty;
  await writeDB(db);
  return { ok: true, fromLeft: player.money[from][piece], toNow: player.money[to][piece] };
}

function convertMath(from, to, qty) {
  const vf = COIN_VALUE[from], vt = COIN_VALUE[to];
  const totalPc = qty * vf;
  const nbTo = Math.floor(totalPc / vt);
  const restePc = totalPc - nbTo * vt;
  const resteFrom = Math.floor(restePc / vf);
  const pertePc = restePc - resteFrom * vf;
  return { nbTo, resteFrom, pertePc, totalPc };
}

async function exchange(userId, cible, from, to, qty) {
  if (from === to) return { ok: false, reason: 'same_piece' };
  const { db, player } = await getPlayerMoney(userId);
  const dispo = player.money[cible][from] ?? 0;
  if (dispo < qty) return { ok: false, reason: 'insufficient', dispo };
  const { nbTo, resteFrom, pertePc, totalPc } = convertMath(from, to, qty);
  if (nbTo <= 0) return { ok: false, reason: 'too_small', totalPc, need: COIN_VALUE[to] };
  player.money[cible][from] -= qty;
  player.money[cible][to] += nbTo;
  if (resteFrom > 0) player.money[cible][from] += resteFrom;
  await writeDB(db);
  return { ok: true, nbTo, resteFrom, pertePc };
}

function formatWalletLine(k, v) { return `${COIN_NAME[k]}: ${v}`; }
function walletToText(moneyObj) { return Object.entries(moneyObj).map(([k, v]) => formatWalletLine(k, v)).join('\n'); }

async function replyAdd(interaction, cible, piece, montant) {
  const userId = interaction.user.id;
  await add(userId, cible, piece, montant);
  return ok(interaction, `Ajouté ${montant} ${COIN_NAME[piece]} à ton ${cible}.`);
}

async function replyRemove(interaction, cible, piece, montant) {
  const userId = interaction.user.id;
  await remove(userId, cible, piece, montant);
  return ok(interaction, `Retiré ${montant} ${COIN_NAME[piece]} de ton ${cible}.`);
}

async function replyTransfer(interaction, from, to, piece, qty) {
  const userId = interaction.user.id;
  const res = await transfer(userId, from, to, piece, qty);
  if (!res.ok) {
    if (res.reason === 'same_target') return fail(interaction, 'La source et la destination doivent être différentes.');
    if (res.reason === 'insufficient') return fail(interaction, `Solde insuffisant: ${res.dispo} ${piece.toUpperCase()} côté ${from}.`);
    return;
  }
  return ok(interaction, `Transféré ${qty} ${COIN_NAME[piece]} de ${from} vers ${to}. Nouveau solde: ${from}=${res.fromLeft} | ${to}=${res.toNow}.`);
}

async function replyExchange(interaction, cible, from, to, qty) {
  const userId = interaction.user.id;
  const res = await exchange(userId, cible, from, to, qty);
  if (!res.ok) {
    if (res.reason === 'same_piece') return fail(interaction, 'La pièce source et cible doivent être différentes.');
    if (res.reason === 'insufficient') return fail(interaction, `Solde insuffisant en ${from.toUpperCase()}.`);
    if (res.reason === 'too_small') return fail(interaction, `Valeur insuffisante pour obtenir 1 ${to.toUpperCase()}.`);
    return;
  }
  const parts = [`Échange: ${qty} ${from.toUpperCase()} -> ${res.nbTo} ${to.toUpperCase()}`];
  if (res.resteFrom > 0) parts.push(`reste ${res.resteFrom} ${from.toUpperCase()}`);
  if (res.pertePc > 0) parts.push(`perte ${res.pertePc} pc`);
  return ok(interaction, parts.join(', '));
}

async function readMoneyDB(userId) {
  const { db, player } = await getPlayerMoney(userId);
  return { db, player };
}

module.exports = {
  COIN_VALUE, COIN_LABEL, COIN_NAME,
  getPlayerMoney, validateTarget, validatePiece,
  add, remove, transfer, exchange, convertMath, walletToText,
  replyAdd, replyRemove, replyTransfer, replyExchange, readMoneyDB,
};