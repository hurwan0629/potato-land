import { AppError } from "../../common/errors/AppError.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { notImplemented } from "../../common/utils/notImplemented.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import {
  checkLoginIdAvailability,
  findLoginIdByPhone,
  getAuthenticatedUser,
  getPhoneVerificationStatus,
  loginUser,
  refreshUserToken,
  removeUserSession,
  resetUserPassword,
  sendPhoneVerification,
  checkUserRefreshCook,
  signupUser,
  verifyPhoneVerification
} from "./auth.service.js";
import { setLoginCookies, setLogoutCookies, checkUserRefreshCookie } from "./auth.token.js";

/** 회원가입 요청을 처리하고 생성된 사용자 정보를 응답한다. */

  // TODO 처리 순서:
  // 1. 비회원 요청인지 확인하고 회원가입 입력값을 검증한다. [2026-08-05 04:23:54]
  // 2. phone:verified:{phone}:SIGNUP의 인증 ID가 요청값과 같은지 확인한다. [2026-08-05 04:23:56]
  // 3. 아이디, 닉네임, 전화번호, 이메일 중복을 DB에서 다시 확인한다. [2026-08-05 04:24:00]
  // 4. 비밀번호를 hash한 뒤 사용자를 저장하고 commit 후 인증 key를 삭제한다. [2026-08-05 04:27:26]
export const signup = asyncHandler(async (req, res) =>
  res.status(201).json({
    success: true,
    data: await signupUser(req.body)
  })
);


/** query의 loginId가 사용 가능한지 응답한다. */
// TODO: loginId 형식을 검증하고 users.login_id 중복 여부를 반환한다. [2026-08-05 04:34:37]
export const checkLoginId = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    data: await checkLoginIdAvailability(req.query.loginId)
  })
);

/** 휴대전화 인증번호를 발송하고 인증 식별자와 제한 시간을 응답한다. */
  // TODO 처리 순서:
  // 1. phone과 purpose를 검증하고 purpose에 맞는 접근 권한과 중복 정책을 적용한다. [2026-08-05 04:50:20]
  // 2. cooldown key가 있으면 429를 반환한다. [2026-08-05 04:50:21]
  // 3. SMS 발송 성공 후 code hash, 인증 ID, 만료 시각과 cooldown을 Redis에 저장한다. [2026-08-05 04:50:23]
export const sendPhoneCode = asyncHandler(
  async (req, res) => {
    res.status(200).json({
      success: true,
      data: await sendPhoneVerification(req.body)
    })
  }
);

/** 입력한 인증번호를 검증하고 인증 완료 상태를 응답한다. */
// TODO: Redis의 code hash와 요청 code를 비교하고 성공하면 code key를 지운 뒤 verified key를 저장한다. [2026-08-05 05:04:52]
export const verifyPhoneCode = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    data: await verifyPhoneVerification(req.body)
  })
);

/** 휴대전화 인증 완료 상태를 조회해 응답한다. */
// TODO: phone, purpose, phoneVerificationId를 검증하고 verified key의 일치 여부와 남은 시간을 반환한다.
export const getPhoneStatus = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    // phone/purpose/phoneVerifiedId 만들기
    data: await getPhoneVerificationStatus(req.query)
  })
);

/** 로그인 자격 증명을 확인하고 access/refresh HttpOnly 쿠키를 발급한다. */
  // TODO 처리 순서:
  // 1. 비회원 요청과 아이디/비밀번호 형식을 확인한다.
  // 2. DB 사용자 상태와 비밀번호 hash를 검증한다.
  // 3. 같은 sid를 공유하는 access/refresh token과 서로 다른 jti를 만든다.
  // 4. refresh jti를 Redis session에 저장하고 두 HttpOnly cookie를 설정한다.
export const login = asyncHandler(async (req, res) => {
  // 사용자 user-agent와 ip 뽑아주기 + 로그인 가능한지 확인 후 결과 주기
  // 그리고 redis에 데이터 저장해주고
  // 토큰 뽑아서 보내주기
  const result = await loginUser(req.body, { userAgent: req.get("user-agent") ?? "", ip: req.ip });
  

  // { access_token, refresh_token } 넣어주기
  setLoginCookies(res, result.tokens);
  // 응답해주기
  return res.status(200).json({ success: true, data: result.user });
});

/** 로그아웃 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
// TODO: refresh cookie에서 sub/sid를 확인해 현재 Redis session만 삭제하고 두 cookie를 만료시킨다.
export const logout = asyncHandler(
  async (req, res) => {
    // redis에서 session을 없애주고
    // refresh 쿠키 여부 확인해주기
    const refreshCookieValid = await checkUserRefreshCookie({ refreshToken: req.cookies.refresh_token })

    if(!refreshCookieValid) {
      throw new AppError({ status: 401, code: "REFRESH_TOKEN_INVALID", message: "다시 로그인해주세요." },)
    }
    // 사용자에게 동일한 옵션의 0초 만료일의 쿠키 2개를 준다
    const result = await removeUserSession({ userIdx: req.user?.userIdx, sid: req.auth?.sid })
    // return notImplemented(res, "로그아웃");
    setLogoutCookies(res)

    return res.status(200).json({ success: true, data: { loggedOut: true } });
  }
)

/** 토큰 재발급 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
// TODO: refresh JWT와 Redis의 현재 jti를 비교하고 새 access/refresh jti로 먼저 교체한 뒤 cookie를 재발급한다.
// [2026-08-05 07:56:47] 작업 완료
export const refresh = asyncHandler(
  async (req, res) => {
    // result = { tokens: { accessToken, refreshToken, sessionId, refreshJid }, data }
    const result = await refreshUserToken({ user: req.user, auth: req.auth, requestMeta: { userAgent: req.get("user-agent") ?? "", ip: req.ip } })

    setLoginCookies(res, result.tokens)
    
    return res.status(200).json({
      success: true,
      data: result.data
    })
  }
)

/** access token으로 식별한 현재 활성 사용자 정보를 응답한다. */
// TODO: access token과 DB 사용자 상태를 검증하고 헤더에서 사용할 최소 인증 사용자 DTO를 반환한다.
// 확인 완료
export const getMe = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    data: await getAuthenticatedUser(req.auth.userIdx)
  })
);

/** 본인인증을 완료한 사용자의 아이디를 조회해 응답한다. */
// TODO: 이름과 전화번호가 같은 사용자를 찾고 FIND_ID verified key가 일치하면 loginId만 반환한 뒤 key를 삭제한다.
// [2026-08-05 08:01:19] 검수 완료
export const findLoginId = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    data: await findLoginIdByPhone(req.body)
  })
);

/** 본인인증을 완료한 사용자의 비밀번호를 새 값으로 변경한다. */
// TODO: 이름/아이디/전화번호와 RESET_PASSWORD verified key를 검증하고 새 비밀번호 hash를 저장한 뒤 key와 기존 session을 폐기한다.
export const resetPassword = asyncHandler(async (req, res) =>
  res.status(200).json({
    success: true,
    data: await resetUserPassword(req.body)
  })
);
