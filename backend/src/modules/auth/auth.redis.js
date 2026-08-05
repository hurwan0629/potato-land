import { env } from "../../config/env.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { redisKey } from "../../infrastructure/redis/redisKey.js";

/** 인증 완료 상태 저장용 Redis 키를 만든다. */
function phoneVerifiedKey(phone, purpose) {
  return `phone:verified:${phone}:${purpose}`;
}

/** 로그인 refresh session을 Redis에 7일 TTL로 저장한다. */
export async function saveRefreshSession({ userIdx, sid, jti, userAgent, ip }) {
  const now = new Date().toISOString();

  await getRedisClient()
      .set(
        redisKey.session(userIdx, sid),
        JSON.stringify({ 
          currentRefreshJti: jti, 
          userAgent, 
          ip, 
          createdAt: now, 
          rotatedAt: now 
        }),
        { EX: env.jwt.refreshToken.expiresInSec },
      );
}

/** 인증번호 정보와 재발송 제한을 각각 정해진 TTL로 저장한다. */
export async function savePhoneCode({ phone, purpose, payload }) {
  await getRedisClient().multi() 
    .set(
      redisKey.phoneCode(phone, purpose), 
      JSON.stringify(payload), 
      { EX: env.sms.codeTtlSec }
    )
    .set(
      redisKey.phoneCooldown(phone, purpose), 
      "1", 
      { EX: env.sms.cooldownSec }
    )
    .exec();
}

/** 현재 유효한 인증번호 정보를 조회한다. */
export async function getPhoneCode(phone, purpose) {

  const value = await getRedisClient().get(redisKey.phoneCode(phone, purpose));
  return value ? JSON.parse(value) : null;
  
}

/** 실패 횟수가 갱신된 인증번호 정보를 남은 TTL을 유지하며 저장한다. */
export async function updatePhoneCode(phone, purpose, payload) {
  const key = redisKey.phoneCode(phone, purpose);
  const ttl = await getRedisClient().ttl(key);
  if (ttl > 0) await getRedisClient().set(key, JSON.stringify(payload), { EX: ttl });
}

/** 인증번호와 재발송 제한 데이터를 제거한다. */
export async function deletePhoneCode(phone, purpose) {
  await getRedisClient().del(redisKey.phoneCode(phone, purpose), redisKey.phoneCooldown(phone, purpose));
}

/** 같은 휴대전화 번호로 인증번호를 다시 보낼 수 있는지 확인한다. */
export async function getPhoneCooldown(phone, purpose) {
  return Math.max(await getRedisClient().ttl(redisKey.phoneCooldown(phone, purpose)), 0);
}

/** 인증이 완료된 휴대전화 정보를 가입 처리 때까지 임시 저장한다. */
export async function savePhoneVerified({ phone, purpose, payload }) {
  
  await getRedisClient().set(
    redisKey.phoneVerified(phone, purpose), 
    JSON.stringify(payload), 
    { EX: env.sms.verifiedTtlSec }
  );
}

/** 휴대전화 인증 완료 정보를 조회한다. */
export async function getPhoneVerified(phone, purpose) {
  
  const value = await getRedisClient().get(redisKey.phoneVerified(phone, purpose));

  return value 
        ? JSON.parse(value) 
        : null;
}

/** 회원가입에 사용된 휴대전화 인증 완료 정보를 삭제한다. */
export async function deletePhoneVerified(phone, purpose) {
  await getRedisClient()
          .del(redisKey.phoneVerified(phone, purpose));
}
