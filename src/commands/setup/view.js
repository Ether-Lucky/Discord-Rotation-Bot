const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../../services/settingsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-view')
    .setDescription('View the current bot configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await getGuildSettings(interaction.guildId);

    if (!settings) {
      return interaction.editReply('⚠️ No configuration found. Run `/setup` first.');
    }

    await interaction.editReply(
      `**Current Configuration:**\n` +
      `**Manager Role:** <@&${settings.manager_role_id}>\n` +
      `**Display Channel:** <#${settings.display_channel_id}>`
    );
  },
};