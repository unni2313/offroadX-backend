const User = require('../models/User');

/**
 * Utility functions for account security management
 */

/**
 * Manually unblock a user account (admin function)
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Result object with success status and message
 */
const unblockUser = async (email) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    if (!user.isBlocked) {
      return { success: false, message: 'User is not blocked' };
    }
    
    user.isBlocked = false;
    user.blockExpiry = null;
    user.failedLoginAttempts = 0;
    await user.save();
    
    return { success: true, message: 'User account has been unblocked successfully' };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'Server error while unblocking user' };
  }
};

/**
 * Get user's current block status
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - User's block status information
 */
const getUserBlockStatus = async (email) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    return {
      success: true,
      data: {
        isBlocked: user.isBlocked,
        failedLoginAttempts: user.failedLoginAttempts || 0,
        blockExpiry: user.blockExpiry,
        remainingTime: user.blockExpiry && user.isBlocked ? 
          Math.max(0, Math.ceil((user.blockExpiry - new Date()) / (1000 * 60))) : 0 // minutes
      }
    };
  } catch (error) {
    console.error('Error getting user block status:', error);
    return { success: false, message: 'Server error while getting block status' };
  }
};

/**
 * Reset failed login attempts for a user
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Result object with success status and message
 */
const resetFailedAttempts = async (email) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    user.failedLoginAttempts = 0;
    await user.save();
    
    return { success: true, message: 'Failed login attempts have been reset' };
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
    return { success: false, message: 'Server error while resetting failed attempts' };
  }
};

module.exports = {
  unblockUser,
  getUserBlockStatus,
  resetFailedAttempts
};