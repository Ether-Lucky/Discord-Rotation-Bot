const { getRotation, getPairs } = require('../services/rotationService');
const { getGuildSettings } = require('../services/settingsService');
const { updateRotationMessage } = require('../services/messageService');
const supabase = require('../database/supabase');

module.exports = {
  customId: 'removepair',

  async execute(interaction) {
    await interaction.deferUpdate();

    const rotationId = interaction.customId.split(':')[1];
    const pairId = interaction.values[0]; // selected pair UUID

    // Delete the pair by its UUID
    const { error } = await supabase
      .from('buddy_pairs')
      .delete()
      .eq('id', pairId);

    if (error) {
      return interaction.editReply({
        content: `❌ Failed to remove pair: ${error.message}`,
        components: [],
      });
    }

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
      content: '✅ Pair removed. Dashboard updated.',
      components: [],
    });
  },
};