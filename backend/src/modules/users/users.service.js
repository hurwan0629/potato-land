import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { deletePhoneVerified, getPhoneVerified } from "../auth/auth.redis.js";
import {
  findEditableUser,
  findProfileConflict,
  softDeleteUser,
  updateUserAccount
} from "./users.repository.js";
import {
  validateAccountUpdate,
  validatePasswordVerification,
  validateWithdrawal
} from "./users.validator.js";

/** 회원정보 수정 권한을 나타내는 10분짜리 서명 토큰을 생성한다. */
function createVerificationToken(userIdx) {
  return jwt.sign(
    { type: "member_edit" },
    env.jwt.accessToken.secret,
    { subject: String(userIdx), expiresIn: 600 }
  );
}

/** 수정 토큰의 서명, 용도와 사용자 식별자가 현재 로그인 사용자와 일치하는지 검증한다. */
function verifyVerificationToken(token, userIdx) {
  try {
    const payload = jwt.verify(token, env.jwt.accessToken.secret);
    if (payload.type !== "member_edit" || Number(payload.sub) !== Number(userIdx)) throw new Error("invalid edit token");
  } catch {
    throw new AppError({
      status: 403,
      code: "EDIT_VERIFICATION_EXPIRED",
      message: "비밀번호 확인이 만료되었습니다. 다시 확인해주세요."
    });
  }
}

/** 현재 로그인 사용자의 수정 가능한 회원정보를 반환한다. */
export async function getMyAccount(userIdx) {
  const user = await findEditableUser(userIdx);
  if (!user || user.deleted_at) throw new AppError({
    status: 404,
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다."
  });
  return {
    userIdx: Number(user.idx),
    loginId: user.login_id,
    name: user.name,
    nickname: user.nickname,
    phone: user.phone,
    email: user.email,
    profileImageUrl: user.profile_image,
    role: user.role
  };
}

/** 현재 비밀번호가 일치하면 회원정보 수정용 단기 토큰과 현재 정보를 반환한다. */
export async function verifyAccountPassword(userIdx, body) {
  const password = validatePasswordVerification(body);
  const user = await findEditableUser(userIdx);
  if (!user || user.deleted_at || !await bcrypt.compare(password, user.password_hash)) throw new AppError({
    status: 400,
    code: "INVALID_PASSWORD",
    message: "비밀번호를 확인해주세요.",
    details: { field: "password" }
  });
  return {
    verificationToken: createVerificationToken(userIdx),
    profile: await getMyAccount(userIdx)
  };
}

/** 수정 토큰과 전화번호 인증을 확인한 뒤 회원정보 및 선택적 비밀번호를 변경한다. */
export async function updateMyAccount(userIdx, body) {
  const data = validateAccountUpdate(body);
  verifyVerificationToken(data.verificationToken, userIdx);
  const current = await findEditableUser(userIdx);
  if (!current || current.deleted_at) throw new AppError({
    status: 404,
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다."
  });
  if (data.phone !== current.phone) {
    const verified = await getPhoneVerified(data.phone, "CHANGE_PHONE");
    if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError({
      status: 410,
      code: "PHONE_VERIFICATION_EXPIRED",
      message: "변경할 휴대전화 인증을 완료해주세요.",
      details: { field: "phone" }
    });
  }
  const conflictField = await findProfileConflict(userIdx, data);
  if (conflictField) throw new AppError({
    status: 409,
    code: "CONFLICT",
    message: "이미 사용 중인 회원 정보입니다.",
    details: { field: conflictField }
  });
  const passwordHash = data.password ? await bcrypt.hash(data.password, env.bcrypt.saltRounds) : null;
  const updated = await updateUserAccount(userIdx, { ...data, passwordHash });
  if (data.phone !== current.phone) await deletePhoneVerified(data.phone, "CHANGE_PHONE");
  return {
    userIdx: Number(updated.idx),
    loginId: updated.login_id,
    name: updated.name,
    nickname: updated.nickname,
    phone: updated.phone,
    email: updated.email,
    profileImageUrl: updated.profile_image,
    role: updated.role,
    requiresLogin: Boolean(data.password)
  };
}

/** 수정 토큰을 확인한 뒤 현재 사용자를 탈퇴 상태로 변경한다. */
export async function withdrawMyAccount(userIdx, body) {
  verifyVerificationToken(validateWithdrawal(body), userIdx);

  // 소유 글 논리 삭제
  // 데이터베이스에서 해당 글들 전체 내리면 될거같음
  // 관련된 모든 관심거래 목록도 삭제해주고 관련 채팅방은 그대로 냅둬주기

  // 진행 거래 취소
  // transaction 에서 해당 사용자와 관련된 모든 ON_GOING을 CANCELED로 바꿔주는 서비스 로직 실행해주기

  // 입찰 제외 및 차순위 재계산
  // 1. 사용자가 현재 들어있는 진행중인 경매 모두 찾아내기
  // 2. 해당 경매에서 입찰자로 되어있다면 삭제하고 새로 정렬해주기
  // 3. REDIS 에서 auction:state:{idx} 에서 해당 사용자가 최고가로 설정되어있으면 검색해서 차순위로 넘겨주거나 없으면 해당 경매에서 입찰자가 없는 상태로 바꿔주기

  // Redis 로그인 세션 전체 제거
  // 해당 사용자가 들어있는 session:{sub}:{sid}를 삭제해주기

  // 타이머/경매 Redis 상태 정리
  // 위에서 말한 차순위 재계산 해주기
  // 그리고 timers에서 해당 사용자가 올린 경매 idx 모두 추출해서 삭제해주기

  // 관련 알림 발송
  // 관련 경매 사용자들에게 아래와 같은 알림 필요하면 보내주기
  // [LISTING_DELETED, PAYMENT_CANCELED, AUCTION_LEADER_CHANGED]
  // 필요한 referenceType는 아래와 같음
  // [AUCTION, TRANSACTION, ]

  await softDeleteUser(userIdx);
  return { withdrawn: true };
}
