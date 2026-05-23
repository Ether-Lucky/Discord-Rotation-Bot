const { SlashCommandBuilder } = require('discord.js');
const { pickRotation } = require('../../utils/rotationPicker');
const { getPairs } = require('../../services/rotationService');
const { buildRotationEmbed, buildDoneButton } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-show')
    .setDescription('Display a rotation status inline.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const rotation = await pickRotation(interaction, 'show', {});
    if (!rotation) return;

    const pairs = await getPairs(rotation.id);
    const { embed, currentPair } = await buildRotationEmbed(rotation, pairs, rotation.is_active);
    const disabled = !rotation.is_active || !pairs.length;
    const row = buildDoneButton(rotation.id, disabled);

    const mentionText = currentPair
      ? (currentPair.user2_id
        ? `**Current Pair:** <@${currentPair.user1_id}> <@${currentPair.user2_id}>`
        : `**Current:** <@${currentPair.user1_id}>`)
      : '';

    await interaction.editReply({ content: mentionText, embeds: [embed], components: [row] });
  },
};