module.exports = {
    customId: 'canceldelete',
  
    async execute(interaction) {
      await interaction.deferUpdate();
      await interaction.editReply({
        content: '✅ Deletion cancelled. Rotation is unchanged.',
        components: [],
      });
    },
  };