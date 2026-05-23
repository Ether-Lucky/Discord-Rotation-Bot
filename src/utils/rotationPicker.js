const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getGuildRotations } = require('../services/rotationService');

/**
 * If the guild has only one rotation, return it directly.
 * If multiple, reply with a dropdown so the user picks one.
 *
 * @param {Interaction} interaction - already deferred
 * @param {string} action - the action key used in the select menu customId (e.g. 'addpair')
 * @param {object} [extra] - extra data to encode in the customId (serialized as JSON)
 * @returns {object|null} rotation if only one exists, null if picker was shown
 */
async function pickRotation(interaction, action, extra = {}) {
  const rotations = await getGuildRotations(interaction.guildId);

  if (!rotations.length) {
    await interaction.editReply('⚠️ No rotations found. Create one with `/rotation-create`.');
    return null;
  }

  if (rotations.length === 1) {
    return rotations[0];
  }

  // Multiple rotations — show a picker
  const options = rotations.map(r => ({
    label: r.name.slice(0, 100),
    description: `${r.is_active ? '▶️ Active' : '⏸️ Paused'}`,
    value: r.id,
  }));

  const extraStr = encodeURIComponent(JSON.stringify(extra));
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`pick:${action}:${extraStr}`)
    .setPlaceholder('Select a rotation...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.editReply({
    content: '🔄 Which rotation do you want to use?',
    components: [row],
  });

  return null;
}

module.exports = { pickRotation };