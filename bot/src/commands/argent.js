const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const { ok } = require('../framework/replies');
const {
  COIN_LABEL, COIN_NAME, validateTarget, validatePiece,
  getPlayerMoney, walletToText,
  replyAdd, replyRemove, replyTransfer, replyExchange,
} = require('../framework/economie');

const builders = [
  new SlashCommandBuilder()
    .setName('add_money')
    .setDescription("Ajoute de l'argent à wallet ou banque")
    .addStringOption(o => o.setName('cible').setDescription('wallet ou banque').setRequired(true)
      .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'banque', value: 'bank' }))
    .addStringOption(o => o.setName('piece').setDescription('Type de pièce').setRequired(true)
      .addChoices({ name: 'cuivre', value: 'pc' }, { name: 'argent', value: 'pa' }, { name: 'or', value: 'po' }, { name: 'platine', value: 'pp' }))
    .addIntegerOption(o => o.setName('montant').setDescription('Quantité à ajouter').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('remove_money')
    .setDescription("Retire de l'argent du wallet ou banque")
    .addStringOption(o => o.setName('cible').setDescription('wallet ou banque').setRequired(true)
      .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'banque', value: 'bank' }))
    .addStringOption(o => o.setName('piece').setDescription('Type de pièce').setRequired(true)
      .addChoices({ name: 'cuivre', value: 'pc' }, { name: 'argent', value: 'pa' }, { name: 'or', value: 'po' }, { name: 'platine', value: 'pp' }))
    .addIntegerOption(o => o.setName('montant').setDescription('Quantité à retirer').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder().setName('money').setDescription('Affiche ton wallet et ta banque'),

  new SlashCommandBuilder().setName('money_valeur').setDescription("Affiche le tableau des taux d'échange des pièces"),

  new SlashCommandBuilder()
    .setName('money_transfer')
    .setDescription('Transférer des pièces entre wallet et banque')
    .addStringOption(o => o.setName('from').setDescription('Depuis').setRequired(true)
      .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'banque', value: 'bank' }))
    .addStringOption(o => o.setName('to').setDescription('Vers').setRequired(true)
      .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'banque', value: 'bank' }))
    .addStringOption(o => o.setName('piece').setDescription('Type de pièce').setRequired(true)
      .addChoices({ name: 'cuivre', value: 'pc' }, { name: 'argent', value: 'pa' }, { name: 'or', value: 'po' }, { name: 'platine', value: 'pp' }))
    .addIntegerOption(o => o.setName('quantite').setDescription('Quantité à transférer').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('money_exchange')
    .setDescription('Convertit des pièces (wallet/banque)')
    .addStringOption(o => o.setName('cible').setDescription('Où faire l\'échange').setRequired(true)
      .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'banque', value: 'bank' }))
    .addStringOption(o => o.setName('from').setDescription('Pièce source').setRequired(true)
      .addChoices({ name: 'pc', value: 'pc' }, { name: 'pa', value: 'pa' }, { name: 'po', value: 'po' }, { name: 'pp', value: 'pp' }))
    .addIntegerOption(o => o.setName('quantite').setDescription('Quantité à convertir').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('to').setDescription('Pièce cible').setRequired(true)
      .addChoices({ name: 'pc', value: 'pc' }, { name: 'pa', value: 'pa' }, { name: 'po', value: 'po' }, { name: 'pp', value: 'pp' })),
];

const handlers = {
  add_money: async (interaction) => {
    const cible = interaction.options.getString('cible');
    const piece = validatePiece(interaction.options.getString('piece'));
    const montant = interaction.options.getInteger('montant');
    return replyAdd(interaction, cible, piece, montant);
  },

  remove_money: async (interaction) => {
    const cible = interaction.options.getString('cible');
    const piece = validatePiece(interaction.options.getString('piece'));
    const montant = interaction.options.getInteger('montant');
    return replyRemove(interaction, cible, piece, montant);
  },

  money: async (interaction) => {
    const userId = interaction.user.id;
    const { player } = await getPlayerMoney(userId);
    const embed = new EmbedBuilder()
      .setTitle('Argent')
      .addFields(
        { name: 'Wallet', value: walletToText(player.money.wallet), inline: true },
        { name: 'Banque', value: walletToText(player.money.bank), inline: true },
      )
      .setColor(0xFFD700);
    return ok(interaction, '', { embeds: [embed] });
  },

  money_valeur: async (interaction) => {
    const filePath = path.join(__dirname, '..', 'image', 'tableau.png');
    const embed = new EmbedBuilder()
      .setTitle("Tableau des taux d'échange")
      .setImage('attachment://money_valeur.png')
      .setColor(0xFFD700);
    return ok(interaction, '', {
      embeds: [embed],
      files: [{ attachment: filePath, name: 'money_valeur.png' }],
    });
  },

  money_transfer: async (interaction) => {
    const from = interaction.options.getString('from');
    const to = interaction.options.getString('to');
    const piece = validatePiece(interaction.options.getString('piece'));
    const qty = interaction.options.getInteger('quantite');
    return replyTransfer(interaction, from, to, piece, qty);
  },

  money_exchange: async (interaction) => {
    const cible = interaction.options.getString('cible');
    const from = validatePiece(interaction.options.getString('from'));
    const to = validatePiece(interaction.options.getString('to'));
    const qty = interaction.options.getInteger('quantite');
    return replyExchange(interaction, cible, from, to, qty);
  },
};

module.exports = { builders, handlers, COIN_LABEL };
