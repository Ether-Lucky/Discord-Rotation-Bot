const { SlashCommandBuilder } = require('discord.js');
const { getActiveRotation, getPairs, getRotation } = require('../../services/rotationService');
const { formatPairWithIndex } = require('../../utils/formatPair');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-listpairs')
    .setDescription('List all buddy pairs in the active rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    const pairs = await getPairs(rotation.id);

    if (!pairs.length) {
      return interaction.editReply(`**${rotation.name}** has no pairs yet. Use \`/rotation-addpair\`.`);
    }

    const currentIndex = rotation.current_index % pairs.length;
    const lines = pairs.map((pair, i) => {
      const marker = i === currentIndex ? ' 🎯' : '';
      return `${formatPairWithIndex(pair, i)}${marker}`;
    });

    await interaction.editReply(
      `**🔄 ${rotation.name} — Pairs:**\n\n${lines.join('\n')}\n\n` +
      `*🎯 = current pair*`
    );
  },
};