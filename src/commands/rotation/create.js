const { SlashCommandBuilder } = require('discord.js');
const { requireManager } = require('../../utils/permissions');
const { createRotation } = require('../../services/rotationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotation-create')
    .setDescription('Create a new buddy rotation.')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Name of the rotation.')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await requireManager(interaction);

    const name = interaction.options.getString('name');
    const rotation = await createRotation(interaction.guildId, name);

    await interaction.editReply(
      `✅ Rotation **${rotation.name}** created!\n` +
      `ID: \`${rotation.id}\`\n\n` +
      `Add pairs with \`/rotation-addpair\`, then publish with \`/rotation-publish\`.`
    );
  },
};