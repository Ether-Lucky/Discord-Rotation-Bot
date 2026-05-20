const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, removePair, getPairs } = require('../../services/rotationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-removepair')
    .setDescription('Remove a buddy pair by position.')
    .addIntegerOption(opt =>
      opt.setName('position')
        .setDescription('Position number (from /rotation-listpairs).')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const position = interaction.options.getInteger('position') - 1; // convert to 0-based

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    const pairs = await getPairs(rotation.id);
    if (position < 0 || position >= pairs.length) {
      return interaction.editReply(`⚠️ Invalid position. There are ${pairs.length} pair(s).`);
    }

    await removePair(rotation.id, pairs[position].position);

    await interaction.editReply(`✅ Pair at position **${position + 1}** removed.`);
  },
};