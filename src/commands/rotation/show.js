const { SlashCommandBuilder } = require('discord.js');
const { getActiveRotation, getPairs } = require('../../services/rotationService');
const { buildRotationEmbed, buildDoneButton } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-show')
    .setDescription('Display the current rotation status here.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    const pairs = await getPairs(rotation.id);
    const { embed, currentPair } = await buildRotationEmbed(rotation, pairs, rotation.is_active);
    const disabled = !rotation.is_active || pairs.length === 0;
    const row = buildDoneButton(rotation.id, disabled);

    const mentionText = currentPair
      ? `**Current Pair:** <@${currentPair.user1_id}> <@${currentPair.user2_id}>`
      : '';

    await interaction.editReply({
      content: mentionText,
      embeds: [embed],
      components: [row],
    });
  },
};