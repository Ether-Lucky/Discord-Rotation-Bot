const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { setRotationPaused, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-pause')
    .setDescription('Pause a rotation (disables Done button).'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'pause', {});
    if (!rotation) return;

    await setRotationPaused(rotation.id, true);
    const updated = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);

    const settings = await getGuildSettings(interaction.guildId);
    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) await updateRotationMessage(channel, updated, pairs);
    }

    await interaction.editReply(`⏸️ **${rotation.name}** paused.`);
  },
};