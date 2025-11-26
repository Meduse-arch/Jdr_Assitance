const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getSession, setSession, sessionExists, createSession, deleteSession, installGlobalPaths
} = require('../framework/session');
const { ok, fail } = require('../framework/replies');

const builders = [
  new SlashCommandBuilder()
    .setName('session')
    .setDescription('Gérer/consulter la session: get | set | close')
    .addStringOption(o =>
      o.setName('action')
        .setDescription('get, set, close')
        .setRequired(true)
        .addChoices(
          { name: 'get', value: 'get' },
          { name: 'set', value: 'set' },
          { name: 'close', value: 'close' },
        ))
    .addStringOption(o =>
      o.setName('id')
        .setDescription('ID de session (requis pour set/close)')
        .setRequired(false)),
];

const handlers = {
  session: async (interaction) => {
    if (!global.PATHS) await installGlobalPaths();
    const action = interaction.options.getString('action');
    const id = interaction.options.getString('id')?.trim();
    const userId = interaction.user.id;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (action === 'get') {
      const sid = await getSession(userId);
      return ok(interaction, `Session actuelle : ${sid}`);
    }

    if (action === 'set') {
      if (!id) return fail(interaction, "ID requis pour l'action set.");
      const exists = await sessionExists(id);
      if (!exists) {
        if (!isAdmin) return fail(interaction, "Cette session n'existe pas. Demande à un admin de la créer.");
        await createSession(id);
      }
      try {
        await setSession(userId, id);
        return ok(interaction, `Connecté à la session ${id}${!exists && isAdmin ? ' (créée).' : '.'}`);
      } catch (e) {
        return fail(interaction, `Impossible de se connecter à la session: ${e.message}`);
      }
    }

    if (action === 'close') {
      if (!isAdmin) return fail(interaction, "Tu n'as pas la permission d'exécuter cette action.");
      if (!id) return fail(interaction, "ID requis pour l'action close.");
      const exists = await sessionExists(id);
      if (!exists) return fail(interaction, "Cette session n'existe pas ou a déjà été supprimée.");
      await deleteSession(id);
      return ok(interaction, `Session ${id} supprimée, avec toutes ses données.`);
    }

    return fail(interaction, "Action inconnue. Utilise get | set | close.");
  },
};

module.exports = { builders, handlers };
