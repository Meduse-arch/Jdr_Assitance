const { promises: fs } = require('node:fs');
const path = require('node:path');

async function loadCommands(dir = path.join(__dirname, '../commands')) {
  const files = await fs.readdir(dir);
  const modules = [];

  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const full = path.join(dir, f);
    try {
      const mod = require(full);
      if (mod && Array.isArray(mod.builders)) modules.push(mod);
    } catch (e) {
      console.warn(`Commande ignorée (erreur au chargement): ${f}`, e.message);
      continue;
    }
  }

  const builders = modules.flatMap(m => m.builders);
  return { modules, builders };
}

module.exports = { loadCommands };
