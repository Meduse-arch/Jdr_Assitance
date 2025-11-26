require('dotenv').config({ path: '../.env' });
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./src/framework/registry');

async function main() {
  const { CLIENT_ID: appId, TOKEN: token, GUILD_ID: guildId } = process.env;
  if (!appId || !token) throw new Error('CLIENT_ID ou TOKEN manquant dans .env');

  const { builders } = await loadCommands();
  if (!builders.length) console.warn('Aucune commande détectée dans src/commands.');

  const body = builders.map(c => c.toJSON());
  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body });
    console.log(`Commandes déployées sur la guilde ${guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(appId), { body });
    console.log('Commandes déployées globalement.');
  }
}

main().catch((e) => {
  console.error('Erreur lors du déploiement :', e);
  process.exitCode = 1;
});
