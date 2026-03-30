const SESSION_TOKEN_STORAGE_KEY = "wechat-mini-shop:session-token";
const SESSION_EXPIRES_AT_STORAGE_KEY = "wechat-mini-shop:session-expires-at";

function safeGetStorageSync(key) {
  try {
    return wx.getStorageSync(key);
  } catch (error) {
    return "";
  }
}

function safeSetStorageSync(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    return null;
  }

  return null;
}

function safeRemoveStorageSync(key) {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    return null;
  }

  return null;
}

function getSessionToken() {
  return String(safeGetStorageSync(SESSION_TOKEN_STORAGE_KEY) || "").trim();
}

function getSession() {
  return {
    sessionToken: getSessionToken(),
    expiresAt: String(safeGetStorageSync(SESSION_EXPIRES_AT_STORAGE_KEY) || "").trim()
  };
}

function setSession(payload = {}) {
  const sessionToken = String(payload.sessionToken || "").trim();
  const expiresAt = String(payload.expiresAt || "").trim();

  if (!sessionToken) {
    clearSession();
    return;
  }

  safeSetStorageSync(SESSION_TOKEN_STORAGE_KEY, sessionToken);

  if (expiresAt) {
    safeSetStorageSync(SESSION_EXPIRES_AT_STORAGE_KEY, expiresAt);
    return;
  }

  safeRemoveStorageSync(SESSION_EXPIRES_AT_STORAGE_KEY);
}

function clearSession() {
  safeRemoveStorageSync(SESSION_TOKEN_STORAGE_KEY);
  safeRemoveStorageSync(SESSION_EXPIRES_AT_STORAGE_KEY);
}

module.exports = {
  getSessionToken,
  getSession,
  setSession,
  clearSession
};
