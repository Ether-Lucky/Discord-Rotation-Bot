const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');
const supabase = require('../../database/supabase');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-addsolo')
    .setDescription('Add a single user (no pair) to the active rotation.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to add.')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const user = interaction.options.getUser('user');

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found. Create one with `/rotation-create`.');
    }

    // Get current max position
    const { data: existingPairs } = await supabase
      .from('buddy_pairs')
      .select('position')
      .eq('rotation_id', rotation.id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingPairs && existingPairs.length > 0
      ? existingPairs[0].position + 1
      : 0;

    // Check if user is already in the rotation as a solo or in a pair
    const { data: existing } = await supabase
      .from('buddy_pairs')
      .select('id')
      .eq('rotation_id', rotation.id)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (existing && existing.length > 0) {
      return interaction.editReply(`⚠️ <@${user.id}> is already in this rotation.`);
    }

    // Insert with user2_id as null to indicate solo
    const { error } = await supabase
      .from('buddy_pairs')
      .insert({
        id: uuidv4(),
        rotation_id: rotation.id,
        user1_id: user.id,
        user2_id: null,
        position: nextPosition,
      });

    if (error) throw new Error(`addsolo: ${error.message}`);

    // Refresh state and update the dashboard
    const updatedRotation = await getRotation(rotation.id);
    const updatedPairs = await getPairs(rotation.id);
    const settings = await getGuildSettings(interaction.guildId);

    if (settings) {
      const channel = await interaction.guild.channels
        .fetch(settings.display_channel_id)
        .catch(() => null);
      if (channel) await updateRotationMessage(channel, updatedRotation, updatedPairs);
    }

    await interaction.editReply(
      `✅ Added <@${user.id}> as a solo entry at position **${nextPosition + 1}**. Dashboard updated.`
    );
  },
};