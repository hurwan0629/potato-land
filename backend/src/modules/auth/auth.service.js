import bcrypt from "bcrypt";
import { randomInt, randomUUID } from "node:crypto";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
// import { solapiSmsService } from "../../infrastructure/sms/solapiSms.service.js";
import {
  createUser,
  findSignupConflict,
  findUserById,
  findUserByLoginId,
  findUserByPhone,
  updateUserPassword
} from "./auth.repository.js";
import {
  deletePhoneCode,
  deletePhoneVerified,
  getPhoneCode,
  getPhoneCooldown,
  getPhoneVerified,
  savePhoneCode,
  savePhoneVerified,
  saveRefreshSession,
  updatePhoneCode
} from "./auth.redis.js";
import { createLoginTokens } from "./auth.token.js";
import {
  validateFindLoginId,
  validateLogin,
  validateLoginId,
  validatePhoneSend,
  validatePhoneStatus,
  validatePhoneVerify,
  validateResetPassword,
  validateSignup
} from "./auth.validator.js";
import { sendVerificationCode } from "../../infrastructure/sms/sms.interface.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { redisKey } from "../../infrastructure/redis/redisKey.js";

const CONFLICT_MESSAGES = {
  loginId: "이미 사용 중인 아이디입니다.",
  nickname: "이미 사용 중인 닉네임입니다.",
  phone: "이미 가입된 휴대전화 번호입니다.",
  email: "이미 사용 중인 이메일입니다."
};

/** 회원가입 요청의 휴대전화 인증 완료 상태를 확인하고 신규 회원을 생성한다. */
export async function signupUser(body) {

  // [2026-08-05 04:08:41]
  // {
  //   "cookies": {},
  //   "body": {
  //     "name": "홍길동",
  //     "nickname": "감자왕",
  //     "loginId": "potato123",
  //     "password": "Password123!",
  //     "passwordConfirm": "Password123!",
  //     "phone": "01012345678",
  //     "phoneVerificationId": "phone-verification-uuid",
  //     "email": "user@example.com",
  //     "termsAgreed": true
  //   }
  // }

  // 데이터 있어야하는것들 그대로 만들어주기
  const data = validateSignup(body);
  
  // 
  const verified = await getPhoneVerified(data.phone, "SIGNUP");

  // [2026-08-05 04:13:47]
  // 현재 phoneVerificationId가 redis의 값과 동일한 센션이 맞는지 확인합니다.
  if (!verified 
    || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError({
    status: 410,
    code: "PHONE_VERIFICATION_EXPIRED",
    message: "휴대전화 인증이 만료되었거나 완료되지 않았습니다."
  });

  // 중복 금지 필드를 모두 DB와 대조하여 확인합니다.
  const conflictField = await findSignupConflict(data);

  if (conflictField) throw new AppError({
    status: 409,
    code: "CONFLICT",
    message: CONFLICT_MESSAGES[conflictField],
    details: { field: conflictField }
  });

  // [2026-08-05 04:22:01] 확인
  const passwordHash = await bcrypt.hash(data.password, env.bcrypt.saltRounds);

  // 
  try {
    /// [2026-08-05 04:24:29] 확인
    const user = await createUser({ ...data, passwordHash });

    // [2026-08-05 04:24:38] 확인
    await deletePhoneVerified(data.phone, "SIGNUP");


    // [2026-08-05 04:25:31] 굳
    return {
      userIdx: Number(user.idx),
      loginId: user.login_id,
      nickname: user.nickname,
      role: user.role,
      profileImageUrl: user.profile_image,
      requiresLogin: true
    };

  } catch (error) {
    // [2026-08-05 04:26:45] pg 고유키 문제
    if (error.code === "23505") throw new AppError({
      status: 409,
      code: "CONFLICT",
      message: "이미 사용 중인 회원 정보가 있습니다."
    });
    throw error;
  }
}

/** 6자리 인증번호를 생성해 Redis에 저장한 뒤 SOLAPI 문자메시지를 발송한다. */
// 사용자가 특정 목적에 따라 전화번호 인증을 위해 코드를 redis에 code로 저장하고 보내준다.
export async function sendPhoneVerification(body) {

  const { phone, purpose, name, loginId } = validatePhoneSend(body);

  const phoneUser = await findUserByPhone(phone);

  if (purpose === "SIGNUP" && phoneUser) throw new AppError({
    status: 409,
    code: "PHONE_ALREADY_REGISTERED",
    message: "이미 가입된 휴대전화 번호입니다.",
    details: { field: "phone" }
  });
  if (purpose === "CHANGE_PHONE" && phoneUser) throw new AppError({
    status: 409,
    code: "PHONE_ALREADY_REGISTERED",
    message: "이미 가입된 휴대전화 번호입니다.",
    details: { field: "phone" }
  });
  if ((purpose === "FIND_ID" || purpose === "RESET_PASSWORD") && (!phoneUser || phoneUser.deleted_at)) {
    throw new AppError({
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "전화번호를 확인해주세요.",
      details: { field: "phone" }
    });
  }
  if ((purpose === "FIND_ID" || purpose === "RESET_PASSWORD") && phoneUser.name !== name) {
    throw new AppError({
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "이름을 확인해주세요.",
      details: { field: "name" }
    });
  }
  if (purpose === "RESET_PASSWORD" && phoneUser.login_id !== loginId) {
    throw new AppError({
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "아이디를 확인해주세요.",
      details: { field: "loginId" }
    });
  }

  // 유효성 검증 후 남은 시간 뽑아주기
  const retryAfterSeconds = await getPhoneCooldown(phone, purpose);

  if (retryAfterSeconds > 0) throw new AppError({
    status: 429,
    code: "PHONE_SEND_COOLDOWN",
    message: `${retryAfterSeconds}초 후 다시 요청해주세요.`,
    details: { retryAfterSeconds }
  });

  // 5자리 인증코드 랜덤으로 만들어주기
  const code = String(randomInt(100000, 1000000));
  // 클라이언트 고유 id 만들어서 보내주기
  const phoneVerificationId = randomUUID();
  const now = Date.now();
  const payload = {
    phone,
    purpose,
    phoneVerificationId,
    codeHash: await bcrypt.hash(code, env.bcrypt.saltRounds),
    attemptCount: 0,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + env.sms.codeTtlSec * 1000).toISOString()
  };
  
  // cooldown과 code 저장해두기
  await savePhoneCode({ phone, purpose, payload });

  try {
    await sendVerificationCode({ to: phone, code })
    // await solapiSmsService.sendVerificationCode();
  } catch (error) {
    await deletePhoneCode(phone, purpose);
    throw error;
  }
  return {
    phone,
    purpose,
    phoneVerificationId,
    expiresInSeconds: env.sms.codeTtlSec,
    resendAfterSeconds: env.sms.cooldownSec
  };
}

/** 사용자가 입력한 인증번호를 검증하고 성공하면 인증 완료 상태를 Redis에 저장한다. */
// [2026-08-05 05:04:34] 검증 완료
export async function verifyPhoneVerification(body) {

  const { phone, purpose, phoneVerificationId, code } = validatePhoneVerify(body);

  // 지금 phone:code가 저장되어있는지 확인하기 -> JSON STRINGIFY | null 반환
  const saved = await getPhoneCode(phone, purpose);

  if (!saved) throw new AppError({
    status: 410,
    code: "PHONE_CODE_EXPIRED",
    message: "인증번호가 만료되었습니다. 다시 발송해주세요."
  });
  if (saved.phoneVerificationId !== phoneVerificationId) throw new AppError({
    status: 400,
    code: "PHONE_VERIFICATION_MISMATCH",
    message: "현재 발송된 인증번호를 사용해주세요."
  });

  // 인증번호와 동일한지 확인해주기 (saved.codeHash)
  const matches = await bcrypt.compare(code, saved.codeHash);

  // 틀리면 정리하고 에러
  if (!matches) {
    // 시도 횟수 1 늘려주기
    const attemptCount = saved.attemptCount + 1;
    // 5회 이상 날아가면 그냥 코드 삭제해버려서 재시도 못하게 하기
    if (attemptCount >= env.sms.maxAttempts) {
      await deletePhoneCode(phone, purpose);
    }
    else {
      await updatePhoneCode(phone, purpose, { ...saved, attemptCount });
    }
    throw new AppError({
      status: 400,
      code: "PHONE_CODE_INVALID",
      message: "인증번호가 일치하지 않습니다.",
      details: {
        remainingAttempts: Math.max(env.sms.maxAttempts - attemptCount, 0)
      }
    });
  }

  // 현재 시각 뽑기
  const verifiedAt = new Date();
  await savePhoneVerified({
    phone,
    purpose,
    payload: {
      phone,
      purpose,
      phoneVerificationId,
      verifiedAt: verifiedAt.toISOString(),
      verified: true,
      expiresAt: new Date(verifiedAt.getTime() + env.sms.verifiedTtlSec * 1000).toISOString()
    }
  });

  // 전화번호 발송 코드 삭제해주기
  await deletePhoneCode(phone, purpose);

  // 
  return {
    verified: true,
    phone,
    purpose,
    phoneVerificationId,
    expiresInSeconds: env.sms.verifiedTtlSec
  };
}

/** 휴대전화 인증 완료 여부와 만료 시각을 조회한다. */
export async function getPhoneVerificationStatus(query) {
  // 필요한 3 값 뽑기
  const { phone, purpose, phoneVerificationId } = validatePhoneStatus(query);

  // 저장되어있는거 확인해주고
  // getPhoneVerified안에서 Id가 일치하지 않으면 400 보내주기
  const saved = await getPhoneVerified(phone, purpose);
  // 맞으면 인증되엇다고 보내주기
  const verified = Boolean(saved && saved.phoneVerificationId === phoneVerificationId);
  
  return {
    phone,
    purpose,
    verified,
    phoneVerificationId,
    expiresAt: verified ? saved.expiresAt : null
  };
}

/** 본인인증 정보와 이름이 일치하면 가입된 아이디를 반환하고 인증 상태를 소비한다. */
export async function findLoginIdByPhone(body) {

  // 데이터 검증하기
  const data = validateFindLoginId(body);

  // 아이디 확인용으로 키 존재하는지 확인하기
  const verified = await getPhoneVerified(data.phone, "FIND_ID");
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError({
    status: 410,
    code: "PHONE_VERIFICATION_EXPIRED",
    message: "휴대전화 인증이 만료되었거나 완료되지 않았습니다."
  });
  const user = await findUserByPhone(data.phone);
  if (!user || user.name !== data.name || user.deleted_at) throw new AppError({
    status: 404,
    code: "ACCOUNT_NOT_FOUND",
    message: "입력한 정보와 일치하는 계정을 찾을 수 없습니다."
  });

  await deletePhoneVerified(data.phone, "FIND_ID");

  return { loginId: user.login_id };
}

/** 본인인증과 계정 정보가 일치하면 새 비밀번호 해시를 저장하고 인증 상태를 소비한다. */
export async function resetUserPassword(body) {

  // 정규성 등 검사
  const data = validateResetPassword(body);

  // redis에 해당 정보 verified 있는지 확인
  const verified = await getPhoneVerified(data.phone, "RESET_PASSWORD");

  // 사용자가 이거 등록한 사용자가 맞는지 확인
  if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError({
    status: 410,
    code: "PHONE_VERIFICATION_EXPIRED",
    message: "휴대전화 인증이 만료되었거나 완료되지 않았습니다."
  });

  // 핸드폰으로 사용자 아이디만 뽑아서 주기 -> user: {idx, login_id, name, phone, deleted_at, banned_at}
  const user = await findUserByPhone(data.phone);
  if (!user || user.login_id !== data.loginId || user.name !== data.name || user.deleted_at) throw new AppError({
    status: 404,
    code: "ACCOUNT_NOT_FOUND",
    message: "입력한 정보와 일치하는 계정을 찾을 수 없습니다."
  });

  await updateUserPassword(user.idx, await bcrypt.hash(data.password, env.bcrypt.saltRounds));
  await deletePhoneVerified(data.phone, "RESET_PASSWORD");

  return { reset: true };
}

/** 아이디가 회원가입에 사용 가능한지 조회한다. */
export async function checkLoginIdAvailability(rawLoginId) {
  
  // 아이디 유효성 검사
  const loginId = validateLoginId(rawLoginId);

  // 존재 여부까지 확인해서 돌려주기
  return { 
    loginId, 
    available: !await findUserByLoginId(loginId) 
  };
}

/** 자격 증명과 사용자 상태를 확인하고 Redis 세션 및 JWT를 생성한다. */
export async function loginUser(body, requestMeta) {
  // 로그인 유효성 검사
  const { loginId, password } = validateLogin(body);

  // 사용자 존재하는지 받아오기
  const user = await findUserByLoginId(loginId);
  // 비밀번호 맞는지 확인해주기
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!user || !passwordMatches) throw new AppError({
    status: 401,
    code: "INVALID_CREDENTIALS",
    message: "아이디 또는 비밀번호가 올바르지 않습니다."
  });
  if (user.banned_at) throw new AppError({
    status: 403,
    code: "BANNED_USER",
    message: "이용이 제한된 계정입니다."
  });
  if (user.deleted_at) throw new AppError({
    status: 403,
    code: "DELETED_USER",
    message: "탈퇴한 계정입니다."
  });
  
  // access/refresh token 주면서 
  // sessionId, refreshJti를 같이 받기
  const tokens = createLoginTokens(user);
  await saveRefreshSession({ 
    userIdx: user.idx, 
    sid: tokens.sessionId, 
    jti: tokens.refreshJti, 
    ...requestMeta 
  });

  return {
    tokens,
    user: {
      userIdx: Number(user.idx),
      loginId: user.login_id,
      nickname: user.nickname,
      role: user.role,
      profileImageUrl: user.profile_image
    }
  };
}

/**
 * [2026-08-05 05:28:12]
 * 사용자의 redis 정보를 없애고
 * 토큰을 없애주기
 */
export async function removeUserSession({ userIdx, sid }) {
  // 
  await getRedisClient().del(`${redisKey.session(userIdx, sid)}`)
}

/** 인증된 사용자 식별자로 현재 활성 계정 정보를 반환한다. */
// [2026-08-05 07:58:44] 확인 완료
export async function getAuthenticatedUser(userIdx) {
  const user = await findUserById(userIdx);
  if (!user) throw new AppError({
    status: 401,
    code: "UNAUTHORIZED",
    message: "로그인이 필요합니다."
  });
  if (user.banned_at) throw new AppError({
    status: 403,
    code: "BANNED_USER",
    message: "이용이 제한된 계정입니다."
  });
  if (user.deleted_at) throw new AppError({
    status: 403,
    code: "DELETED_USER",
    message: "탈퇴한 계정입니다."
  });
  return {
    userIdx: Number(user.idx),
    loginId: user.login_id,
    nickname: user.nickname,
    role: user.role,
    profileImageUrl: user.profile_image,
    banned: false
  };
}

// [2026-08-05 07:51:33] 작업 완료
export async function refreshUserToken({ user, auth, requestMeta }) {
  // 1. 사용자가 로그인 상태인지 확인
  if(!user.idx) {
    throw new AppError({
      status: 401,
      code: "REFRESH_TOKEN_INVALID",
      message: "다시 로그인해주세요."
    });
  }

  if (!!user.bannedAt) {
    throw new AppError({
      status: 403,
      code: "BANNED_USER",
      message: "이용이 제한된 계정입니다."
    });
  }

  if (!!user.deletedAt) {
    throw new AppError({
      status: 403,
      code: "DELETED_USER",
      message: "탈퇴한 계정입니다."
    });
  }

  // 2. 사용자 redis 세션 확인
  let userSession
  const refreshToken = req.cookies.refresh_token
  
  if(!refreshToken) {
    throw new AppError({
      status: 401,
      code: "REFRESH_TOKEN_INVALID",
      message: "다시 로그인해주세요."
    });
  }

  try {
    userSession = JSON.parse(await getRedisClient().get(redisKey.session(refreshToken.sub, refreshToken.sid)))
  } catch (e) {
    throw new AppError({ status: 401, code: "REFRESH_TOKEN_INVALID", message: "다시 로그인해주세요." },)
  }

  // 2-1. 사용자 refresh_token 값 확인하기

  if(!userSession || refreshToken.jti !== userSession.currentRefreshJti) {
    throw new AppError({
      status: 401,
      code: "REFRESH_TOKEN_INVALID",
      message: "다시 로그인해주세요."
    });
  }

  // 3. access/refress 새로 발급
  const tokens = createLoginTokens(user);
  await saveRefreshSession({ 
    userIdx: user.idx, 
    sessionId: tokens.sessionId, 
    refreshJti: tokens.refreshJti, 
    ...requestMeta 
  });

  return {
    tokens,
    data: {
      refreshed: true
    }
  };
}
