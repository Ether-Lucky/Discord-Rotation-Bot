const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, setRotationPaused, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-resume')
    .setDescription('Resume the rotation (re-enable the Done button).'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const settings = await getGuildSettings(interaction.guildId);
    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) return interaction.editReply('⚠️ No active rotation found.');

    await setRotationPaused(rotation.id, false);

    const updated = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);

    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) await updateRotationMessage(channel, updated, pairs);
    }

    await interaction.editReply('▶️ Rotation resumed. The Done button is active again.');
  },
};