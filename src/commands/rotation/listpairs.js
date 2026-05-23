const { SlashCommandBuilder } = require('discord.js');
const { pickRotation } = require('../../utils/rotationPicker');
const { getPairs } = require('../../services/rotationService');
const { formatPairWithIndex } = require('../../utils/formatPair');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-listpairs')
    .setDescription('List all entries in a rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rotation = await pickRotation(interaction, 'listpairs', {});
    if (!rotation) return;

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) return interaction.editReply(`**${rotation.name}** has no entries yet.`);

    const currentIndex = rotation.current_index % pairs.length;
    const lines = pairs.map((pair, i) => {
      const entry = pair.user2_id
        ? `**${i + 1}.** <@${pair.user1_id}> & <@${pair.user2_id}>`
        : `**${i + 1}.** <@${pair.user1_id}> *(solo)*`;
      return entry + (i === currentIndex ? ' 🎯' : '');
    });

    await interaction.editReply(`**🔄 ${rotation.name} — Entries:**\n\n${lines.join('\n')}\n\n*🎯 = current*`);
  },
};