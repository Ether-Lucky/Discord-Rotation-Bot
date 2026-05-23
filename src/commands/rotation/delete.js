const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-delete')
    .setDescription('Delete a rotation and all its entries.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const rotation = await pickRotation(interaction, 'delete', {});
    if (!rotation) return;

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
      content: `⚠️ Are you sure you want to delete **${rotation.name}**?\nThis will remove all its entries and cannot be undone.`,
      components: [confirmRow],
    });
  },
};