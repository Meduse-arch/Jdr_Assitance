const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readPlayerDB, writePlayerDB, ensureUser, updateDerived } = require('../framework/ficheStore');
const { ok } = require('../framework/replies');

function clampAdd(current, add, max) { return Math.min(current + add, max); }
function clampSub(current, sub) { return Math.max(current - sub, 0); }

/* --- Slash builders --- */
const builders = [
  new SlashCommandBuilder()
    .setName('init')
    .setDescription('Initialiser les stats de base.')
    .addIntegerOption(o => o.setName('force').setDescription('Force').setRequired(true))
    .addIntegerOption(o => o.setName('constitution').setDescription('Constitution').setRequired(true))
    .addIntegerOption(o => o.setName('agilite').setDescription('Agilité').setRequired(true))
    .addIntegerOption(o => o.setName('intelligence').setDescription('Intelligence').setRequired(true))
    .addIntegerOption(o => o.setName('perception').setDescription('Perception').setRequired(true)),

  new SlashCommandBuilder()
    .setName('modif')
    .setDescription('Modifie un attribut.')
    .addStringOption(o => o.setName('attribut').setDescription('Nom')
      .setRequired(true)
      .addChoices(
        { name: 'force', value: 'force' },
        { name: 'constitution', value: 'constitution' },
        { name: 'agilite', value: 'agilite' },
        { name: 'intelligence', value: 'intelligence' },
        { name: 'perception', value: 'perception' },
      ))
    .addIntegerOption(o => o.setName('valeur').setDescription('Valeur (+/-)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Ajoute une ressource.')
    .addStringOption(o => o.setName('cible').setDescription('hp/stam/mana')
      .setRequired(true)
      .addChoices({ name: 'hp', value: 'hp' }, { name: 'stam', value: 'stam' }, { name: 'mana', value: 'mana' }))
    .addIntegerOption(o => o.setName('valeur').setDescription('Valeur').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('cout')
    .setDescription('Retire une ressource.')
    .addStringOption(o => o.setName('cible').setDescription('hp/stam/mana')
      .setRequired(true)
      .addChoices({ name: 'hp', value: 'hp' }, { name: 'stam', value: 'stam' }, { name: 'mana', value: 'mana' }))
    .addIntegerOption(o => o.setName('valeur').setDescription('Valeur').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche la fiche joueur.'),
];

/* --- Handlers --- */
const handlers = {
  init: async (interaction) => {
    const userId = interaction.user.id;
    const { db, player } = await readPlayerDB(userId);
    const u = player.joueur;
    u.force = interaction.options.getInteger('force');
    u.constitution = interaction.options.getInteger('constitution');
    u.agilite = interaction.options.getInteger('agilite');
    u.intelligence = interaction.options.getInteger('intelligence');
    u.perception = interaction.options.getInteger('perception');
    updateDerived(u);
    u.hp = u.hpMax; u.mana = u.manaMax; u.stam = u.stamMax;
    await writePlayerDB(db);
    return ok(interaction, 'Stats initialisées.');
  },

  modif: async (interaction) => {
    const userId = interaction.user.id;
    const { db, player } = await readPlayerDB(userId);
    const u = player.joueur;
    const attr = interaction.options.getString('attribut');
    const val = interaction.options.getInteger('valeur');
    u[attr] = (u[attr] || 0) + val;
    if (['force', 'constitution', 'agilite', 'intelligence'].includes(attr)) updateDerived(u);
    await writePlayerDB(db);
    return ok(interaction, `${attr} modifiée de ${val}.`);
  },

  add: async (interaction) => {
    const userId = interaction.user.id;
    const { db, player } = await readPlayerDB(userId);
    const u = player.joueur;
    const cible = interaction.options.getString('cible');
    const val = interaction.options.getInteger('valeur');
    if (cible === 'hp') u.hp = clampAdd(u.hp, val, u.hpMax);
    if (cible === 'stam') u.stam = clampAdd(u.stam, val, u.stamMax);
    if (cible === 'mana') u.mana = clampAdd(u.mana, val, u.manaMax);
    await writePlayerDB(db);
    return ok(interaction, `Ajouté ${val} à ${cible}.`);
  },

  cout: async (interaction) => {
    const userId = interaction.user.id;
    const { db, player } = await readPlayerDB(userId);
    const u = player.joueur;
    const cible = interaction.options.getString('cible');
    const val = interaction.options.getInteger('valeur');
    if (cible === 'hp') u.hp = clampSub(u.hp, val);
    if (cible === 'stam') u.stam = clampSub(u.stam, val);
    if (cible === 'mana') u.mana = clampSub(u.mana, val);
    await writePlayerDB(db);
    return ok(interaction, `Retiré ${val} à ${cible}.`);
  },

  stats: async (interaction) => {
    const userId = interaction.user.id;
    const { player } = await readPlayerDB(userId);
    const u = player.joueur;
    const embed = new EmbedBuilder()
      .setTitle('Fiche joueur')
      .addFields(
        { name: 'HP', value: `${u.hp}/${u.hpMax}`, inline: true },
        { name: 'Mana', value: `${u.mana}/${u.manaMax}`, inline: true },
        { name: 'Stam', value: `${u.stam}/${u.stamMax}`, inline: true },
        { name: 'Force', value: `${u.force}`, inline: true },
        { name: 'Constitution', value: `${u.constitution}`, inline: true },
        { name: 'Agilité', value: `${u.agilite}`, inline: true },
        { name: 'Intelligence', value: `${u.intelligence}`, inline: true },
        { name: 'Perception', value: `${u.perception}`, inline: true },
      )
      .setColor(0x00AE86);
    return ok(interaction, '', { embeds: [embed] });
  },
};

module.exports = { builders, handlers };
