const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { advanceRotation, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage, sendTurnNotification } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-next')
    .setDescription('Manually advance a rotation to the next entry.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'next', {});
    if (!rotation) return;

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) return interaction.editReply('⚠️ No entries in this rotation.');

    await advanceRotation(rotation.id);
    const updated = await getRotation(rotation.id);
    const updatedPairs = await getPairs(rotation.id);
    const currentPair = updatedPairs[updated.current_index % updatedPairs.length];

    const settings = await getGuildSettings(interaction.guildId);
    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) { await updateRotationMessage(channel, updated, updatedPairs); await sendTurnNotification(channel, currentPair); }
    }

    const mention = currentPair.user2_id ? `<@${currentPair.user1_id}> & <@${currentPair.user2_id}>` : `<@${currentPair.user1_id}>`;
    await interaction.editReply(`✅ **${rotation.name}** advanced. Current: ${mention}`);
  },
};