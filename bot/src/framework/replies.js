function canReply(interaction) {
  return interaction && typeof interaction.reply === 'function';
}
async function safeSend(interaction, payload) {
  try {
    if (interaction && typeof interaction.reply === 'function' && !interaction.replied && !interaction.deferred) {
      return await interaction.reply(payload);
    }
    if (typeof interaction.followUp === 'function') {
      return await interaction.followUp(payload);
    }
    if (typeof interaction.editReply === 'function') {
      const { ephemeral, ...rest } = payload || {};           // ⟵ retire ephemeral sur edit
      return await interaction.editReply(rest);
    }
  } catch (e) { console.error('reply error:', e); }
}

async function ok(interaction, content, extra = {}) {
  const { ephemeral = false, embeds, files, components } = extra;
  return safeSend(interaction, { content, ephemeral, embeds, files, components });
}

async function fail(interaction, content, extra = {}) {
  const { ephemeral = true, embeds, files, components } = extra;
  return safeSend(interaction, { content, ephemeral, embeds, files, components });
}

module.exports = { ok, fail };
