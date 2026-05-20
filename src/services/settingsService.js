const supabase = require('../database/supabase');

/**
 * Save or update guild settings.
 * @param {string} guildId
 * @param {string} managerRoleId
 * @param {string} displayChannelId
 */
async function saveGuildSettings(guildId, managerRoleId, displayChannelId) {
  const { error } = await supabase
    .from('guild_settings')
    .upsert(
      { guild_id: guildId, manager_role_id: managerRoleId, display_channel_id: displayChannelId },
      { onConflict: 'guild_id' }
    );

  if (error) throw new Error(`saveGuildSettings: ${error.message}`);
}

/**
 * Retrieve guild settings.
 * @param {string} guildId
 * @returns {object|null}
 */
async function getGuildSettings(guildId) {
  const { data, error } = await supabase
    .from('guild_settings')
    .select('*')
    .eq('guild_id', guildId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`getGuildSettings: ${error.message}`);
  return data || null;
}

module.exports = { saveGuildSettings, getGuildSettings };