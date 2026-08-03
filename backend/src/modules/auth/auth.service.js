import bcrypt from "bcrypt";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { createUser, findSignupConflict, findUserById, findUserByLoginId } from "./auth.repository.js";
import { saveRefreshSession } from "./auth.redis.js";
import { createLoginTokens } from "./auth.token.js";
import { validateLogin, validateLoginId, validateSignup } from "./auth.validator.js";

const CONFLICT_MESSAGES = { loginId: "이미 사용 중인 아이디입니다.", nickname: "이미 사용 중인 닉네임입니다.", phone: "이미 가입된 전화번호입니다.", email: "이미 사용 중인 이메일입니다." };

/** SMS 인증을 제외한 입력값을 검증하고 신규 회원을 생성한다. */
export async function signupUser(body) {
  const data = validateSignup(body);
  const conflictField = await findSignupConflict(data);
  if (conflictField) throw new AppError(409, "CONFLICT", CONFLICT_MESSAGES[conflictField], { field: conflictField });
  const passwordHash = await bcrypt.hash(data.password, env.bcrypt.saltRounds);
  try {
    const user = await createUser({ ...data, passwordHash });
    return { userIdx: Number(user.idx), loginId: user.login_id, nickname: user.nickname, role: user.role, profileImageUrl: user.profile_image, requiresLogin: true };
  } catch (error) {
    if (error.code === "23505") throw new AppError(409, "CONFLICT", "이미 사용 중인 회원 정보가 있습니다.");
    throw error;
  }
}

/** 아이디가 회원가입에 사용 가능한지 조회한다. */
export async function checkLoginIdAvailability(rawLoginId) {
  const loginId = validateLoginId(rawLoginId);
  const user = await findUserByLoginId(loginId);
  return { loginId, available: !user };
}

/** 자격 증명과 사용자 상태를 확인하고 Redis session 및 JWT를 생성한다. */
export async function loginUser(body, requestMeta) {
  const { loginId, password } = validateLogin(body);
  const user = await findUserByLoginId(loginId);
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !passwordMatches) throw new AppError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
  if (user.banned_at) throw new AppError(403, "BANNED_USER", "이용이 제한된 계정입니다.");
  if (user.deleted_at) throw new AppError(403, "DELETED_USER", "탈퇴한 계정입니다.");
  const tokens = createLoginTokens(user);
  await saveRefreshSession({ userIdx: user.idx, sessionId: tokens.sessionId, refreshJti: tokens.refreshJti, ...requestMeta });
  return {
    tokens,
    user: { userIdx: Number(user.idx), loginId: user.login_id, nickname: user.nickname, role: user.role, profileImageUrl: user.profile_image },
  };
}

/** 인증된 사용자 식별자로 현재 활성 계정 요약을 반환한다. */
export async function getAuthenticatedUser(userIdx) {
  const user = await findUserById(userIdx);
  if (!user) throw new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  if (user.banned_at) throw new AppError(403, "BANNED_USER", "이용이 제한된 계정입니다.");
  if (user.deleted_at) throw new AppError(403, "DELETED_USER", "탈퇴한 계정입니다.");
  return { userIdx: Number(user.idx), loginId: user.login_id, nickname: user.nickname, role: user.role, profileImageUrl: user.profile_image, banned: false };
}
