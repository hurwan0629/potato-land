import { query, withTransaction } from "../../infrastructure/database/database.js";

export async function findEditableUser(userIdx) {
  const result = await query(
    `SELECT idx, login_id, password_hash, name, nickname, phone, email,
            profile_image, bio, role, deleted_at, banned_at
       FROM users WHERE idx = $1`,
    [userIdx],
  );
  return result.rows[0] ?? null;
}

export async function findProfileConflict(userIdx, { nickname, phone, email }) {
  const result = await query(
    `SELECT CASE
       WHEN nickname = $2 THEN 'nickname'
       WHEN phone = $3 THEN 'phone'
       WHEN $4::text IS NOT NULL AND email = $4 THEN 'email'
     END AS field
       FROM users
      WHERE idx <> $1 AND deleted_at IS NULL
        AND (nickname = $2 OR phone = $3 OR ($4::text IS NOT NULL AND email = $4))
      LIMIT 1`,
    [userIdx, nickname, phone, email],
  );
  return result.rows[0]?.field ?? null;
}

export async function updateUserAccount(userIdx, { nickname, phone, email, passwordHash }) {
  const result = await query(
    `UPDATE users
        SET nickname=$2, phone=$3, email=$4,
            password_hash=COALESCE($5, password_hash), updated_at=NOW()
      WHERE idx=$1 AND deleted_at IS NULL
      RETURNING idx, login_id, name, nickname, phone, email, profile_image, bio, role`,
    [userIdx, nickname, phone, email, passwordHash],
  );
  return result.rows[0] ?? null;
}

export async function updatePublicProfile(userIdx, { bio, profileImageUrl }) {
  const result = await query(
    `UPDATE users
        SET bio=$2, profile_image=COALESCE($3, profile_image), updated_at=NOW()
      WHERE idx=$1 AND deleted_at IS NULL
      RETURNING idx, nickname, profile_image, bio, updated_at`,
    [userIdx, bio, profileImageUrl ?? null],
  );
  return result.rows[0] ?? null;
}

export async function findUserProfile(userIdx) {
  const result = await query(
    `SELECT
       u.idx AS "userIdx", u.nickname, u.profile_image AS "profileImageUrl", u.bio,
       (SELECT COUNT(*) FROM transactions t WHERE t.seller_idx=u.idx AND t.status='COMPLETED')::int AS "sellCount",
       (SELECT COUNT(*) FROM transactions t WHERE t.buyer_idx=u.idx AND t.status='COMPLETED')::int AS "buyCount",
       COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_idx=u.idx), 0) AS "averageRating",
       (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_idx=u.idx)::int AS "reviewCount"
     FROM users u
     WHERE u.idx=$1 AND u.deleted_at IS NULL AND u.banned_at IS NULL`,
    [userIdx],
  );
  return result.rows[0] ?? null;
}

export async function findMyAccountSummary(userIdx) {
  const result = await query(
    `SELECT
       u.idx, u.login_id, u.name, u.nickname, u.phone, u.email, u.profile_image, u.bio, u.role,
       (SELECT COUNT(*) FROM transactions t WHERE t.seller_idx=u.idx AND t.status='COMPLETED')::int AS sell_count,
       (SELECT COUNT(*) FROM transactions t WHERE t.buyer_idx=u.idx AND t.status='COMPLETED')::int AS buy_count,
       COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_idx=u.idx), 0) AS average_rating,
       (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_idx=u.idx)::int AS review_count
     FROM users u WHERE u.idx=$1 AND u.deleted_at IS NULL`,
    [userIdx],
  );
  return result.rows[0] ?? null;
}

/**
 * 탈퇴에 필요한 DB 상태를 한 transaction에서 정리한다.
 * 외부 Redis·Timer·Socket 정리는 commit 이후 Service가 수행한다.
 */
export async function withdrawUserCascade(userIdx) {
  return withTransaction(async (client) => {
    const userResult = await client.query("SELECT idx FROM users WHERE idx=$1 AND deleted_at IS NULL FOR UPDATE", [userIdx]);
    if (!userResult.rows[0]) return null;

    const requestedTransactions = await client.query(
      `UPDATE transactions SET status='CANCELED', canceled_by=$1, updated_at=NOW()
        WHERE (seller_idx=$1 OR buyer_idx=$1) AND status='REQUESTED'
        RETURNING idx, seller_idx, buyer_idx`,
      [userIdx],
    );
    for (const transaction of requestedTransactions.rows) {
      const receiverIdx = Number(transaction.seller_idx) === Number(userIdx) ? transaction.buyer_idx : transaction.seller_idx;
      await client.query(
        `INSERT INTO notifications (receiver_idx, notification_type, reference_type, reference_idx, content)
         VALUES ($1, 'PAYMENT_CANCELED', 'TRANSACTION', $2, '거래 상대방의 탈퇴로 거래가 취소되었습니다.')`,
        [receiverIdx, transaction.idx],
      );
    }

    const ownedAuctions = await client.query(
      `SELECT ap.listing_idx FROM auction_posts ap
       JOIN listings l ON l.idx=ap.listing_idx
       WHERE l.seller_idx=$1 AND l.deleted_at IS NULL AND ap.status='ON_GOING'`,
      [userIdx],
    );

    const deletedListings = await client.query(
      `UPDATE listings SET deleted_at=NOW(), deleted_by=$1,
              delete_reason='회원 탈퇴로 인한 자동 삭제', updated_at=NOW()
        WHERE seller_idx=$1 AND deleted_at IS NULL RETURNING idx`,
      [userIdx],
    );
    const deletedListingIdxs = deletedListings.rows.map((row) => row.idx);
    if (deletedListingIdxs.length > 0) {
      await client.query("DELETE FROM favorites WHERE listing_idx=ANY($1::bigint[])", [deletedListingIdxs]);
    }

    const affectedAuctions = await client.query(
      `SELECT DISTINCT ap.listing_idx, ap.start_price
       FROM auction_posts ap
       JOIN auction_bids ab ON ab.listing_idx=ap.listing_idx
       JOIN listings l ON l.idx=ap.listing_idx
       WHERE ab.bidder_idx=$1 AND ap.status='ON_GOING' AND l.deleted_at IS NULL`,
      [userIdx],
    );
    await client.query(
      `DELETE FROM auction_bids ab USING auction_posts ap
       WHERE ab.listing_idx=ap.listing_idx AND ab.bidder_idx=$1 AND ap.status='ON_GOING'`,
      [userIdx],
    );
    for (const auction of affectedAuctions.rows) {
      const nextBid = await client.query(
        `SELECT idx, bid_price FROM auction_bids
         WHERE listing_idx=$1 ORDER BY bid_price DESC, created_at ASC LIMIT 1`,
        [auction.listing_idx],
      );
      await client.query(
        `UPDATE auction_posts SET current_price=$2, winning_bid_idx=NULL WHERE listing_idx=$1`,
        [auction.listing_idx, nextBid.rows[0]?.bid_price ?? auction.start_price],
      );
    }

    await client.query("DELETE FROM favorites WHERE user_idx=$1", [userIdx]);
    await client.query("UPDATE users SET deleted_at=NOW(), updated_at=NOW() WHERE idx=$1", [userIdx]);

    return {
      ownedAuctionIdxs: ownedAuctions.rows.map((row) => Number(row.listing_idx)),
      affectedAuctionIdxs: affectedAuctions.rows.map((row) => Number(row.listing_idx)),
      canceledTransactionCount: requestedTransactions.rowCount,
      deletedListingCount: deletedListings.rowCount,
    };
  });
}
