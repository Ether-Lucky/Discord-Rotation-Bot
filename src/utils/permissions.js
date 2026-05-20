const { getGuildSettings } = require('../services/settingsService');

/**
 * Check if a guild member has the manager role or is an admin.
 */
async function isManager(member) {
  if (member.permissions.has('Administrator')) return true;

  const settings = await getGuildSettings(member.guild.id);
  if (!settings) return false;

  return member.roles.cache.has(settings.manager_role_id);
}

/**
 * Throw a friendly error if the user is not a manager.
 */
async function requireManager(interaction) {
  const allowed = await isManager(interaction.member);
  if (!allowed) {
    throw new Error('❌ You need the rotation manager role to use this command.');
  }
}

module.exports = { isManager, requireManager };