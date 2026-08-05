function normalizePhone(phone) {
  return String(phone).replace(/\D/g, "");
}

function normalizePurpose(purpose) {
  return String(purpose).trim().toUpperCase();
}

/**
 * redis에는 다음과 같은 이름의 키만 들어가게 됩니다.
 * 
 * - session(userIdx, sessionId) -> session:{userIdx}:{sessionId} - { currentRefreshJti, userAgent, ip, createdAt, rotatedAt }
 * 
 * - phoneCode(phone, purpose) -> phone:code:{phone}:{purpose} - { phone, purpose, phoneVerificationId, codeHash, attemptCount, createdAt, expiresAt }
 * 
 * - phoneCooldown(phone, purpose) -> phone:cooldown:{phone}:{purpose} - { phone, purpose, resendAfterSeconds }
 * 
 * - phoneVerified(phone, purpose) -> phone:verified:{phone}:{purpose} - { phone, purpose, phoneVerifiedId, verified, verifiedAt }
 * 
 * - auctionState(listingIdx) -> auction:state:{listingIdx} - redis hash: { currentPrice, highestBidderIdx, highestBidIdx }
 * 
 * -
 */
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
