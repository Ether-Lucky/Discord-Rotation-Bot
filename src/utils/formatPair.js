/**
 * Format a pair as a readable mention string.
 * @param {object} pair - { user1_id, user2_id }
 * @returns {string}
 */
function formatPair(pair) {
    return `<@${pair.user1_id}> & <@${pair.user2_id}>`;
  }
  
  /**
   * Format a pair with position number.
   * @param {object} pair
   * @param {number} index
   * @returns {string}
   */
  function formatPairWithIndex(pair, index) {
    return `**${index + 1}.** <@${pair.user1_id}> & <@${pair.user2_id}>`;
  }
  
  module.exports = { formatPair, formatPairWithIndex };