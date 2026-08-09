import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { env } from "../../config/env.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { cancelAuctionEnd } from "../../schedulers/auctionTimer.js";
import { deleteAllRefreshSessions, deletePhoneVerified, getPhoneVerified } from "../auth/auth.redis.js";
import {
  findEditableUser,
  findMyAccountSummary,
  findProfileConflict,
  findUserProfile,
  updatePublicProfile,
  updateUserAccount,
  withdrawUserCascade,
} from "./users.repository.js";
import {
  validateAccountUpdate,
  validatePasswordVerification,
  validatePublicProfileUpdate,
  validateUserIdx,
  validateWithdrawal,
} from "./users.validator.js";

const log = logger.child("users-service");

/** 계정 수정 전 비밀번호 확인 완료 상태를 짧은 JWT로 발급한다. */
function createEditToken(userIdx) {
  return jwt.sign(
    { type: "member_edit" },
    env.jwt.accessToken.secret,
    { subject: String(userIdx), expiresIn: 600 },
  );
}

/** 계정 수정용 editToken의 용도와 사용자 식별자를 검증한다. */
function verifyEditToken(token, userIdx) {
  try {
    const payload = jwt.verify(token, env.jwt.accessToken.secret);
    if (payload.type !== "member_edit" || Number(payload.sub) !== Number(userIdx)) {
      throw new Error("invalid edit token");
    }
  } catch {
    throw new AppError({
      status: 403,
      code: "EDIT_VERIFICATION_EXPIRED",
      message: "비밀번호 확인이 만료되었습니다. 다시 확인해주세요.",
    });
  }
}

/** 로그인 사용자의 계정 요약과 거래·후기 통계를 반환한다. */
export async function getMyAccount(userIdx) {
  const user = await findMyAccountSummary(userIdx);
  if (!user) {
    throw new AppError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }
  return {
    userIdx: Number(user.idx),
    loginId: user.login_id,
    name: user.name,
    nickname: user.nickname,
    phone: user.phone,
    email: user.email,
    profileImageUrl: user.profile_image,
    bio: user.bio,
    role: user.role,
    sellCount: Number(user.sell_count),
    buyCount: Number(user.buy_count),
    averageRating: Number(user.average_rating),
    reviewCount: Number(user.review_count),
  };
}

/** 공개 프로필 식별자를 검증하고 공개 가능한 통계를 반환한다. */
export async function getPublicProfile(userIdxValue) {
  const userIdx = validateUserIdx(userIdxValue);
  const profile = await findUserProfile(userIdx);
  if (!profile) {
    throw new AppError({
      status: 404,
      code: "NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }
  return {
    ...profile,
    userIdx: Number(profile.userIdx),
    sellCount: Number(profile.sellCount),
    buyCount: Number(profile.buyCount),
    averageRating: Number(profile.averageRating),
    reviewCount: Number(profile.reviewCount),
  };
}

/** 공개 프로필 입력과 이미지를 검증하고 프로필 정보를 갱신한다. */
export async function updateMyPublicProfile(userIdx, body, files) {
  const data = validatePublicProfileUpdate(body, files);
  const updated = await updatePublicProfile(userIdx, data);
  if (!updated) {
    throw new AppError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }
  return {
    userIdx: Number(updated.idx),
    nickname: updated.nickname,
    profileImageUrl: updated.profile_image,
    bio: updated.bio,
    updatedAt: updated.updated_at,
  };
}

/** 현재 비밀번호를 확인하고 계정 수정용 editToken을 발급한다. */
export async function verifyAccountPassword(userIdx, body) {
  const password = validatePasswordVerification(body);
  const user = await findEditableUser(userIdx);
  if (!user || user.deleted_at || !await bcrypt.compare(password, user.password_hash)) {
    throw new AppError({
      status: 400,
      code: "INVALID_PASSWORD",
      message: "비밀번호를 확인해주세요.",
      details: { field: "password" },
    });
  }
  return {
    editToken: createEditToken(userIdx),
    expiresInSec: 600,
    profile: await getMyAccount(userIdx),
  };
}

/** editToken과 중복·휴대전화 인증을 확인한 뒤 계정 정보를 갱신한다. */
export async function updateMyAccount(userIdx, body) {
  const data = validateAccountUpdate(body);
  verifyEditToken(data.editToken, userIdx);
  const current = await findEditableUser(userIdx);
  if (!current || current.deleted_at) {
    throw new AppError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }

  if (data.phone !== current.phone) {
    const verified = await getPhoneVerified(data.phone, "CHANGE_PHONE");
    if (!verified || verified.phoneVerificationId !== data.phoneVerificationId) {
      throw new AppError({
        status: 410,
        code: "PHONE_VERIFICATION_EXPIRED",
        message: "변경할 휴대전화 인증을 완료해주세요.",
        details: { field: "phoneVerificationId" },
      });
    }
  }

  const conflictField = await findProfileConflict(userIdx, data);
  if (conflictField) {
    throw new AppError({
      status: 409,
      code: "CONFLICT",
      message: "이미 사용 중인 회원 정보입니다.",
      details: { field: conflictField },
    });
  }

  const passwordHash = data.newPassword ? await bcrypt.hash(data.newPassword, env.bcrypt.saltRounds) : null;
  const updated = await updateUserAccount(userIdx, { ...data, passwordHash });
  if (data.phone !== current.phone) await deletePhoneVerified(data.phone, "CHANGE_PHONE");
  if (data.newPassword) await deleteAllRefreshSessions(userIdx);

  return {
    userIdx: Number(updated.idx),
    loginId: updated.login_id,
    name: updated.name,
    nickname: updated.nickname,
    phone: updated.phone,
    email: updated.email,
    profileImageUrl: updated.profile_image,
    bio: updated.bio,
    role: updated.role,
    requiresLogin: Boolean(data.newPassword),
  };
}

/**
 * 1. editToken을 검증한다.
 * 2. DB transaction으로 거래·상품·입찰·사용자 상태를 정리한다.
 * 3. commit 후 session, Timer, Redis 경매 cache를 정리한다.
 */
export async function withdrawMyAccount(userIdx, body) {
  verifyEditToken(validateWithdrawal(body), userIdx);
  const result = await withdrawUserCascade(userIdx);
  if (!result) {
    throw new AppError({
      status: 404,
      code: "USER_NOT_FOUND",
      message: "사용자를 찾을 수 없습니다.",
    });
  }
  await deleteAllRefreshSessions(userIdx);

  for (const listingIdx of result.ownedAuctionIdxs) cancelAuctionEnd(listingIdx);
  try {
    const redis = getRedisClient();
    const keys = [...new Set([...result.ownedAuctionIdxs, ...result.affectedAuctionIdxs])]
      .flatMap((listingIdx) => [
        `auction:${listingIdx}:state`,
        `auction:${listingIdx}:bidders`,
      ]);
    if (keys.length > 0) await redis.del(keys);
  } catch (error) {
    log.warn("탈퇴 사용자의 경매 Redis 상태 정리에 실패했습니다.", { error, userIdx });
  }

  return { withdrawn: true, ...result };
}
