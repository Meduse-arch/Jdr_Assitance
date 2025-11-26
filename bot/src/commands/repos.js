const { SlashCommandBuilder } = require('discord.js');
const { readDB, writeDB } = require('../framework/session');
const { ok } = require('../framework/replies');

async function getPlayerData(userId) {
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

const builders = [
  new SlashCommandBuilder()
    .setName('repos')
    .setDescription('Restaure des ressources (HP, Mana, Stamina)')
    .addStringOption(o => 
      o.setName('type')
        .setDescription('Type de repos')
        .setRequired(true)
        .addChoices(
          { name: 'Long (HP + Mana + Stam)', value: 'long' },
          { name: 'Court (Mana + Stam)', value: 'court' },
          { name: 'Simple (Mana ou Stam)', value: 'simple' }
        ))
    .addStringOption(o =>
      o.setName('cible')
        .setDescription('Ressource à restaurer (pour repos simple uniquement)')
        .setRequired(false)
        .addChoices(
          { name: 'Mana', value: 'mana' },
          { name: 'Stamina', value: 'stam' }
        )),
];

const handlers = {
  repos: async (interaction) => {
    const userId = interaction.user.id;
    const type = interaction.options.getString('type');
    const cible = interaction.options.getString('cible');
    const { db, player } = await getPlayerData(userId);
    const j = player.joueur;

    if (type === 'long') {
      j.hp = j.hpMax;
      j.mana = j.manaMax;
      j.stam = j.stamMax;
      await writeDB(db);
      return ok(interaction, '✨ **Repos long** : HP, Mana et Stamina restaurés au maximum.');
    }

    if (type === 'court') {
      j.mana = j.manaMax;
      j.stam = j.stamMax;
      await writeDB(db);
      return ok(interaction, '💫 **Repos court** : Mana et Stamina restaurés au maximum.');
    }

    if (type === 'simple') {
      if (!cible) {
        return ok(interaction, '⚠️ Pour un repos simple, spécifie la ressource à restaurer (cible: mana ou stam).');
      }

      if (cible === 'mana') {
        j.mana = j.manaMax;
        await writeDB(db);
        return ok(interaction, '💧 **Repos simple** : Mana restaurée au maximum.');
      }
      
      if (cible === 'stam') {
        j.stam = j.stamMax;
        await writeDB(db);
        return ok(interaction, '⚡ **Repos simple** : Stamina restaurée au maximum.');
      }
    }

    return ok(interaction, '❌ Type de repos invalide.');
  },
};

module.exports = { builders, handlers };
