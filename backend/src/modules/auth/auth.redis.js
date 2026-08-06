import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { env } from "../../config/env.js";
import { PHONE_VERIFICATION_POLICY } from "./auth.constants.js";

/** 서버 시작 후 연결이 완료된 공용 Redis 클라이언트를 반환한다. */
function redis() {
  return getRedisClient();
}

/** 사용자와 브라우저 세션 조합으로 Redis refresh session key를 만든다. */
function sessionKey(userIdx, sessionId) {
  return `session:${userIdx}:${sessionId}`;
}

/** 사용자의 모든 기기 세션을 찾기 위한 Redis 검색 패턴을 만든다. */
function userSessionPattern(userIdx) {
  return `session:${userIdx}:*`;
}

/** 휴대전화 인증번호 저장용 Redis 키를 만든다. */
function phoneCodeKey(phone, purpose) {
  return `phone:code:${phone}:${purpose}`;
}

/** 인증번호 재발송 대기시간 저장용 Redis 키를 만든다. */
function phoneCooldownKey(phone, purpose) {
  return `phone:cooldown:${phone}:${purpose}`;
}

/** 인증 완료 상태 저장용 Redis 키를 만든다. */
function phoneVerifiedKey(phone, purpose) {
  return `phone:verified:${phone}:${purpose}`;
}

/** 로그인 refresh session을 Redis에 7일 TTL로 저장한다. */
export async function saveRefreshSession({ userIdx, sessionId, refreshJti, userAgent, ip }) {
  // 로그인 시각을 생성 시각과 마지막 rotation 시각의 초기값으로 사용한다.
  const now = new Date().toISOString();

  // 세션별 key를 사용하므로 같은 사용자가 여러 기기에서 독립적으로 로그인할 수 있다.
  await redis().set(
    sessionKey(userIdx, sessionId),
    JSON.stringify({ currentRefreshJti: refreshJti, userAgent, ip, createdAt: now, rotatedAt: now }),
    { EX: env.jwt.refreshToken.expiresInSec },
  );
}

/** Refresh Token의 jti가 현재 값과 같을 때만 새 jti로 원자 교체한다. */
export async function rotateRefreshSession({ userIdx, sessionId, currentRefreshJti, nextRefreshJti, userAgent, ip }) {
  const key = sessionKey(userIdx, sessionId);
  const now = new Date().toISOString();

  // 조회와 비교, 갱신 사이에 다른 요청이 끼어들지 않도록 Lua에서 한 번에 처리한다.
  const result = await redis().eval(
    `local value = redis.call('GET', KEYS[1])
     if not value then return 0 end
     local session = cjson.decode(value)
     -- 이전 토큰 재사용이 감지되면 새로 교체된 세션까지 폐기한다.
     if session.currentRefreshJti ~= ARGV[1] then
       redis.call('DEL', KEYS[1])
       return -1
     end
     session.currentRefreshJti = ARGV[2]
     session.rotatedAt = ARGV[3]
     session.userAgent = ARGV[4]
     session.ip = ARGV[5]
     -- rotation 성공 시 Refresh Token 만료 시간을 기준으로 TTL도 다시 설정한다.
     redis.call('SET', KEYS[1], cjson.encode(session), 'EX', ARGV[6])
     return 1`,
    {
      keys: [key],
      arguments: [currentRefreshJti, nextRefreshJti, now, userAgent ?? "", ip ?? "", String(env.jwt.refreshToken.expiresInSec)],
    },
  );
  return Number(result);
}

/** 현재 기기의 Refresh 세션 하나를 삭제한다. */
export async function deleteRefreshSession(userIdx, sessionId) {
  return redis().del(sessionKey(userIdx, sessionId));
}

/** 사용자의 기기별 Refresh 세션 목록을 민감한 jti를 제외하고 반환한다. */
export async function listRefreshSessions(userIdx) {
  const sessions = [];

  // KEYS 명령은 Redis를 막을 수 있으므로 SCAN iterator로 조금씩 조회한다.
  for await (const keys of redis().scanIterator({ MATCH: userSessionPattern(userIdx), COUNT: 100 })) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length === 0) continue;
    // 같은 SCAN 묶음은 MGET으로 읽어 네트워크 왕복 횟수를 줄인다.
    const values = await redis().mGet(keyList);
    keyList.forEach((key, index) => {
      // SCAN 직후 TTL이 끝난 세션은 목록에서 제외한다.
      if (!values[index]) return;
      const value = JSON.parse(values[index]);

      // jti는 인증 정보이므로 응답용 목록에 포함하지 않는다.
      sessions.push({
        sessionId: key.slice(key.lastIndexOf(":") + 1),
        userAgent: value.userAgent ?? "",
        ip: value.ip ?? "",
        createdAt: value.createdAt,
        rotatedAt: value.rotatedAt,
      });
    });
  }
  return sessions.sort((a, b) => String(b.rotatedAt).localeCompare(String(a.rotatedAt)));
}

/** 사용자의 모든 기기 Refresh 세션을 찾아 한 번에 삭제한다. */
export async function deleteAllRefreshSessions(userIdx) {
  let deletedCount = 0;

  // 사용자 key 패턴만 순회해 다른 계정의 기기 세션은 유지한다.
  for await (const keys of redis().scanIterator({ MATCH: userSessionPattern(userIdx), COUNT: 100 })) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length > 0) deletedCount += await redis().del(keyList);
  }
  return deletedCount;
}

/** 인증번호 정보와 재발송 제한을 각각 정해진 TTL로 저장한다. */
export async function savePhoneCode({ phone, purpose, payload }) {
  // 인증번호와 재발송 제한을 한 transaction으로 저장해 두 key의 생성 시점을 맞춘다.
  await redis().multi()
    .set(phoneCodeKey(phone, purpose), JSON.stringify(payload), { EX: PHONE_VERIFICATION_POLICY.codeTtlSec })
    .set(phoneCooldownKey(phone, purpose), "1", { EX: PHONE_VERIFICATION_POLICY.cooldownSec })
    .exec();
}

/** 현재 유효한 인증번호 정보를 조회한다. */
export async function getPhoneCode(phone, purpose) {
  const value = await redis().get(phoneCodeKey(phone, purpose));
  return value ? JSON.parse(value) : null;
}

/** 실패 횟수가 갱신된 인증번호 정보를 남은 TTL을 유지하며 저장한다. */
export async function updatePhoneCode(phone, purpose, payload) {
  const key = phoneCodeKey(phone, purpose);

  // 인증 실패 횟수를 갱신해도 최초 발급 시점의 만료 시간은 연장하지 않는다.
  const ttl = await redis().ttl(key);
  if (ttl > 0) await redis().set(key, JSON.stringify(payload), { EX: ttl });
}

/** 인증번호와 재발송 제한 데이터를 제거한다. */
export async function deletePhoneCode(phone, purpose) {
  await redis().del(phoneCodeKey(phone, purpose), phoneCooldownKey(phone, purpose));
}

/** 같은 휴대전화 번호로 인증번호를 다시 보낼 수 있는지 확인한다. */
export async function getPhoneCooldown(phone, purpose) {
  return Math.max(await redis().ttl(phoneCooldownKey(phone, purpose)), 0);
}

/** 인증이 완료된 휴대전화 정보를 가입 처리 때까지 임시 저장한다. */
export async function savePhoneVerified({ phone, purpose, payload }) {
  // 인증 목적을 key에 포함해 가입 인증을 비밀번호 재설정 등에 재사용할 수 없게 한다.
  await redis().set(phoneVerifiedKey(phone, purpose), JSON.stringify(payload), { EX: PHONE_VERIFICATION_POLICY.verifiedTtlSec });
}

/** 휴대전화 인증 완료 정보를 조회한다. */
export async function getPhoneVerified(phone, purpose) {
  const value = await redis().get(phoneVerifiedKey(phone, purpose));
  return value ? JSON.parse(value) : null;
}

/** 회원가입에 사용된 휴대전화 인증 완료 정보를 삭제한다. */
export async function deletePhoneVerified(phone, purpose) {
  await redis().del(phoneVerifiedKey(phone, purpose));
}
