/** 휴대전화 인증번호와 인증 완료 상태에 적용할 서버 정책이다. */
export const PHONE_VERIFICATION_POLICY = Object.freeze({
  codeTtlSec: 180,
  cooldownSec: 30,
  verifiedTtlSec: 600,
  maxAttempts: 5,
});
