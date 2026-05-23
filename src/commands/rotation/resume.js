const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { setRotationPaused, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-resume')
    .setDescription('Resume a rotation (re-enables Done button).'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'resume', {});
    if (!rotation) return;

    await setRotationPaused(rotation.id, false);
    const updated = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);

    const settings = await getGuildSettings(interaction.guildId);
    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) await updateRotationMessage(channel, updated, pairs);
    }

    await interaction.editReply(`▶️ **${rotation.name}** resumed.`);
  },
};