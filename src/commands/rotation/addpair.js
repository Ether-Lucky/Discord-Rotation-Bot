const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { getActiveRotation, addPair } = require('../../services/rotationService');

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

    await interaction.editReply(
      `✅ Added pair at position **${pair.position + 1}**: <@${user1.id}> & <@${user2.id}>`
    );
  },
};