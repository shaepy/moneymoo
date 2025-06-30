/**
 * Session Management Utilities
 * Provides helper functions for session management and security
 */

/**
 * Check if a session is valid and not expired
 * @param {Object} session - The session object
 * @returns {boolean} - True if session is valid
 */

const isSessionValid = (session) => {
  if (!session || !session.user) {
    return false;
  }

  // Check if session has login time and it's within 24 hours
  if (session.user.loginTime) {
    const loginTime = new Date(session.user.loginTime);
    const now = new Date();
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return false;
    }
  }

  return true;
};

/**
 * Refresh session data (useful for extending session lifetime)
 * @param {Object} req - Express request object
 * @param {Function} callback - Callback function
 */
const refreshSession = (req, callback) => {
  if (req.session && req.session.user) {
    req.session.user.lastActivity = new Date().toISOString();
    req.session.save(callback);
  } else {
    callback(new Error("No valid session to refresh"));
  }
};

/**
 * Get session statistics (for admin purposes)
 * @param {Object} sessionStore - The session store instance
 * @returns {Promise<Object>} - Session statistics
 */
const getSessionStats = async (sessionStore) => {
  try {
    // This would require access to the session store
    // Implementation depends on the specific store being used
    return {
      totalSessions: 0, // Would need to implement based on store
      activeSessions: 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting session stats:", error);
    throw error;
  }
};


module.exports = {
  isSessionValid,
  refreshSession,
  getSessionStats,
};