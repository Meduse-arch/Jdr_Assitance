// Fichier : server/utils/logger.js
const globalLogs = [];
const MAX_LOGS = 50;

// Sauvegarde de la console d'origine
const originalLog = console.log;

export function initLogger() {
  console.log = (...args) => {
    originalLog(...args); // Affiche toujours dans le terminal du PC
    
    // Formate le message pour le stockage
    const msg = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Ajoute au début (plus récent en haut) et limite la taille
    globalLogs.unshift({ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text: msg });
    if (globalLogs.length > MAX_LOGS) globalLogs.pop();
  };
}

export function getLogs() {
  return globalLogs;
}