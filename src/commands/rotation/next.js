const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, advanceRotation, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage, sendTurnNotification } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-next')
    .setDescription('Manually advance the rotation to the next pair.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const settings = await getGuildSettings(interaction.guildId);
    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) return interaction.editReply('⚠️ No active rotation found.');

    await advanceRotation(rotation.id);

    const updated = await getRotation(rotation.id); // fresh state
    const pairs = await getPairs(rotation.id);
    const currentPair = pairs[updated.current_index % pairs.length];

    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) {
        await updateRotationMessage(channel, updated, pairs);
        await sendTurnNotification(channel, currentPair);
      }
    }

    await interaction.editReply(`✅ Rotation advanced. Current pair: <@${currentPair.user1_id}> & <@${currentPair.user2_id}>`);
  },
};