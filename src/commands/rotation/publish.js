const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { pickRotation } = require('../../utils/rotationPicker');
const { getPairs } = require('../../services/rotationService');
const { getGuildSettings } = require('../../services/settingsService');
const { publishRotationMessage } = require('../../services/messageService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-publish')
    .setDescription('Publish the persistent dashboard message for a rotation.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const settings = await getGuildSettings(interaction.guildId);
    if (!settings) return interaction.editReply('⚠️ Run `/setup` first.');

    const rotation = await pickRotation(interaction, 'publish', {});
    if (!rotation) return;

    // Block if already published
    if (rotation.status_message_id) {
      return interaction.editReply(
        `⚠️ **${rotation.name}** is already published.\n` +
        `Use \`/rotation-unpublish\` first if you want to republish it.`
      );
    }

    const pairs = await getPairs(rotation.id);
    if (!pairs.length) return interaction.editReply('⚠️ Add at least one entry before publishing.');

    const channel = await interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
    if (!channel) return interaction.editReply('⚠️ Display channel not found. Re-run `/setup`.');

    await publishRotationMessage(channel, rotation, pairs);
    await interaction.editReply(`✅ **${rotation.name}** published in ${channel}!`);
  },
};