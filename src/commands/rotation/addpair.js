const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, addPair, getPairs, getRotation } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { updateRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-addpair')
    .setDescription('Add a buddy pair to the active rotation.')
    .addUserOption(opt =>
      opt.setName('user1').setDescription('First buddy.').setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('user2').setDescription('Second buddy.').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');

    const rotation = await getActiveRotation(interaction.guildId);
    if (!rotation) {
      return interaction.editReply('⚠️ No active rotation found. Create one with `/rotation-create`.');
    }

    const pair = await addPair(rotation.id, user1.id, user2.id);

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
      `✅ Added pair at position **${pair.position + 1}**: <@${user1.id}> & <@${user2.id}>. Dashboard updated.`
    );
  },
};