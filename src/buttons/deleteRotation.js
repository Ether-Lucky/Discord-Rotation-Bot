const { getRotation } = require('../services/rotationService');
const { getGuildSettings } = require('../services/settingsService');
const supabase = require('../database/supabase');

module.exports = {
  customId: 'confirmdelete',

  async execute(interaction) {
    await interaction.deferUpdate();

    const rotationId = interaction.customId.split(':')[1];

    // Fetch rotation before deleting so we can clean up the dashboard message
    const rotation = await getRotation(rotationId);
    const settings = await getGuildSettings(interaction.guildId);

    // Try to delete the persistent dashboard message from the channel
    if (rotation?.status_message_id && settings) {
      try {
        const channel = await interaction.guild.channels.fetch(settings.display_channel_id);
        const message = await channel.messages.fetch(rotation.status_message_id);
        await message.delete();
      } catch {
        // Message already gone, no problem
      }
    }

    // Delete the rotation (cascades to buddy_pairs and completion_logs)
    const { error } = await supabase
      .from('rotations')
      .delete()
      .eq('id', rotationId);

    if (error) {
      return interaction.editReply({
        content: `❌ Failed to delete rotation: ${error.message}`,
        components: [],
      });
    }

    await interaction.editReply({
      content: `🗑️ Rotation **${rotation.name}** has been deleted along with all its pairs.`,
      components: [],
    });
  },
};