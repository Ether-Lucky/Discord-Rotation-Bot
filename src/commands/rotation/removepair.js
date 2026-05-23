const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { getPairs } = require('../../services/rotationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-removepair')
    .setDescription('Remove a buddy pair or solo entry from a rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'removepair', {});
    if (!rotation) return;

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) return interaction.editReply('⚠️ There are no entries to remove.');

    const userIds = [...new Set(pairs.flatMap(p => p.user2_id ? [p.user1_id, p.user2_id] : [p.user1_id]))];
    const memberMap = new Map();
    try {
      const fetched = await interaction.guild.members.fetch({ user: userIds });
      fetched.forEach(m => memberMap.set(m.id, m.displayName));
    } catch {}

    const getName = (id) => memberMap.get(id) || id;

    const options = pairs.map((pair, index) => ({
      label: (pair.user2_id
        ? `${index + 1}. ${getName(pair.user1_id)} & ${getName(pair.user2_id)}`
        : `${index + 1}. ${getName(pair.user1_id)} (solo)`).slice(0, 100),
      description: pair.user2_id ? 'Pair entry' : 'Solo entry',
      value: pair.id,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`removepair:${rotation.id}`)
        .setPlaceholder('Select an entry to remove...')
        .addOptions(options)
    );

    await interaction.editReply({ content: `🗑️ Select an entry to remove from **${rotation.name}**:`, components: [row] });
  },
};