const { getRotation, getPairs, removePairById } = require('../services/rotationService');
const { getGuildSettings } = require('../services/settingsService');
const { updateRotationMessage } = require('../services/messageService');

module.exports = {
  customId: 'removepair',

  async execute(interaction) {
    await interaction.deferUpdate();

    const rotationId = interaction.customId.split(':')[1];
    const pairId = interaction.values[0]; // selected pair UUID

    // Remove the pair and renumber positions
    await removePairById(rotationId, pairId);

    // Refresh state and update the dashboard
    const updatedRotation = await getRotation(rotationId);
    const updatedPairs = await getPairs(rotationId);
    const settings = await getGuildSettings(interaction.guildId);

    if (settings) {
      const channel = await interaction.guild.channels
        .fetch(settings.display_channel_id)
        .catch(() => null);
      if (channel) await updateRotationMessage(channel, updatedRotation, updatedPairs);
    }

    await interaction.editReply({
      content: '✅ Pair removed and positions renumbered. Dashboard updated.',
      components: [],
    });
  },
};