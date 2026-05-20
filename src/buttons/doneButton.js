const {
    getRotation,
    getCurrentPair,
    getPairs,
    advanceRotation,
    logCompletion,
  } = require('../services/rotationService');
  const { getGuildSettings } = require('../services/settingsService');
  const { updateRotationMessage, sendTurnNotification } = require('../services/messageService');
  
  module.exports = {
    // customId prefix — full format: "done:<rotationId>"
    customId: 'done',
  
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
  
      const rotationId = interaction.customId.split(':')[1];
  
      // ── 1. Fetch rotation ────────────────────────────────────────────────────
      const rotation = await getRotation(rotationId);
      if (!rotation) {
        return interaction.editReply('❌ Rotation not found.');
      }
  
      // ── 2. Check if active (not paused) ─────────────────────────────────────
      if (!rotation.is_active) {
        return interaction.editReply('⏸️ This rotation is currently paused.');
      }
  
      // ── 3. Get current pair ──────────────────────────────────────────────────
      const pairs = await getPairs(rotationId);
      if (!pairs.length) {
        return interaction.editReply('❌ No pairs in this rotation.');
      }
  
      const currentPair = pairs[rotation.current_index % pairs.length];
  
      // ── 4. Authorise the clicking user ───────────────────────────────────────
      const userId = interaction.user.id;
      const isAuthorized =
        userId === currentPair.user1_id || userId === currentPair.user2_id;
  
      if (!isAuthorized) {
        return interaction.editReply('🚫 Only the current buddy pair can press this button.');
      }
  
      // ── 5. Log completion ────────────────────────────────────────────────────
      await logCompletion(rotationId, rotation.current_index, userId);
  
      // ── 6. Advance rotation ──────────────────────────────────────────────────
      await advanceRotation(rotationId);
  
      // ── 7. Refresh state ─────────────────────────────────────────────────────
      const updatedRotation = await getRotation(rotationId);
      const updatedPairs = await getPairs(rotationId);
      const newCurrentPair = updatedPairs[updatedRotation.current_index % updatedPairs.length];
  
      // ── 8. Update the persistent message ────────────────────────────────────
      const settings = await getGuildSettings(interaction.guildId);
      if (settings) {
        const channel = await interaction.guild.channels
          .fetch(settings.display_channel_id)
          .catch(() => null);
  
        if (channel) {
          await updateRotationMessage(channel, updatedRotation, updatedPairs);
          await sendTurnNotification(channel, newCurrentPair);
        }
      }
  
      // ── 9. Confirm to the user ───────────────────────────────────────────────
      await interaction.editReply(
        `✅ Marked as done! The rotation has advanced to:\n` +
        `<@${newCurrentPair.user1_id}> & <@${newCurrentPair.user2_id}>`
      );
    },
  };