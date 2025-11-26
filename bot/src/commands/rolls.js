const { SlashCommandBuilder } = require('discord.js');
const { readDB, writeDB } = require('../framework/session');
const { d, xdy, adv, parseXdy } = require('../framework/random');
const { ok, fail } = require('../framework/replies');

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
      money: { bank: { pc: 0, pa: 0, po: 0, pp: 0 }, wallet: { pc: 0, pa: 0, po: 0, pp: 0 } },
    };
  }
  return { db, sessionId, player: db.sessions[sessionId].players[userId] };
}

function getEffets(interaction) {
  const effets = [];
  for (let i = 1; i <= 9; i++) {
    const v = interaction.options.getInteger('effet' + i);
    if (v) effets.push({ index: i, valeur: v });
  }
  return effets;
}

const builders = [
  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Lance un ou plusieurs dés (100 par défaut, fiche optionnelle)')
    .addIntegerOption(o => o.setName('nombre').setDescription('Nombre de lancers').setRequired(false).setMinValue(1))
    .addIntegerOption(o => o.setName('min').setDescription('Valeur min').setRequired(false))
    .addIntegerOption(o => o.setName('max').setDescription('Valeur max').setRequired(false))
    .addStringOption(o => o.setName('de').setDescription('Forme xdy (ex: 2d20)').setRequired(false))
    .addStringOption(o => o.setName('fiche').setDescription('Stat de fiche à lancer')
      .setRequired(false)
      .addChoices(
        { name: 'Force', value: 'force' },
        { name: 'Agilité', value: 'agilite' },
        { name: 'Constitution', value: 'constitution' },
        { name: 'Intelligence', value: 'intelligence' },
        { name: 'Perception', value: 'perception' },
        { name: 'Sort', value: 'sort' }
      ))
    .addStringOption(o => o.setName('type').setDescription('Avantage/Malus')
      .setRequired(false)
      .addChoices({ name: 'Avantage', value: 'a' }, { name: 'Malus', value: 'm' }))
    .addIntegerOption(o => o.setName('modificateur').setDescription('Modificateur à ajouter').setRequired(false))
    // Options spécifiques pour sort
    .addIntegerOption(o => o.setName('modificateur_effet').setDescription('Modif global effets (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet1').setDescription('Effet 1 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet2').setDescription('Effet 2 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet3').setDescription('Effet 3 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet4').setDescription('Effet 4 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet5').setDescription('Effet 5 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet6').setDescription('Effet 6 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet7').setDescription('Effet 7 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet8').setDescription('Effet 8 (sort uniquement)').setRequired(false))
    .addIntegerOption(o => o.setName('effet9').setDescription('Effet 9 (sort uniquement)').setRequired(false)),
];

const handlers = {
  roll: async (interaction) => {
    const nombre = interaction.options.getInteger('nombre') || 1;
    const min = interaction.options.getInteger('min');
    const max = interaction.options.getInteger('max');
    const de = interaction.options.getString('de');
    const fiche = interaction.options.getString('fiche');
    const type = interaction.options.getString('type') || null;
    const mod = interaction.options.getInteger('modificateur') || 0;
    const userId = interaction.user.id;

    // Si une fiche est spécifiée
    if (fiche) {
      const { db, player } = await getPlayerData(userId);
      const j = player.joueur;

      // CAS SPÉCIAL : SORT
      if (fiche === 'sort') {
        const modEffet = interaction.options.getInteger('modificateur_effet') || 0;
        const effets = getEffets(interaction);
        const totalEffet = effets.reduce((s, e) => s + e.valeur, 0);
        const intelDispo = j.intelligence - totalEffet;
        
        if (intelDispo < 0) return fail(interaction, "Erreur : trop d'effets (total > stat intelligence)");
        
        const allOutputs = [];
        let totalManaConsumed = 0;

        // Boucle pour nombre de sorts
        for (let n = 0; n < nombre; n++) {
          const rollBase = adv(intelDispo, type);
          const intFinal = rollBase.chosen + mod;
          totalManaConsumed += rollBase.chosen;
          
          const out = [
            `**Sort ${n + 1}** (${intelDispo}/${j.intelligence})`,
            `🎲 [${rollBase.list.join(', ')}]${type ? ` (${type})` : ''} → ${rollBase.chosen}`,
            `Modif int: ${mod >= 0 ? '+' : ''}${mod}`,
            `Résultat sort: ${intFinal}`,
          ];
          
          const effetsResults = [];
          for (const e of effets) {
            const r = adv(e.valeur, type);
            effetsResults.push(r.chosen + modEffet);
            out.push(`Effet${e.index} (${e.valeur}): [${r.list.join(', ')}]${type ? ` (${type})` : ''} → ${r.chosen}`);
          }
          
          if (effets.length && modEffet) {
            out.push(`Modificateur effet: ${modEffet >= 0 ? '+' : ''}${modEffet}`);
            out.push(`Effets finaux: [${effetsResults.join(', ')}]`);
          }
          
          allOutputs.push(out.join('\n'));
        }

        j.mana = Math.max(0, j.mana - totalManaConsumed);
        allOutputs.push(`\nMana totale consommée: ${totalManaConsumed} → Mana: ${j.mana}`);
        
        await writeDB(db);
        return ok(interaction, allOutputs.join('\n\n'));
      }

      // CAS NORMAL : STATS (force, agilité, etc.)
      const statValue = j[fiche];
      const statLabel = fiche.charAt(0).toUpperCase() + fiche.slice(1);
      
      const results = [];
      let totalStamConsumed = 0;
      
      for (let i = 0; i < nombre; i++) {
        const roll = adv(statValue, type);
        const final = roll.chosen + mod;
        results.push(`Roll ${i + 1}: 🎲 [${roll.list.join(', ')}]${type ? ` (${type})` : ''} → ${roll.chosen} + ${mod} = **${final}**`);
        
        // Consommer stam pour force et agilité
        if (fiche === 'force' || fiche === 'agilite') {
          totalStamConsumed += roll.chosen;
        }
      }
      
      if (totalStamConsumed > 0) {
        j.stam = Math.max(0, j.stam - totalStamConsumed);
        await writeDB(db);
        results.push(`\nStam consommée: ${totalStamConsumed} → Stam: ${j.stam}`);
      } else {
        await writeDB(db);
      }
      
      return ok(interaction, `**${statLabel}** (${statValue})\n${results.join('\n')}`);
    }

    // ROLL CLASSIQUE (sans fiche)
    const results = [];
    for (let i = 0; i < nombre; i++) {
      let out;
      const parsed = parseXdy(de);
      
      if (parsed) {
        const r = xdy(parsed.x, parsed.y);
        out = `Roll ${i + 1}: ${parsed.x}d${parsed.y} → [${r.vals.join(', ')}] = **${r.sum}**`;
      } else if (de) {
        return fail(interaction, 'Format de dé non reconnu (ex: 2d20).');
      } else if (min !== null || max !== null) {
        let a = min ?? 1; let b = max ?? 100;
        if (a > b) [a, b] = [b, a];
        const result = a + (d(b - a + 1) - 1);
        out = `Roll ${i + 1}: ${a}-${b} → **${result}**`;
      } else {
        const result = d(100);
        out = `Roll ${i + 1}: 1-100 → **${result}**`;
      }
      
      results.push(out);
    }
    
    return ok(interaction, results.join('\n'));
  },
};

module.exports = { builders, handlers };
