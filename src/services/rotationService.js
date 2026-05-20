const supabase = require('../database/supabase');
const { v4: uuidv4 } = require('uuid');

// ─── Rotation CRUD ────────────────────────────────────────────────────────────

async function createRotation(guildId, name) {
  const { data, error } = await supabase
    .from('rotations')
    .insert({
      id: uuidv4(),
      guild_id: guildId,
      name,
      current_index: 0,
      status_message_id: null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`createRotation: ${error.message}`);
  return data;
}

async function getRotation(rotationId) {
  const { data, error } = await supabase
    .from('rotations')
    .select('*')
    .eq('id', rotationId)
    .single();

  if (error) throw new Error(`getRotation: ${error.message}`);
  return data;
}

async function getActiveRotation(guildId) {
  const { data, error } = await supabase
    .from('rotations')
    .select('*')
    .eq('guild_id', guildId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`getActiveRotation: ${error.message}`);
  return data || null;
}

async function updateRotationIndex(rotationId, newIndex) {
  const { error } = await supabase
    .from('rotations')
    .update({ current_index: newIndex })
    .eq('id', rotationId);

  if (error) throw new Error(`updateRotationIndex: ${error.message}`);
}

async function setStatusMessageId(rotationId, messageId) {
  const { error } = await supabase
    .from('rotations')
    .update({ status_message_id: messageId })
    .eq('id', rotationId);

  if (error) throw new Error(`setStatusMessageId: ${error.message}`);
}

async function setRotationPaused(rotationId, paused) {
  const { error } = await supabase
    .from('rotations')
    .update({ is_active: !paused })
    .eq('id', rotationId);

  if (error) throw new Error(`setRotationPaused: ${error.message}`);
}

// ─── Buddy Pairs ──────────────────────────────────────────────────────────────

async function addPair(rotationId, user1Id, user2Id) {
  if (user1Id === user2Id) throw new Error('A user cannot be paired with themselves.');

  // Get current max position
  const { data: pairs } = await supabase
    .from('buddy_pairs')
    .select('position')
    .eq('rotation_id', rotationId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = pairs && pairs.length > 0 ? pairs[0].position + 1 : 0;

  // Check for duplicate pair
  const { data: existing } = await supabase
    .from('buddy_pairs')
    .select('id')
    .eq('rotation_id', rotationId)
    .or(
      `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
    );

  if (existing && existing.length > 0) throw new Error('This pair already exists in the rotation.');

  const { data, error } = await supabase
    .from('buddy_pairs')
    .insert({
      id: uuidv4(),
      rotation_id: rotationId,
      user1_id: user1Id,
      user2_id: user2Id,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) throw new Error(`addPair: ${error.message}`);
  return data;
}

/**
 * Remove a pair by its UUID, then renumber remaining pairs starting from 0.
 * Also adjusts current_index if the removed pair was at or before it.
 */
async function removePairById(rotationId, pairId) {
  // Get all pairs in order before deletion
  const pairs = await getPairs(rotationId);
  const removedIndex = pairs.findIndex(p => p.id === pairId);
  if (removedIndex === -1) throw new Error('Pair not found.');

  // Delete the pair
  const { error: deleteError } = await supabase
    .from('buddy_pairs')
    .delete()
    .eq('id', pairId);

  if (deleteError) throw new Error(`removePairById: ${deleteError.message}`);

  // Get remaining pairs and renumber positions sequentially from 0
  const remaining = pairs.filter(p => p.id !== pairId);
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      const { error: updateError } = await supabase
        .from('buddy_pairs')
        .update({ position: i })
        .eq('id', remaining[i].id);

      if (updateError) throw new Error(`renumber position ${i}: ${updateError.message}`);
    }
  }

  // Adjust current_index if needed so it doesn't point out of bounds
  // or skip past the current pair unintentionally
  if (remaining.length > 0) {
    const rotation = await getRotation(rotationId);
    let newIndex = rotation.current_index;

    if (removedIndex < rotation.current_index) {
      // Removed pair was before current — shift index back by 1
      newIndex = rotation.current_index - 1;
    } else if (rotation.current_index >= remaining.length) {
      // Current index is now out of bounds — wrap to last pair
      newIndex = remaining.length - 1;
    }

    if (newIndex !== rotation.current_index) {
      await updateRotationIndex(rotationId, newIndex);
    }
  } else {
    // No pairs left — reset index to 0
    await updateRotationIndex(rotationId, 0);
  }
}

async function getPairs(rotationId) {
  const { data, error } = await supabase
    .from('buddy_pairs')
    .select('*')
    .eq('rotation_id', rotationId)
    .order('position', { ascending: true });

  if (error) throw new Error(`getPairs: ${error.message}`);
  return data || [];
}

async function getCurrentPair(rotationId) {
  const rotation = await getRotation(rotationId);
  const pairs = await getPairs(rotationId);
  if (!pairs.length) return null;
  return pairs[rotation.current_index % pairs.length];
}

// ─── Advance / Reset ──────────────────────────────────────────────────────────

async function advanceRotation(rotationId) {
  const rotation = await getRotation(rotationId);
  const pairs = await getPairs(rotationId);
  if (!pairs.length) throw new Error('No pairs in this rotation.');

  const newIndex = (rotation.current_index + 1) % pairs.length;
  await updateRotationIndex(rotationId, newIndex);

  // Log completion
  await supabase.from('completion_logs').insert({
    id: uuidv4(),
    rotation_id: rotationId,
    pair_position: rotation.current_index,
    completed_at: new Date().toISOString(),
  });

  return newIndex;
}

async function goToPreviousPair(rotationId) {
  const rotation = await getRotation(rotationId);
  const pairs = await getPairs(rotationId);
  if (!pairs.length) throw new Error('No pairs in this rotation.');

  const newIndex = (rotation.current_index - 1 + pairs.length) % pairs.length;
  await updateRotationIndex(rotationId, newIndex);
  return newIndex;
}

async function resetRotation(rotationId) {
  await updateRotationIndex(rotationId, 0);
}

// ─── Completion Log ───────────────────────────────────────────────────────────

async function logCompletion(rotationId, pairPosition, completedBy) {
  const { error } = await supabase.from('completion_logs').insert({
    id: uuidv4(),
    rotation_id: rotationId,
    pair_position: pairPosition,
    completed_by: completedBy,
    completed_at: new Date().toISOString(),
  });

  if (error) throw new Error(`logCompletion: ${error.message}`);
}

module.exports = {
  createRotation,
  getRotation,
  getActiveRotation,
  setStatusMessageId,
  setRotationPaused,
  addPair,
  removePairById,
  getPairs,
  getCurrentPair,
  advanceRotation,
  goToPreviousPair,
  resetRotation,
  logCompletion,
};