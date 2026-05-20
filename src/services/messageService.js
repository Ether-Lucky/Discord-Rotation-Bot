const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const rotationService = require('./rotationService');
const { setStatusMessageId } = require('./rotationService');

/**
 * Build the rotation status embed.
 */
async function buildRotationEmbed(rotation, pairs, isActive) {
  const total = pairs.length;

  if (total === 0) {
    return {
      embed: new EmbedBuilder()
        .setTitle(`🔄 Buddy Rotation: ${rotation.name}`)
        .setDescription('No buddy pairs have been added yet.')
        .setColor(0x5865f2),
      currentPair: null,
    };
  }

  const currentIndex = rotation.current_index % total;
  const prevIndex = (currentIndex - 1 + total) % total;
  const nextIndex = (currentIndex + 1) % total;

  const fmt = (pair) => `<@${pair.user1_id}> & <@${pair.user2_id}>`;

  const currentPair = pairs[currentIndex];

  const embed = new EmbedBuilder()
    .setTitle(`🔄 Buddy Rotation: ${rotation.name}`)
    .setColor(isActive ? 0x57f287 : 0xfee75c)
    .addFields(
      { name: '⬅️ Previous', value: fmt(pairs[prevIndex]), inline: false },
      { name: '🎯 Current', value: fmt(currentPair), inline: false },
      { name: '➡️ Next', value: fmt(pairs[nextIndex]), inline: false }
    )
    .setFooter({ text: `Pair ${currentIndex + 1} of ${total} • ${isActive ? 'Active' : 'Paused'}` })
    .setTimestamp();

  return { embed, currentPair };
}

/**
 * Build the Done button row.
 * @param {string} rotationId
 * @param {boolean} disabled
 */
function buildDoneButton(rotationId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`done:${rotationId}`)
      .setLabel('✅ Done')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

/**
 * Publish a new persistent rotation message to the channel.
 */
async function publishRotationMessage(channel, rotation, pairs) {
  const isActive = rotation.is_active;
  const { embed, currentPair } = await buildRotationEmbed(rotation, pairs, isActive);
  const disabled = !isActive || pairs.length === 0;
  const row = buildDoneButton(rotation.id, disabled);

  const mentionText = currentPair
    ? `**Current Pair:** <@${currentPair.user1_id}> <@${currentPair.user2_id}>`
    : '';

  const message = await channel.send({
    content: mentionText,
    embeds: [embed],
    components: [row],
  });

  await setStatusMessageId(rotation.id, message.id);
  return message;
}

/**
 * Edit the existing persistent message with updated rotation state.
 */
async function updateRotationMessage(channel, rotation, pairs) {
  const isActive = rotation.is_active;
  const { embed, currentPair } = await buildRotationEmbed(rotation, pairs, isActive);
  const disabled = !isActive || pairs.length === 0;
  const row = buildDoneButton(rotation.id, disabled);

  const mentionText = currentPair
    ? `**Current Pair:** <@${currentPair.user1_id}> <@${currentPair.user2_id}>`
    : '';

  if (!rotation.status_message_id) {
    // No message yet — publish fresh
    return publishRotationMessage(channel, rotation, pairs);
  }

  try {
    const existing = await channel.messages.fetch(rotation.status_message_id);
    await existing.edit({
      content: mentionText,
      embeds: [embed],
      components: [row],
    });
    return existing;
  } catch {
    // Message was deleted — recreate
    return publishRotationMessage(channel, rotation, pairs);
  }
}

/**
 * Send a temporary "it's your turn!" notification then delete it.
 */
async function sendTurnNotification(channel, pair, deleteAfterMs = 10000) {
  const msg = await channel.send(
    `🎉 It is now your turn!\n<@${pair.user1_id}> <@${pair.user2_id}>`
  );

  if (deleteAfterMs > 0) {
    setTimeout(() => msg.delete().catch(() => {}), deleteAfterMs);
  }
}

module.exports = {
  buildRotationEmbed,
  buildDoneButton,
  publishRotationMessage,
  updateRotationMessage,
  sendTurnNotification,
};