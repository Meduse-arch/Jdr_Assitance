require('dotenv').config({ path: '../.env' });

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./src/framework/registry');
const { installGlobalPaths } = require('./src/framework/session');
const { ok, fail } = require('./src/framework/replies');

async function bootstrap() {
  // Installe les chemins de session (global.PATHS.*)
  await installGlobalPaths();

  // Charge toutes les commandes (builders/handlers)
  const { modules } = await loadCommands();

  // Construit une map nom -> handler
  const handlers = new Collection();
  for (const m of modules) {
    if (!m || !m.handlers) continue;
    for (const [name, fn] of Object.entries(m.handlers)) {
      handlers.set(name, fn);
    }
  }

  // Client Discord minimal
  const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });

  client.once('ready', () => {
    console.log(`${client.user.tag} prêt !`);
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      const command = interaction.commandName;
      const handler = handlers.get(command);
      if (!handler) return fail(interaction, 'Commande inconnue.');
      await handler(interaction);
    } catch (err) {
      console.error('Erreur handler:', err);
      if (interaction.isRepliable && !interaction.replied && !interaction.deferred) {
        await fail(interaction, 'Une erreur est survenue.');
      }
    }
  });

  await client.login(process.env.TOKEN);
}

bootstrap().catch((e) => {
  console.error('Erreur au démarrage:', e);
  process.exitCode = 1;
});
