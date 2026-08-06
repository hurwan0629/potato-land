import bcrypt from "bcrypt";
import { randomInt, randomUUID } from "node:crypto";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { PHONE_VERIFICATION_POLICY } from "./auth.constants.js";
import {
  createUser,
  findSignupConflict,
  findUserById,
  findUserByLoginId,
  findUserByPhone,
  updateUserPassword,
} from "./auth.repository.js";
import {
  deleteAllRefreshSessions,
  deletePhoneCode,
  deletePhoneVerified,
  deleteRefreshSession,
  getPhoneCode,
  getPhoneCooldown,
  getPhoneVerified,
  listRefreshSessions,
  rotateRefreshSession,
  savePhoneCode,
  savePhoneVerified,
  saveRefreshSession,
  updatePhoneCode,
} from "./auth.redis.js";
import { createLoginTokens, verifyRefreshToken } from "./auth.token.js";
import {
  validateFindLoginId,
  validateLogin,
  validateLoginId,
  validatePhoneSend,
  validatePhoneStatus,
  validatePhoneVerify,
  validateResetPassword,
  validateSignup,
} from "./auth.validator.js";
import { sendVerificationCode } from "../../infrastructure/sms/sms.interface.js";

const CONFLICT_MESSAGES = {
  loginId: "이미 사용 중인 아이디입니다.",
  nickname: "이미 사용 중인 닉네임입니다.",
  phone: "이미 가입된 휴대전화 번호입니다.",
  email: "이미 사용 중인 이메일입니다.",
};

/** 회원가입 요청의 휴대전화 인증 완료 상태를 확인하고 신규 회원을 생성한다. */
export async function signupUser(body) {
  // 1. 클라이언트 입력 형식을 검증하고 전화번호를 정규화한다.
  const data = validateSignup(body);

  // 2. SMS 인증이 완료됐으며 현재 요청의 인증 식별자와 같은지 확인한다.
  const verified = await getPhoneVerified(data.phone, "SIGNUP");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "휴대전화 인증이 만료되었거나 완료되지 않았습니다.");

  // 3. 아이디·닉네임·전화번호·이메일의 중복을 사용자 생성 전에 확인한다.
  const conflictField = await findSignupConflict(data);
  if (conflictField) throw new AppError(409, "CONFLICT", CONFLICT_MESSAGES[conflictField], { field: conflictField });

  // 4. 원문 비밀번호는 저장하지 않고 bcrypt 해시만 사용자 레코드에 전달한다.
  const passwordHash = await bcrypt.hash(data.password, env.bcrypt.saltRounds);
  try {
    const user = await createUser({ ...data, passwordHash });

    // 5. 한 번 사용한 가입 인증 상태를 삭제해 재사용을 방지한다.
    await deletePhoneVerified(data.phone, "SIGNUP");
    return {
      userIdx: Number(user.idx),
      loginId: user.login_id,
      nickname: user.nickname,
      role: user.role,
      profileImageUrl: user.profile_image,
      requiresLogin: true,
    };
  } catch (error) {
    // 동시 가입 요청으로 사전 중복 검사 이후 충돌해도 동일한 API 오류로 변환한다.
    if (error.code === "23505") throw new AppError(409, "CONFLICT", "이미 사용 중인 회원 정보가 있습니다.");
    throw error;
  }
}

/** 6자리 인증번호를 생성해 Redis에 저장한 뒤 SOLAPI 문자메시지를 발송한다. */
export async function sendPhoneVerification(body) {
  // 1. 전화번호·인증 목적과 계정 확인용 입력을 정규화한다.
  const { phone, purpose, name, loginId } = validatePhoneSend(body);

  // 2. 문자 발송 전에 계정 정보를 확인해 불필요한 SOLAPI 비용을 막는다.
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

  // 3. Redis 재발송 제한 키가 남아 있으면 남은 대기 시간을 반환한다.
  const retryAfterSeconds = await getPhoneCooldown(phone, purpose);
  if (retryAfterSeconds > 0) throw new AppError(429, "PHONE_SEND_COOLDOWN", `${retryAfterSeconds}초 후 다시 요청해주세요.`, { retryAfterSeconds });

  // 4. 인증번호 원문 대신 bcrypt 해시와 요청 식별자만 Redis에 저장한다.
  const code = String(randomInt(100000, 1000000));
  const phoneVerificationId = randomUUID();
  const now = Date.now();
  const payload = {
    phone,
    purpose,
    phoneVerificationId,
    codeHash: await bcrypt.hash(code, env.bcrypt.saltRounds),
    attemptCount: 0,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PHONE_VERIFICATION_POLICY.codeTtlSec * 1000).toISOString(),
  };
  await savePhoneCode({ phone, purpose, payload });
  try {
    // 5. Redis 저장에 성공한 뒤 실제 SMS를 발송한다.
    await sendVerificationCode({ to: phone, code });
  } catch (error) {
    // 발송 실패 시 사용할 수 없는 인증번호와 재발송 제한을 즉시 제거한다.
    await deletePhoneCode(phone, purpose);
    throw error;
  }
  return {
    phoneVerificationId,
    expiresInSeconds: PHONE_VERIFICATION_POLICY.codeTtlSec,
    resendAfterSeconds: PHONE_VERIFICATION_POLICY.cooldownSec,
  };
}

/** 사용자가 입력한 인증번호를 검증하고 성공하면 인증 완료 상태를 Redis에 저장한다. */
export async function verifyPhoneVerification(body) {
  // 1. 인증 목적·식별자·6자리 번호 형식을 검증한다.
  const { phone, purpose, phoneVerificationId, code } = validatePhoneVerify(body);

  // 2. Redis에 현재 유효한 인증 요청이 존재하는지 확인한다.
  const saved = await getPhoneCode(phone, purpose);
  if (!saved) throw new AppError(410, "PHONE_CODE_EXPIRED", "인증번호가 만료되었습니다. 다시 발송해주세요.");
  if (saved.phoneVerificationId !== phoneVerificationId) throw new AppError(400, "PHONE_VERIFICATION_MISMATCH", "현재 발송된 인증번호를 사용해주세요.");
  // 3. 입력한 인증번호를 저장된 bcrypt 해시와 비교한다.
  const matches = await bcrypt.compare(code, saved.codeHash);
  if (!matches) {
    // 실패 횟수를 누적하고 한도를 넘으면 인증 요청 자체를 폐기한다.
    const attemptCount = saved.attemptCount + 1;
    if (attemptCount >= PHONE_VERIFICATION_POLICY.maxAttempts) await deletePhoneCode(phone, purpose);
    else await updatePhoneCode(phone, purpose, { ...saved, attemptCount });
    throw new AppError(400, "PHONE_CODE_INVALID", "인증번호가 일치하지 않습니다.", { remainingAttempts: Math.max(PHONE_VERIFICATION_POLICY.maxAttempts - attemptCount, 0) });
  }
  // 4. 성공 상태는 후속 가입·찾기·수정 요청에서 소비할 수 있도록 별도 저장한다.
  const verifiedAt = new Date();
  await savePhoneVerified({
    phone,
    purpose,
    payload: {
      phone,
      purpose,
      phoneVerificationId,
      verifiedAt: verifiedAt.toISOString(),
      expiresAt: new Date(verifiedAt.getTime() + PHONE_VERIFICATION_POLICY.verifiedTtlSec * 1000).toISOString(),
    },
  });
  // 5. 검증에 사용된 인증번호는 즉시 삭제해 다시 사용할 수 없게 한다.
  await deletePhoneCode(phone, purpose);
  return { verified: true, phoneVerificationId, expiresInSeconds: PHONE_VERIFICATION_POLICY.verifiedTtlSec };
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
  // 1. 이름·전화번호·인증 식별자의 형식을 검증한다.
  const data = validateFindLoginId(body);

  // 2. FIND_ID 용도로 완료된 SMS 인증인지 확인한다.
  const verified = await getPhoneVerified(data.phone, "FIND_ID");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "휴대전화 인증이 만료되었거나 완료되지 않았습니다.");
  // 3. 인증된 전화번호와 이름이 실제 활성 계정과 일치하는지 확인한다.
  const user = await findUserByPhone(data.phone);
  if (!user || user.name !== data.name || user.deleted_at) throw new AppError(404, "ACCOUNT_NOT_FOUND", "입력한 정보와 일치하는 계정을 찾을 수 없습니다.");
  // 4. 계정 조회에 사용한 인증 상태를 한 번만 사용하고 폐기한다.
  await deletePhoneVerified(data.phone, "FIND_ID");
  return { loginId: user.login_id };
}

/** 본인인증과 계정 정보가 일치하면 새 비밀번호 해시를 저장하고 인증 상태를 소비한다. */
export async function resetUserPassword(body) {
  // 1. 계정 정보와 새 비밀번호 형식을 회원가입 정책과 동일하게 검증한다.
  const data = validateResetPassword(body);

  // 2. RESET_PASSWORD 용도로 완료된 SMS 인증인지 확인한다.
  const verified = await getPhoneVerified(data.phone, "RESET_PASSWORD");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "휴대전화 인증이 만료되었거나 완료되지 않았습니다.");
  // 3. 전화번호·아이디·이름이 모두 같은 활성 계정인지 확인한다.
  const user = await findUserByPhone(data.phone);
  if (!user || user.login_id !== data.loginId || user.name !== data.name || user.deleted_at) throw new AppError(404, "ACCOUNT_NOT_FOUND", "입력한 정보와 일치하는 계정을 찾을 수 없습니다.");
  // 4. 새 비밀번호 해시를 저장하고 탈취 가능성이 있는 모든 기존 세션을 폐기한다.
  await updateUserPassword(user.idx, await bcrypt.hash(data.password, env.bcrypt.saltRounds));
  await deleteAllRefreshSessions(user.idx);

  // 5. 비밀번호 변경에 사용한 SMS 인증 상태를 소비한다.
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
  // 1. 로그인 입력을 검증하고 아이디에 해당하는 계정을 조회한다.
  const { loginId, password } = validateLogin(body);
  const user = await findUserByLoginId(loginId);

  // 2. 계정 존재 여부와 관계없이 bcrypt 비교 결과로 동일한 인증 오류를 제공한다.
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !passwordMatches) throw new AppError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
  if (user.banned_at) throw new AppError(403, "BANNED_USER", "이용이 제한된 계정입니다.");
  if (user.deleted_at) throw new AppError(403, "DELETED_USER", "탈퇴한 계정입니다.");
  // 3. 활성 계정에 기기별 sid를 포함한 Access/Refresh Token을 발급한다.
  const tokens = createLoginTokens(user);

  // 4. Refresh Token 원문 대신 현재 jti와 접속 정보를 Redis에 저장한다.
  await saveRefreshSession({
    userIdx: user.idx,
    sessionId: tokens.sessionId,
    refreshJti: tokens.refreshJti,
    ...requestMeta,
  });
  return {
    tokens,
    user: {
      userIdx: Number(user.idx),
      loginId: user.login_id,
      nickname: user.nickname,
      role: user.role,
      profileImageUrl: user.profile_image,
    },
  };
}

/** Refresh Token을 검증하고 같은 기기 세션의 access/refresh 토큰을 모두 교체한다. */
export async function refreshLoginSession(refreshToken, requestMeta = {}) {
  // 1. 쿠키 존재 여부와 JWT 서명·필수 Refresh claim을 검증한다.
  if (!refreshToken) throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요.");
  let tokenSession;
  try { tokenSession = verifyRefreshToken(refreshToken); }
  catch { throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요."); }

  // 2. 토큰의 sub로 사용자를 조회하고 비활성 계정의 모든 세션을 폐기한다.
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

  // 3. 같은 기기 sid를 유지하면서 Access/Refresh Token의 jti를 새로 발급한다.
  const tokens = createLoginTokens(user, { sessionId: tokenSession.sessionId });

  // 4. Redis의 현재 jti와 요청 토큰의 jti가 같을 때만 원자적으로 교체한다.
  const rotated = await rotateRefreshSession({
    userIdx: user.idx,
    sessionId: tokenSession.sessionId,
    currentRefreshJti: tokenSession.refreshJti,
    nextRefreshJti: tokens.refreshJti,
    ...requestMeta,
  });
  // 세션 없음 또는 이전 Refresh Token 재사용은 모두 재로그인 대상으로 처리한다.
  if (rotated !== 1) throw new AppError(401, "REFRESH_TOKEN_INVALID", "다시 로그인해주세요.");
  return { tokens, refreshed: true };
}

/** 유효한 Refresh Token이 가리키는 현재 기기 세션만 서버에서 폐기한다. */
export async function logoutCurrentSession(refreshToken) {
  // Refresh 쿠키가 없어도 클라이언트 인증 상태를 정리할 수 있도록 성공 처리한다.
  if (!refreshToken) return { loggedOut: true };
  try {
    // 유효한 토큰이면 해당 sid의 Redis 세션만 제거한다.
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
  // Redis 세션 목록에 Access Token의 sid를 비교해 현재 기기를 표시한다.
  const sessions = await listRefreshSessions(userIdx);
  return sessions.map((session) => ({ ...session, current: session.sessionId === currentSessionId }));
}

/** 로그인 사용자가 지정한 한 기기의 Refresh 세션을 폐기한다. */
export async function logoutSession(userIdx, sessionId) {
  // 임의 Redis key 조작을 막기 위해 서버가 발급하는 UUID 형식만 허용한다.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof sessionId !== "string" || !uuidPattern.test(sessionId)) {
    throw new AppError(400, "VALIDATION_ERROR", "종료할 세션을 선택해주세요.", { field: "sessionId" });
  }
  // key에 현재 사용자 식별자를 포함해 다른 사용자의 세션을 삭제할 수 없게 한다.
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
