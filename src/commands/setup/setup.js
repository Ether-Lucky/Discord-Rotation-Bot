const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveGuildSettings } = require('../../services/settingsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the buddy rotation bot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('manager_role')
        .setDescription('Role that can manage rotations.')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('display_channel')
        .setDescription('Channel to display the rotation status.')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('manager_role');
    const channel = interaction.options.getChannel('display_channel');

    await saveGuildSettings(interaction.guildId, role.id, channel.id);

    await interaction.editReply(
      `✅ Setup complete!\n` +
      `**Manager Role:** ${role}\n` +
      `**Display Channel:** ${channel}`
    );
  },
};