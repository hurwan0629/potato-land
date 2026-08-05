import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { env } from "../../config/env.js";
import { getMyAccount, updateMyAccount, verifyAccountPassword, withdrawMyAccount } from "./users.service.js";

/** 현재 로그인 사용자의 회원정보를 응답한다. */
// TODO: 로그인 사용자의 개인정보와 공개 프로필 통계를 함께 조회하되 password hash 등 내부 값은 제외한다.
export const getMyProfile = asyncHandler(
  async (req, res) => {
    res.status(200).json({ 
      success: true, 
      data: await getMyAccount(req.auth.userIdx) 
    })
  });

/** 현재 비밀번호를 확인하고 회원정보 수정용 토큰을 발급한다. */
// TODO: access token의 사용자 비밀번호를 확인하고 10분짜리 회원정보 수정 verificationToken을 발급한다.
export const verifyMyPassword = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await verifyAccountPassword(req.auth.userIdx, req.body) }));

/** 검증된 회원정보 변경 요청을 처리한다. */
  // TODO 처리 순서:
  // 1. verificationToken과 선택 입력값을 검증한다.
  // 2. nickname/email 중복을 확인하고 phone 변경이면 CHANGE_PHONE 인증 ID를 확인한다.
  // 3. newPassword가 있으면 확인값과 정책을 검증해 hash한다.
  // 4. 하나의 transaction에서 변경하고 commit 후 사용한 인증 key와 수정 token을 폐기한다.
export const updateMe = asyncHandler(async (req, res) => {
  const result = await updateMyAccount(req.auth.userIdx, req.body);
  if (result.requiresLogin) {
    res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath });
    res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath });
  }
  return res.status(200).json({ success: true, data: result });
});

/** 추가 정보 입력 없이 확인된 사용자를 탈퇴 처리하고 인증 쿠키를 만료한다. */
  // TODO 처리 순서:
  // 1. 로그인 사용자와 비밀번호를 확인한다.
  // 2. users.deleted_at, 소유 listing 삭제, REQUESTED 거래 취소를 한 transaction에서 처리한다.
  // 3. 탈퇴 사용자의 경매 입찰을 제외해 최고 입찰자를 재계산한다.
  // 4. commit 후 모든 session, Timer/Redis 상태를 정리하고 관련 사용자에게 알림을 보낸다.
export const withdrawMe = asyncHandler(async (req, res) => {
  const result = await withdrawMyAccount(req.auth.userIdx, req.body);
  res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath });
  res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath });
  return res.status(200).json({ success: true, data: result });
});

/** 공개 프로필 조회는 후속 구현 전까지 501을 반환한다. */
// TODO: 대상 사용자의 공개 프로필, 완료 판매/구매 수, 평균 평점, 받은 후기 수를 조회하고 비활성 사용자 표시 정책을 적용한다.
export function getUserProfile(_req, res) { 
  return res.status(501).json({ 
    success: false, 
    code: "NOT_IMPLEMENTED", 
    message: "사용자 공개 프로필 조회는 아직 구현되지 않았습니다." 
  }); 
}

/** 프로필 이미지 수정은 후속 구현 전까지 501을 반환한다. */
  // TODO 처리 순서:
  // 1. 로그인 사용자를 확인하고 bio 및 선택 이미지 파일을 검증한다.
  // 2. 새 이미지 저장과 users.profile_image/bio 갱신을 처리한다.
  // 3. commit 후 교체된 이전 이미지 파일을 정리하고 공개 프로필 DTO를 반환한다.
export function updateMyProfile(_req, res) { 
  return res.status(501).json({ 
    success: false, 
    code: "NOT_IMPLEMENTED", 
    message: "프로필 이미지 수정은 아직 구현되지 않았습니다." 
  }); 
}

/** 별도 비밀번호 변경 API는 통합 회원정보 수정 API 사용을 안내한다. */
export function updateMyPassword(_req, res) { 
  return res.status(501).json({ 
    success: false, 
    code: "USE_ACCOUNT_UPDATE", 
    message: "회원정보 수정 API를 사용해주세요." 
  }); 
}
