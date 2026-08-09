import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { cancelAuctionEnd } from "../../schedulers/auctionTimer.js";
import { deleteAllRefreshSessions } from "../auth/auth.redis.js";
import { deleteAuction } from "../auctions/auctions.service.js";
import { deleteUsedListing } from "../used/used.service.js";
import {
  banUserCascade,
  findAdminListings,
  findAdminUserDetail,
  findAuctionWinners,
  findDashboard,
  findUserReviewActivity,
  findUserTransactions,
  findUsers,
  updateAdminMemo,
} from "./admin.repository.js";

const log = logger.child("admin-service");

/** 양의 정수 식별자만 통과시키고 잘못된 값은 검증 오류로 변환한다. */
function positiveInt(value, field) {
  const number = Number(value);

  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "요청 정보를 확인해주세요.",
      details: { field },
    });
  }

  return number;
}

/** 관리자 목록 API의 page, limit, offset 값을 계산한다. */
function paging(query = {}, fallback = 20) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? fallback);

  if (
    !Number.isSafeInteger(page)
    || page <= 0
    || !Number.isSafeInteger(limit)
    || limit < 1
    || limit > 100
  ) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "페이지 조건을 확인해주세요.",
    });
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/** Repository의 rows, totalCount 결과를 공통 페이지 응답 형태로 감싼다. */
function paged(result, pagingState) {
  return {
    items: result.rows,
    page: pagingState.page,
    limit: pagingState.limit,
    totalCount: result.totalCount,
    totalPages: Math.ceil(result.totalCount / pagingState.limit),
  };
}

/** 관리자 대시보드 기간을 검증하고 통계를 조회한다. */
export async function getDashboard(query = {}) {
  const interval = String(query.interval ?? "DAY").toUpperCase();
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);

  if (
    !["DAY", "HOUR"].includes(interval)
    || Number.isNaN(from.getTime())
    || Number.isNaN(to.getTime())
    || from >= to
  ) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "대시보드 기간을 확인해주세요.",
    });
  }

  return findDashboard({ from, to, interval });
}

/** 관리자 회원 목록의 검색·상태·페이지 조건을 검증한다. */
export async function listUsers(query = {}) {
  const pagingState = paging(query, 20);
  const status = String(query.status ?? "ALL").toUpperCase();

  if (!["ALL", "ACTIVE", "BANNED", "WITHDRAWN"].includes(status)) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "회원 상태를 확인해주세요.",
    });
  }

  const result = await findUsers({
    q: String(query.q ?? "").trim(),
    status,
    ...pagingState,
  });

  return paged(result, pagingState);
}

/** 관리자 회원 상세를 조회하고 숫자형 필드를 정규화한다. */
export async function getUser(userIdxValue) {
  const userIdx = positiveInt(userIdxValue, "userIdx");
  const user = await findAdminUserDetail(userIdx);

  if (!user) {
    throw new AppError({
      status: 404,
      code: "NOT_FOUND",
      message: "회원을 찾을 수 없습니다.",
    });
  }

  return {
    ...user,
    averageRating: Number(user.averageRating),
  };
}

/** 관리자 내부 메모 길이를 검증한 뒤 저장한다. */
export async function updateUserMemo(userIdxValue, body = {}) {
  const userIdx = positiveInt(userIdxValue, "userIdx");
  const memo = body.memo == null ? "" : String(body.memo).trim();

  if (memo.length > 1_000) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "관리자 메모는 1000자 이하여야 합니다.",
    });
  }

  const row = await updateAdminMemo(userIdx, memo);
  if (!row) {
    throw new AppError({
      status: 404,
      code: "NOT_FOUND",
      message: "회원을 찾을 수 없습니다.",
    });
  }

  log.info("관리자 회원 메모를 저장했습니다.", {
    userIdx,
    memoLength: memo.length,
  });

  return {
    userIdx,
    adminMemo: row.admin_memo,
    updatedAt: row.updated_at,
  };
}

/** 관리자 게시글 목록의 타입·검색어·페이지 조건을 적용해 조회한다. */
export async function listAdminListings(listingType, query = {}) {
  const pagingState = paging(query, 20);
  const result = await findAdminListings({
    listingType,
    q: String(query.q ?? "").trim(),
    ...pagingState,
  });

  return paged(result, pagingState);
}

/** 종료된 경매 낙찰자 목록을 페이지 단위로 조회한다. */
export async function listWinners(query = {}) {
  const pagingState = paging(query, 20);
  return paged(await findAuctionWinners(pagingState), pagingState);
}

/** 특정 회원의 거래 이력을 페이지 단위로 조회한다. */
export async function listTransactions(userIdxValue, query = {}) {
  const pagingState = paging(query, 20);
  const userIdx = positiveInt(userIdxValue, "userIdx");
  return paged(
    await findUserTransactions(userIdx, pagingState),
    pagingState,
  );
}

/** 특정 회원의 후기 활동 이력을 페이지 단위로 조회한다. */
export async function listReviews(userIdxValue, query = {}) {
  const pagingState = paging(query, 20);
  const userIdx = positiveInt(userIdxValue, "userIdx");
  return paged(
    await findUserReviewActivity(userIdx, pagingState),
    pagingState,
  );
}

/** 관리자 권한으로 중고상품 삭제 서비스를 호출하고 감사 로그를 남긴다. */
export async function deleteUsed(admin, listingIdx, body) {
  const result = await deleteUsedListing(admin, listingIdx, body);
  log.info("관리자가 중고상품을 삭제했습니다.", {
    adminUserIdx: Number(admin.userIdx),
    listingIdx: Number(listingIdx),
  });
  return result;
}

/** 관리자 권한으로 경매 삭제 서비스를 호출하고 감사 로그를 남긴다. */
export async function deleteAuctionForAdmin(admin, listingIdx, body) {
  const result = await deleteAuction(admin, listingIdx, body);
  log.info("관리자가 경매를 삭제했습니다.", {
    adminUserIdx: Number(admin.userIdx),
    listingIdx: Number(listingIdx),
  });
  return result;
}

/**
 * 관리자 본인 정지를 차단하고 DB 연쇄 정리 후 Session, Timer, Redis를 정리한다.
 */
export async function banUser(
  adminUserIdx,
  userIdxValue,
  body = {},
) {
  const userIdx = positiveInt(userIdxValue, "userIdx");

  if (Number(adminUserIdx) === userIdx) {
    throw new AppError({
      status: 409,
      code: "CONFLICT",
      message: "본인 계정은 정지할 수 없습니다.",
    });
  }

  const reason = typeof body.reason === "string"
    ? body.reason.trim()
    : "";

  if (!reason || reason.length > 500) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "정지 사유를 1~500자로 입력해주세요.",
      details: { field: "reason" },
    });
  }

  const result = await banUserCascade(userIdx, reason);
  const failures = {
    NOT_FOUND: [404, "NOT_FOUND", "회원을 찾을 수 없습니다."],
    WITHDRAWN: [409, "CONFLICT", "탈퇴한 회원은 정지할 수 없습니다."],
    ALREADY_BANNED: [409, "CONFLICT", "이미 정지된 회원입니다."],
  };

  if (result.failure) {
    const [status, code, message] = failures[result.failure];
    throw new AppError({ status, code, message });
  }

  await deleteAllRefreshSessions(userIdx);

  for (const listingIdx of result.ownedAuctionIdxs) {
    cancelAuctionEnd(listingIdx);
  }

  try {
    const redis = getRedisClient();
    const affectedAuctionIdxs = [
      ...new Set([
        ...result.ownedAuctionIdxs,
        ...result.affectedAuctionIdxs,
      ]),
    ];
    const keys = affectedAuctionIdxs.flatMap((listingIdx) => [
      `auction:${listingIdx}:state`,
      `auction:${listingIdx}:bidders`,
    ]);

    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    log.warn("정지 사용자의 Redis 상태 정리에 실패했습니다.", {
      error,
      userIdx,
    });
  }

  log.info("회원 영구정지 처리를 완료했습니다.", {
    adminUserIdx: Number(adminUserIdx),
    userIdx,
    canceledTransactionCount: result.canceledTransactionCount,
    deletedListingCount: result.deletedListingCount,
    affectedAuctionCount: result.affectedAuctionIdxs.length,
  });

  return {
    userIdx,
    banned: true,
    ...result,
  };
}
