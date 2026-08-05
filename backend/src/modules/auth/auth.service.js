import bcrypt from "bcrypt";
import { randomInt, randomUUID } from "node:crypto";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { solapiSmsService } from "../../infrastructure/sms/solapiSms.service.js";
import { createUser, findSignupConflict, findUserById, findUserByLoginId, findUserByPhone, updateUserPassword } from "./auth.repository.js";
import { deleteAllRefreshSessions, deletePhoneCode, deletePhoneVerified, deleteRefreshSession, getPhoneCode, getPhoneCooldown, getPhoneVerified, listRefreshSessions, rotateRefreshSession, savePhoneCode, savePhoneVerified, saveRefreshSession, updatePhoneCode } from "./auth.redis.js";
import { createLoginTokens, verifyRefreshToken } from "./auth.token.js";
import { validateFindLoginId, validateLogin, validateLoginId, validatePhoneSend, validatePhoneStatus, validatePhoneVerify, validateResetPassword, validateSignup } from "./auth.validator.js";

const CONFLICT_MESSAGES = { loginId: "이미 사용 중인 아이디입니다.", nickname: "이미 사용 중인 닉네임입니다.", phone: "이미 가입된 휴대전화 번호입니다.", email: "이미 사용 중인 이메일입니다." };

/** 회원가입 요청의 휴대전화 인증 완료 상태를 확인하고 신규 회원을 생성한다. */
export async function signupUser(body) {
  const data = validateSignup(body);
  const verified = await getPhoneVerified(data.phone, "SIGNUP");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "휴대전화 인증이 만료되었거나 완료되지 않았습니다.");
  const conflictField = await findSignupConflict(data);
  if (conflictField) throw new AppError(409, "CONFLICT", CONFLICT_MESSAGES[conflictField], { field: conflictField });
  const passwordHash = await bcrypt.hash(data.password, env.bcrypt.saltRounds);
  try {
    const user = await createUser({ ...data, passwordHash });
    await deletePhoneVerified(data.phone, "SIGNUP");
    return { userIdx: Number(user.idx), loginId: user.login_id, nickname: user.nickname, role: user.role, profileImageUrl: user.profile_image, requiresLogin: true };
  } catch (error) {
    if (error.code === "23505") throw new AppError(409, "CONFLICT", "이미 사용 중인 회원 정보가 있습니다.");
    throw error;
  }
}

/** 6자리 인증번호를 생성해 Redis에 저장한 뒤 SOLAPI 문자메시지를 발송한다. */
export async function sendPhoneVerification(body) {
  const { phone, purpose, name, loginId } = validatePhoneSend(body);
  const phoneUser = await findUserByPhone(phone);
  if (purpose === "SIGNUP" && phoneUser) throw new AppError(409, "PHONE_ALREADY_REGISTERED", "이미 가입된 휴대전화 번호입니다.", { field: "phone" });
  if (purpose === "CHANGE_PHONE" && phoneUser) throw new AppError(409, "PHONE_ALREADY_REGISTERED", "이미 가입된 휴대전화 번호입니다.", { field: "phone" });
  if ((purpose === "FIND_ID" || purpose === "RESET_PASSWORD") && (!phoneUser || phoneUser.deleted_at)) {
    throw new AppError(404, "ACCOUNT_NOT_FOUND", "전화번호를 확인해주세요.", { field: "phone" });
  }
  if ((purpose === "FIND_ID" || purpose === "RESET_PASSWORD") && phoneUser.name !== name) {
    throw new AppError(404, "ACCOUNT_NOT_FOUND", "이름을 확인해주세요.", { field: "name" });
  }
  if (purpose === "RESET_PASSWORD" && phoneUser.login_id !== loginId) {
    throw new AppError(404, "ACCOUNT_NOT_FOUND", "아이디를 확인해주세요.", { field: "loginId" });
  }
  const retryAfterSeconds = await getPhoneCooldown(phone, purpose);
  if (retryAfterSeconds > 0) throw new AppError(429, "PHONE_SEND_COOLDOWN", `${retryAfterSeconds}초 후 다시 요청해주세요.`, { retryAfterSeconds });
  const code = String(randomInt(100000, 1000000));
  const phoneVerificationId = randomUUID();
  const now = Date.now();
  const payload = { phone, purpose, phoneVerificationId, codeHash: await bcrypt.hash(code, env.bcrypt.saltRounds), attemptCount: 0, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + env.sms.codeTtlSec * 1000).toISOString() };
  await savePhoneCode({ phone, purpose, payload });
  try {
    await solapiSmsService.sendVerificationCode({ to: phone, code });
  } catch (error) {
    await deletePhoneCode(phone, purpose);
    throw error;
  }
  return { phoneVerificationId, expiresInSeconds: env.sms.codeTtlSec, resendAfterSeconds: env.sms.cooldownSec };
}

/** 사용자가 입력한 인증번호를 검증하고 성공하면 인증 완료 상태를 Redis에 저장한다. */
export async function verifyPhoneVerification(body) {
  const { phone, purpose, phoneVerificationId, code } = validatePhoneVerify(body);
  const saved = await getPhoneCode(phone, purpose);
  if (!saved) throw new AppError(410, "PHONE_CODE_EXPIRED", "인증번호가 만료되었습니다. 다시 발송해주세요.");
  if (saved.phoneVerificationId !== phoneVerificationId) throw new AppError(400, "PHONE_VERIFICATION_MISMATCH", "현재 발송된 인증번호를 사용해주세요.");
  const matches = await bcrypt.compare(code, saved.codeHash);
  if (!matches) {
    const attemptCount = saved.attemptCount + 1;
    if (attemptCount >= env.sms.maxAttempts) await deletePhoneCode(phone, purpose);
    else await updatePhoneCode(phone, purpose, { ...saved, attemptCount });
    throw new AppError(400, "PHONE_CODE_INVALID", "인증번호가 일치하지 않습니다.", { remainingAttempts: Math.max(env.sms.maxAttempts - attemptCount, 0) });
  }
  const verifiedAt = new Date();
  await savePhoneVerified({ phone, purpose, payload: { phone, purpose, phoneVerificationId, verifiedAt: verifiedAt.toISOString(), expiresAt: new Date(verifiedAt.getTime() + env.sms.verifiedTtlSec * 1000).toISOString() } });
  await deletePhoneCode(phone, purpose);
  return { verified: true, phoneVerificationId, expiresInSeconds: env.sms.verifiedTtlSec };
}

/** 휴대전화 인증 완료 여부와 만료 시각을 조회한다. */
export async function getPhoneVerificationStatus(query) {
  const { phone, purpose, phoneVerificationId } = validatePhoneStatus(query);
  const saved = await getPhoneVerified(phone, purpose);
  const verified = Boolean(saved && saved.phoneVerificationId === phoneVerificationId);
  return { verified, phoneVerificationId, expiresAt: verified ? saved.expiresAt : null };
}

/** 본인인증 정보와 이름이 일치하면 가입된 아이디를 반환하고 인증 상태를 소비한다. */
export async function findLoginIdByPhone(body) {
  const data = validateFindLoginId(body);
  const verified = await getPhoneVerified(data.phone, "FIND_ID");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "휴대전화 인증이 만료되었거나 완료되지 않았습니다.");
  const user = await findUserByPhone(data.phone);
  if (!user || user.name !== data.name || user.deleted_at) throw new AppError(404, "ACCOUNT_NOT_FOUND", "입력한 정보와 일치하는 계정을 찾을 수 없습니다.");
  await deletePhoneVerified(data.phone, "FIND_ID");
  return { loginId: user.login_id };
}

/** 본인인증과 계정 정보가 일치하면 새 비밀번호 해시를 저장하고 인증 상태를 소비한다. */
export async function resetUserPassword(body) {
  const data = validateResetPassword(body);
  const verified = await getPhoneVerified(data.phone, "RESET_PASSWORD");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "휴대전화 인증이 만료되었거나 완료되지 않았습니다.");
  const user = await findUserByPhone(data.phone);
  if (!user || user.login_id !== data.loginId || user.name !== data.name || user.deleted_at) throw new AppError(404, "ACCOUNT_NOT_FOUND", "입력한 정보와 일치하는 계정을 찾을 수 없습니다.");
  await updateUserPassword(user.idx, await bcrypt.hash(data.password, env.bcrypt.saltRounds));
  await deleteAllRefreshSessions(user.idx);
  await deletePhoneVerified(data.phone, "RESET_PASSWORD");
  return { reset: true };
}

/** 아이디가 회원가입에 사용 가능한지 조회한다. */
export async function checkLoginIdAvailability(rawLoginId) {
  const loginId = validateLoginId(rawLoginId);
  return { loginId, available: !await findUserByLoginId(loginId) };
}

/** 자격 증명과 사용자 상태를 확인하고 Redis 세션 및 JWT를 생성한다. */
export async function loginUser(body, requestMeta) {
  const { loginId, password } = validateLogin(body);
  const user = await findUserByLoginId(loginId);
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !passwordMatches) throw new AppError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
  if (user.banned_at) throw new AppError(403, "BANNED_USER", "이용이 제한된 계정입니다.");
  if (user.deleted_at) throw new AppError(403, "DELETED_USER", "탈퇴한 계정입니다.");
  const tokens = createLoginTokens(user);
  await saveRefreshSession({ userIdx: user.idx, sessionId: tokens.sessionId, refreshJti: tokens.refreshJti, ...requestMeta });
  return { tokens, user: { userIdx: Number(user.idx), loginId: user.login_id, nickname: user.nickname, role: user.role, profileImageUrl: user.profile_image } };
}

/** Refresh Token을 검증하고 같은 기기 세션의 access/refresh 토큰을 모두 교체한다. */
export async function refreshLoginSession(refreshToken, requestMeta = {}) {
  if (!refreshToken) throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요.");
  let tokenSession;
  try { tokenSession = verifyRefreshToken(refreshToken); }
  catch { throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요."); }

  const user = await findUserById(tokenSession.userIdx);
  if (!user) {
    await deleteRefreshSession(tokenSession.userIdx, tokenSession.sessionId);
    throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요.");
  }
  if (user.banned_at) {
    await deleteAllRefreshSessions(user.idx);
    throw new AppError(403, "BANNED_USER", "이용이 제한된 계정입니다.");
  }
  if (user.deleted_at) {
    await deleteAllRefreshSessions(user.idx);
    throw new AppError(403, "DELETED_USER", "탈퇴한 계정입니다.");
  }

  const tokens = createLoginTokens(user, { sessionId: tokenSession.sessionId });
  const rotated = await rotateRefreshSession({
    userIdx: user.idx,
    sessionId: tokenSession.sessionId,
    currentRefreshJti: tokenSession.refreshJti,
    nextRefreshJti: tokens.refreshJti,
    ...requestMeta,
  });
  if (rotated !== 1) throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요.");
  return { tokens, refreshed: true };
}

/** 유효한 Refresh Token이 가리키는 현재 기기 세션만 서버에서 폐기한다. */
export async function logoutCurrentSession(refreshToken) {
  if (!refreshToken) return { loggedOut: true };
  try {
    const tokenSession = verifyRefreshToken(refreshToken);
    await deleteRefreshSession(tokenSession.userIdx, tokenSession.sessionId);
  } catch {
    // 로그아웃은 만료되거나 변조된 쿠키가 있어도 쿠키 삭제 후 성공 처리한다.
  }
  return { loggedOut: true };
}

/** 로그인 사용자의 모든 기기 Refresh 세션을 폐기한다. */
export async function logoutAllSessions(userIdx) {
  const deletedCount = await deleteAllRefreshSessions(userIdx);
  return { loggedOut: true, deletedCount };
}

/** 로그인 사용자의 기기별 Refresh 세션 목록과 현재 기기 여부를 반환한다. */
export async function getLoginSessions(userIdx, currentSessionId) {
  const sessions = await listRefreshSessions(userIdx);
  return sessions.map((session) => ({ ...session, current: session.sessionId === currentSessionId }));
}

/** 로그인 사용자가 지정한 한 기기의 Refresh 세션을 폐기한다. */
export async function logoutSession(userIdx, sessionId) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof sessionId !== "string" || !uuidPattern.test(sessionId)) {
    throw new AppError(400, "VALIDATION_ERROR", "종료할 세션을 선택해주세요.", { field: "sessionId" });
  }
  const deletedCount = await deleteRefreshSession(userIdx, sessionId);
  return { loggedOut: deletedCount > 0, sessionId };
}

/** 인증된 사용자 식별자로 현재 활성 계정 정보를 반환한다. */
export async function getAuthenticatedUser(userIdx) {
  const user = await findUserById(userIdx);
  if (!user) throw new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  if (user.banned_at) throw new AppError(403, "BANNED_USER", "이용이 제한된 계정입니다.");
  if (user.deleted_at) throw new AppError(403, "DELETED_USER", "탈퇴한 계정입니다.");
  return { userIdx: Number(user.idx), loginId: user.login_id, nickname: user.nickname, role: user.role, profileImageUrl: user.profile_image, banned: false };
}
