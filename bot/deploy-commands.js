require('dotenv').config({ path: '.env' });
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./src/framework/registry.js');

async function main() {
  const { CLIENT_ID: appId, TOKEN: token, GUILD_ID: guildId } = process.env;
  
  // Vérification basique des variables d'environnement
  if (!appId || !token) {
    throw new Error('CLIENT_ID ou TOKEN manquant dans le fichier .env');
  }

  // 1. Charger tes commandes locales (celles définies dans src/commands)
  const { builders } = await loadCommands();
  if (!builders.length) {
    console.warn('⚠️ Aucune commande détectée dans src/commands.');
  } else {
    console.log(`✅ ${builders.length} commandes locales chargées.`);
  }

  // Préparer le tableau des nouvelles commandes
  const body = builders.map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);

  // 2. Récupérer les commandes DÉJÀ en ligne pour sauver le "Point d'entrée" (Bouton d'Activité)
  // C'est cette étape qui corrige l'erreur 50240
  console.log('🔄 Récupération des commandes existantes sur Discord...');
  
  try {
    // On définit la route (Guilde ou Global)
    const route = guildId 
      ? Routes.applicationGuildCommands(appId, guildId) 
      : Routes.applicationCommands(appId);

    // On récupère la liste actuelle
    const currentCommands = await rest.get(route);
    
    // On cherche spécifiquement la commande de type 4 (PRIMARY_ENTRY_POINT)
    const entryPointCommand = currentCommands.find(cmd => cmd.type === 4);

    if (entryPointCommand) {
      console.log(`📍 Point d'entrée d'Activité trouvé : "${entryPointCommand.name}". Il sera conservé.`);
      
      // On l'ajoute manuellement à la liste qu'on va envoyer
      body.push({
        id: entryPointCommand.id,
        name: entryPointCommand.name,
        // Les points d'entrée n'ont souvent pas de description, mais on garde la structure
        description: entryPointCommand.description || '', 
        type: 4, // 4 = PRIMARY_ENTRY_POINT
        handler: entryPointCommand.handler, 
        integration_types: entryPointCommand.integration_types,
        contexts: entryPointCommand.contexts
      });
    }
  } catch (error) {
    // Si c'est le tout premier déploiement, il est normal qu'il n'y ait rien à récupérer.
    console.warn("⚠️ Impossible de lire les commandes existantes (ou premier déploiement) :", error.message);
  }

  // 3. Envoyer la mise à jour finale (Bulk Overwrite)
  console.log('🚀 Envoi des commandes à Discord...');
  
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body });
    console.log(`🎉 Succès ! Commandes déployées sur la guilde ${guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(appId), { body });
    console.log('🎉 Succès ! Commandes déployées globalement (peut prendre jusqu\'à 1h pour apparaître partout).');
  }
}

main().catch((e) => {
  console.error('❌ Erreur fatale lors du déploiement :', e);
  process.exitCode = 1;
});