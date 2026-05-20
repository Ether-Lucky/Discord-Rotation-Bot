const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, getPairs } = require('../../services/rotationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-removepair')
    .setDescription('Remove a buddy pair or solo entry from the active rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) {
      return interaction.editReply('⚠️ There are no entries to remove.');
    }

    // Collect all unique user IDs across all entries
    const userIds = [...new Set(
      pairs.flatMap(p => p.user2_id ? [p.user1_id, p.user2_id] : [p.user1_id])
    )];

    // Fetch all members in one single API call
    const memberMap = new Map();
    try {
      const fetched = await interaction.guild.members.fetch({ user: userIds });
      fetched.forEach(member => memberMap.set(member.id, member.displayName));
    } catch {
      // Fallback — if fetch fails, use user IDs as names
    }

    const getName = (id) => memberMap.get(id) || id;

    // Build dropdown options
    const options = pairs.map((pair, index) => {
      const label = pair.user2_id
        ? `${index + 1}. ${getName(pair.user1_id)} & ${getName(pair.user2_id)}`
        : `${index + 1}. ${getName(pair.user1_id)} (solo)`;

      return {
        label: label.slice(0, 100),
        description: pair.user2_id ? 'Pair entry' : 'Solo entry',
        value: pair.id,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`removepair:${rotation.id}`)
      .setPlaceholder('Select an entry to remove...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      content: '🗑️ Select the entry you want to remove:',
      components: [row],
    });
  },
};