import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { deleteAllRefreshSessions, deletePhoneVerified, getPhoneVerified } from "../auth/auth.redis.js";
import { findEditableUser, findProfileConflict, softDeleteUser, updateUserAccount } from "./users.repository.js";
import { validateAccountUpdate, validatePasswordVerification, validateWithdrawal } from "./users.validator.js";

/** 회원정보 수정 권한을 나타내는 10분짜리 서명 토큰을 생성한다. */
function createEditToken(userIdx) { return jwt.sign({ type: "member_edit" }, env.jwt.accessToken.secret, { subject: String(userIdx), expiresIn: 600 }); }

/** 수정 토큰의 서명, 용도와 사용자 식별자가 현재 로그인 사용자와 일치하는지 검증한다. */
function verifyEditToken(token, userIdx) {
  try {
    const payload = jwt.verify(token, env.jwt.accessToken.secret);
    if (payload.type !== "member_edit" || Number(payload.sub) !== Number(userIdx)) throw new Error("invalid edit token");
  } catch { throw new AppError(403, "EDIT_VERIFICATION_EXPIRED", "비밀번호 확인이 만료되었습니다. 다시 확인해주세요."); }
}

/** 현재 로그인 사용자의 수정 가능한 회원정보를 반환한다. */
export async function getMyAccount(userIdx) {
  const user = await findEditableUser(userIdx);
  if (!user || user.deleted_at) throw new AppError(404, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
  return { userIdx: Number(user.idx), loginId: user.login_id, name: user.name, nickname: user.nickname, phone: user.phone, email: user.email, profileImageUrl: user.profile_image, role: user.role };
}

/** 현재 비밀번호가 일치하면 회원정보 수정용 단기 토큰과 현재 정보를 반환한다. */
export async function verifyAccountPassword(userIdx, body) {
  const password = validatePasswordVerification(body);
  const user = await findEditableUser(userIdx);
  if (!user || user.deleted_at || !await bcrypt.compare(password, user.password_hash)) throw new AppError(400, "INVALID_PASSWORD", "비밀번호를 확인해주세요.", { field: "password" });
  return { editToken: createEditToken(userIdx), profile: await getMyAccount(userIdx) };
}

/** 수정 토큰과 전화번호 인증을 확인한 뒤 회원정보 및 선택적 비밀번호를 변경한다. */
export async function updateMyAccount(userIdx, body) {
  const data = validateAccountUpdate(body);
  verifyEditToken(data.editToken, userIdx);
  const current = await findEditableUser(userIdx);
  if (!current || current.deleted_at) throw new AppError(404, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
  if (data.phone !== current.phone) {
    const verified = await getPhoneVerified(data.phone, "CHANGE_PHONE");
    if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) throw new AppError(410, "PHONE_VERIFICATION_EXPIRED", "변경할 휴대전화 인증을 완료해주세요.", { field: "phone" });
  }
  const conflictField = await findProfileConflict(userIdx, data);
  if (conflictField) throw new AppError(409, "CONFLICT", "이미 사용 중인 회원 정보입니다.", { field: conflictField });
  const passwordHash = data.password ? await bcrypt.hash(data.password, env.bcrypt.saltRounds) : null;
  const updated = await updateUserAccount(userIdx, { ...data, passwordHash });
  if (data.phone !== current.phone) await deletePhoneVerified(data.phone, "CHANGE_PHONE");
  if (data.password) await deleteAllRefreshSessions(userIdx);
  return { userIdx: Number(updated.idx), loginId: updated.login_id, name: updated.name, nickname: updated.nickname, phone: updated.phone, email: updated.email, profileImageUrl: updated.profile_image, role: updated.role, requiresLogin: Boolean(data.password) };
}

/** 수정 토큰을 확인한 뒤 현재 사용자를 탈퇴 상태로 변경한다. */
export async function withdrawMyAccount(userIdx, body) {
  verifyEditToken(validateWithdrawal(body), userIdx);
  await softDeleteUser(userIdx);
  await deleteAllRefreshSessions(userIdx);
  return { withdrawn: true };
}
