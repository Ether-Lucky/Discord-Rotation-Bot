const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, getPairs } = require('../../services/rotationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-removepair')
    .setDescription('Remove a buddy pair from the active rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) {
      return interaction.editReply('⚠️ There are no pairs to remove.');
    }

    // Fetch guild members to get display names
    const options = await Promise.all(pairs.map(async (pair, index) => {
      let user1Name, user2Name;
      try {
        const member1 = await interaction.guild.members.fetch(pair.user1_id);
        user1Name = member1.displayName;
      } catch {
        user1Name = `User ${pair.user1_id}`;
      }
      try {
        const member2 = await interaction.guild.members.fetch(pair.user2_id);
        user2Name = member2.displayName;
      } catch {
        user2Name = `User ${pair.user2_id}`;
      }

      return {
        label: `${index + 1}. ${user1Name} & ${user2Name}`,
        value: pair.id, // use the pair's UUID as the value
      };
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`removepair:${rotation.id}`)
      .setPlaceholder('Select a pair to remove...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      content: '🗑️ Select the pair you want to remove:',
      components: [row],
    });
  },
};