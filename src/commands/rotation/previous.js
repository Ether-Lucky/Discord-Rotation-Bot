const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, goToPreviousPair, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-previous')
    .setDescription('Go back one pair in the rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const settings = await getGuildSettings(interaction.guildId);
    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) return interaction.editReply('⚠️ No active rotation found.');

    await goToPreviousPair(rotation.id);

    const updated = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);

    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) await updateRotationMessage(channel, updated, pairs);
    }

    const currentPair = pairs[updated.current_index % pairs.length];
    await interaction.editReply(`✅ Went back. Current pair: <@${currentPair.user1_id}> & <@${currentPair.user2_id}>`);
  },
};