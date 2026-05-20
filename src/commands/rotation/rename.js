const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');
const supabase = require('../../database/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-rename')
    .setDescription('Rename the current active rotation.')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('The new name for the rotation.')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const newName = interaction.options.getString('name');

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found.');
    }

    const oldName = rotation.name;

    // Update the name in the database
    const { error } = await supabase
      .from('rotations')
      .update({ name: newName })
      .eq('id', rotation.id);

    if (error) throw new Error(`rotation-rename: ${error.message}`);

    // Refresh state and update the dashboard
    const updatedRotation = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);
    const settings = await getGuildSettings(interaction.guildId);

    if (settings) {
      const channel = await interaction.guild.channels
        .fetch(settings.display_channel_id)
        .catch(() => null);
      if (channel) await updateRotationMessage(channel, updatedRotation, pairs);
    }

    await interaction.editReply(
      `✅ Rotation renamed from **${oldName}** to **${newName}**. Dashboard updated.`
    );
  },
};