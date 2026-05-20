const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, advanceRotation, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage, sendTurnNotification } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-force')
    .setDescription('Force advance the rotation to the next entry, bypassing the Done button.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) return interaction.editReply('⚠️ No active rotation found.');

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) return interaction.editReply('⚠️ No entries in this rotation.');
    if (pairs.length === 1) return interaction.editReply('⚠️ There is only one entry in the rotation.');

    const previousPair = pairs[rotation.current_index % pairs.length];

    await advanceRotation(rotation.id);

    const updatedRotation = await getRotation(rotation.id);
    const updatedPairs = await getPairs(rotation.id);
    const newCurrentPair = updatedPairs[updatedRotation.current_index % updatedPairs.length];

    const settings = await getGuildSettings(interaction.guildId);
    if (settings) {
      const channel = await interaction.guild.channels
        .fetch(settings.display_channel_id)
        .catch(() => null);
      if (channel) {
        await updateRotationMessage(channel, updatedRotation, updatedPairs);
        await sendTurnNotification(channel, newCurrentPair);
      }
    }

    const prevMention = previousPair.user2_id
      ? `<@${previousPair.user1_id}> & <@${previousPair.user2_id}>`
      : `<@${previousPair.user1_id}>`;

    const nextMention = newCurrentPair.user2_id
      ? `<@${newCurrentPair.user1_id}> & <@${newCurrentPair.user2_id}>`
      : `<@${newCurrentPair.user1_id}>`;

    await interaction.editReply(
      `⏩ Rotation force-advanced by ${interaction.user}.\n` +
      `**Skipped:** ${prevMention}\n` +
      `**Now current:** ${nextMention}`
    );
  },
};