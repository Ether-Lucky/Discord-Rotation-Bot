const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation } = require('../../services/rotationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-delete')
    .setDescription('Delete the current active rotation and all its pairs.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    // Ask for confirmation before deleting
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirmdelete:${rotation.id}`)
        .setLabel('🗑️ Yes, delete it')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('canceldelete')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      content: `⚠️ Are you sure you want to delete the rotation **${rotation.name}**?\nThis will remove all its pairs and cannot be undone.`,
      components: [confirmRow],
    });
  },
};