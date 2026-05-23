const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');
const supabase = require('../../database/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-rename')
    .setDescription('Rename a rotation.')
    .addStringOption(opt => opt.setName('name').setDescription('The new name.').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const newName = interaction.options.getString('name');

    const rotation = await pickRotation(interaction, 'rename', { name: newName });
    if (!rotation) return;

    const oldName = rotation.name;
    const { error } = await supabase.from('rotations').update({ name: newName }).eq('id', rotation.id);
    if (error) throw new Error(`rotation-rename: ${error.message}`);

    const updated = await getRotation(rotation.id);
    const pairs = await getPairs(rotation.id);
    const settings = await getGuildSettings(interaction.guildId);

    if (settings) {
      const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
      if (channel) await updateRotationMessage(channel, updated, pairs);
    }

    await interaction.editReply(`✅ Renamed **${oldName}** → **${newName}**.`);
  },
};