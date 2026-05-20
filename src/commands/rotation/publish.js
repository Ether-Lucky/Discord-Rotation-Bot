const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, getPairs } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { publishRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-publish')
    .setDescription('Publish the persistent rotation status message.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const settings = await getGuildSettings(interaction.guildId);
    if (!settings) {
      return interaction.editReply('⚠️ Run `/setup` first to configure a display channel.');
    }

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation. Create one with `/rotation-create`.');
    }

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) {
      return interaction.editReply('⚠️ Add at least one pair before publishing.');
    }

    const channel = await interaction.guild.channels.fetch(settings.display_channel_id);
    if (!channel) {
      return interaction.editReply('⚠️ Display channel not found. Re-run `/setup`.');
    }

    await publishRotationMessage(channel, rotation, pairs);

    await interaction.editReply(`✅ Rotation message published in ${channel}!`);
  },
};