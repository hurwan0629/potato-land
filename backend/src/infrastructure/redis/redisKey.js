function normalizePhone(phone) {
  return String(phone).replace(/\D/g, "");
}

function normalizePurpose(purpose) {
  return String(purpose).trim().toUpperCase();
}

export const redisKey = Object.freeze({
  session(userIdx, sessionId) {
    return `session:${userIdx}:${sessionId}`;
  },

  phoneCode(phone, purpose) {
    return `phone:code:${normalizePhone(phone)}:${normalizePurpose(purpose)}`;
  },

  phoneVerified(phone, purpose) {
    return `phone:verified:${normalizePhone(phone)}:${normalizePurpose(purpose)}`;
  },

  phoneCooldown(phone, purpose) {
    return `phone:cooldown:${normalizePhone(phone)}:${normalizePurpose(purpose)}`;
  },

  auctionState(listingIdx) {
    return `auction:state:${listingIdx}`;
  },
});
