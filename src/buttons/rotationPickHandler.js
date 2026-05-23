const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRotation, getPairs, addPair, removePairById, advanceRotation, goToPreviousPair,
  resetRotation, setRotationPaused, logCompletion } = require('../services/rotationService');
const { getGuildSettings } = require('../services/settingsService');
const { updateRotationMessage, publishRotationMessage, sendTurnNotification, buildRotationEmbed, buildDoneButton } = require('../services/messageService');
const supabase = require('../database/supabase');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  customId: 'pick',

  async execute(interaction) {
    await interaction.deferUpdate();

    // customId format: pick:<action>:<encodedExtra>
    const parts = interaction.customId.split(':');
    const action = parts[1];
    const extra = JSON.parse(decodeURIComponent(parts.slice(2).join(':')));
    const rotationId = interaction.values[0];

    const rotation = await getRotation(rotationId);
    const settings = await getGuildSettings(interaction.guildId);

    const getChannel = async () => {
      if (!settings) return null;
      return interaction.guild.channels.fetch(settings.display_channel_id).catch(() => null);
    };

    const refreshAndUpdate = async () => {
      const updated = await getRotation(rotationId);
      const pairs = await getPairs(rotationId);
      const channel = await getChannel();
      if (channel) await updateRotationMessage(channel, updated, pairs);
      return { updated, pairs };
    };

    switch (action) {

      case 'addpair': {
        const pair = await addPair(rotationId, extra.u1, extra.u2);
        await refreshAndUpdate();
        await interaction.editReply({
          content: `✅ Added pair at position **${pair.position + 1}** in **${rotation.name}**:\n<@${extra.u1}> & <@${extra.u2}>`,
          components: [],
        });
        break;
      }

      case 'addsolo': {
        const { data: existingPairs } = await supabase
          .from('buddy_pairs').select('position').eq('rotation_id', rotationId)
          .order('position', { ascending: false }).limit(1);
        const nextPosition = existingPairs?.length > 0 ? existingPairs[0].position + 1 : 0;
        const { data: existing } = await supabase.from('buddy_pairs').select('id')
          .eq('rotation_id', rotationId).or(`user1_id.eq.${extra.uid},user2_id.eq.${extra.uid}`);
        if (existing?.length > 0) {
          return interaction.editReply({ content: `⚠️ <@${extra.uid}> is already in **${rotation.name}**.`, components: [] });
        }
        await supabase.from('buddy_pairs').insert({ id: uuidv4(), rotation_id: rotationId, user1_id: extra.uid, user2_id: null, position: nextPosition });
        await refreshAndUpdate();
        await interaction.editReply({ content: `✅ Added <@${extra.uid}> as solo at position **${nextPosition + 1}** in **${rotation.name}**.`, components: [] });
        break;
      }

      case 'removepair': {
        const pairs = await getPairs(rotationId);
        if (!pairs.length) return interaction.editReply({ content: '⚠️ No entries to remove.', components: [] });

        const userIds = [...new Set(pairs.flatMap(p => p.user2_id ? [p.user1_id, p.user2_id] : [p.user1_id]))];
        const memberMap = new Map();
        try { const f = await interaction.guild.members.fetch({ user: userIds }); f.forEach(m => memberMap.set(m.id, m.displayName)); } catch {}
        const getName = id => memberMap.get(id) || id;

        const options = pairs.map((pair, i) => ({
          label: (pair.user2_id ? `${i + 1}. ${getName(pair.user1_id)} & ${getName(pair.user2_id)}` : `${i + 1}. ${getName(pair.user1_id)} (solo)`).slice(0, 100),
          description: pair.user2_id ? 'Pair entry' : 'Solo entry',
          value: pair.id,
        }));

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`removepair:${rotationId}`)
            .setPlaceholder('Select an entry to remove...').addOptions(options)
        );
        await interaction.editReply({ content: `🗑️ Select an entry to remove from **${rotation.name}**:`, components: [row] });
        break;
      }

      case 'listpairs': {
        const pairs = await getPairs(rotationId);
        if (!pairs.length) return interaction.editReply({ content: `**${rotation.name}** has no entries yet.`, components: [] });
        const currentIndex = rotation.current_index % pairs.length;
        const lines = pairs.map((p, i) => {
          const entry = p.user2_id ? `**${i + 1}.** <@${p.user1_id}> & <@${p.user2_id}>` : `**${i + 1}.** <@${p.user1_id}> *(solo)*`;
          return entry + (i === currentIndex ? ' 🎯' : '');
        });
        await interaction.editReply({ content: `**🔄 ${rotation.name} — Entries:**\n\n${lines.join('\n')}\n\n*🎯 = current*`, components: [] });
        break;
      }

      case 'publish': {
        if (!settings) return interaction.editReply({ content: '⚠️ Run `/setup` first.', components: [] });
        const pairs = await getPairs(rotationId);
        if (!pairs.length) return interaction.editReply({ content: '⚠️ Add at least one entry before publishing.', components: [] });
        const channel = await getChannel();
        if (!channel) return interaction.editReply({ content: '⚠️ Display channel not found.', components: [] });
        await publishRotationMessage(channel, rotation, pairs);
        await interaction.editReply({ content: `✅ **${rotation.name}** published in ${channel}!`, components: [] });
        break;
      }

      case 'show': {
        const pairs = await getPairs(rotationId);
        const { embed, currentPair } = await buildRotationEmbed(rotation, pairs, rotation.is_active);
        const disabled = !rotation.is_active || !pairs.length;
        const row = buildDoneButton(rotationId, disabled);
        const mentionText = currentPair ? (currentPair.user2_id ? `**Current Pair:** <@${currentPair.user1_id}> <@${currentPair.user2_id}>` : `**Current:** <@${currentPair.user1_id}>`) : '';
        await interaction.editReply({ content: mentionText, embeds: [embed], components: [row] });
        break;
      }

      case 'next': {
        const pairs = await getPairs(rotationId);
        if (!pairs.length) return interaction.editReply({ content: '⚠️ No entries.', components: [] });
        await advanceRotation(rotationId);
        const { updated, pairs: updatedPairs } = await refreshAndUpdate();
        const current = updatedPairs[updated.current_index % updatedPairs.length];
        const channel = await getChannel();
        if (channel) await sendTurnNotification(channel, current);
        const mention = current.user2_id ? `<@${current.user1_id}> & <@${current.user2_id}>` : `<@${current.user1_id}>`;
        await interaction.editReply({ content: `✅ **${rotation.name}** advanced. Current: ${mention}`, components: [] });
        break;
      }

      case 'previous': {
        await goToPreviousPair(rotationId);
        const { updated, pairs: updatedPairs } = await refreshAndUpdate();
        const current = updatedPairs[updated.current_index % updatedPairs.length];
        const mention = current.user2_id ? `<@${current.user1_id}> & <@${current.user2_id}>` : `<@${current.user1_id}>`;
        await interaction.editReply({ content: `✅ **${rotation.name}** went back. Current: ${mention}`, components: [] });
        break;
      }

      case 'reset': {
        await resetRotation(rotationId);
        await refreshAndUpdate();
        await interaction.editReply({ content: `✅ **${rotation.name}** reset to the first entry.`, components: [] });
        break;
      }

      case 'force': {
        const pairs = await getPairs(rotationId);
        if (pairs.length <= 1) return interaction.editReply({ content: '⚠️ Need at least 2 entries to force advance.', components: [] });
        const prev = pairs[rotation.current_index % pairs.length];
        await advanceRotation(rotationId);
        const { updated, pairs: updatedPairs } = await refreshAndUpdate();
        const current = updatedPairs[updated.current_index % updatedPairs.length];
        const channel = await getChannel();
        if (channel) await sendTurnNotification(channel, current);
        const prevMention = prev.user2_id ? `<@${prev.user1_id}> & <@${prev.user2_id}>` : `<@${prev.user1_id}>`;
        const nextMention = current.user2_id ? `<@${current.user1_id}> & <@${current.user2_id}>` : `<@${current.user1_id}>`;
        await interaction.editReply({ content: `⏩ **${rotation.name}** force-advanced.\n**Skipped:** ${prevMention}\n**Now current:** ${nextMention}`, components: [] });
        break;
      }

      case 'pause': {
        await setRotationPaused(rotationId, true);
        await refreshAndUpdate();
        await interaction.editReply({ content: `⏸️ **${rotation.name}** paused.`, components: [] });
        break;
      }

      case 'resume': {
        await setRotationPaused(rotationId, false);
        await refreshAndUpdate();
        await interaction.editReply({ content: `▶️ **${rotation.name}** resumed.`, components: [] });
        break;
      }

      case 'rename': {
        const oldName = rotation.name;
        await supabase.from('rotations').update({ name: extra.name }).eq('id', rotationId);
        await refreshAndUpdate();
        await interaction.editReply({ content: `✅ Renamed **${oldName}** → **${extra.name}**.`, components: [] });
        break;
      }

      case 'delete': {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confirmdelete:${rotationId}`).setLabel('🗑️ Yes, delete it').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('canceldelete').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({
          content: `⚠️ Are you sure you want to delete **${rotation.name}**? This cannot be undone.`,
          components: [confirmRow],
        });
        break;
      }

      default:
        await interaction.editReply({ content: '❌ Unknown action.', components: [] });
    }
  },
};