const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { goToPreviousPair, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-previous')
    .setDescription('Go back one entry in a rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'previous', {});
    if (!rotation) return;

    await goToPreviousPair(rotation.id);
    const updated = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);

    const settings = await getGuildSettings(interaction.guildId);
    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) await updateRotationMessage(channel, updated, pairs);
    }

    const current = pairs[updated.current_index % pairs.length];
    const mention = current.user2_id ? `<@${current.user1_id}> & <@${current.user2_id}>` : `<@${current.user1_id}>`;
    await interaction.editReply(`✅ **${rotation.name}** went back. Current: ${mention}`);
  },
};