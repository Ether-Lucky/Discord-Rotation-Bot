const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { setStatusMessageId } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-unpublish')
    .setDescription('Remove the dashboard message and allow the rotation to be republished.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'unpublish', {});
    if (!rotation) return;

    if (!rotation.status_message_id) {
      return interaction.editReply(`⚠️ **${rotation.name}** is not currently published.`);
    }

    // Try to delete the dashboard message from the channel
    const settings = await getGuildSettings(interaction.guildId);
    if (settings) {
      try {
        const channel = await interaction.guild.channels.fetch(settings.display_channel_id);
        const message = await channel.messages.fetch(rotation.status_message_id);
        await message.delete();
      } catch {
        // Message already deleted or not found — that's fine
      }
    }

    // Clear the status_message_id so it can be republished
    await setStatusMessageId(rotation.id, null);

    await interaction.editReply(
      `✅ **${rotation.name}** has been unpublished. You can now use \`/rotation-publish\` to republish it.`
    );
  },
};