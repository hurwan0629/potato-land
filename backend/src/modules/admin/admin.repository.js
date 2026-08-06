import { query, withTransaction } from "../../infrastructure/database/database.js";

export async function findDashboard({ from, to, interval }) {
  const unit = interval === "HOUR" ? "hour" : "day";
  const [users, listings, transactions, listingSeries, transactionSeries] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL AND banned_at IS NULL"),
    query("SELECT COUNT(*)::int AS count FROM listings WHERE deleted_at IS NULL"),
    query("SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::bigint AS amount FROM transactions WHERE status='COMPLETED'"),
    query(`SELECT date_trunc($1,created_at) AS period, COUNT(*)::int AS count FROM listings WHERE created_at >= $2 AND created_at < $3 GROUP BY period ORDER BY period`, [unit, from, to]),
    query(`SELECT date_trunc($1,completed_at) AS period, COUNT(*)::int AS count FROM transactions WHERE status='COMPLETED' AND completed_at >= $2 AND completed_at < $3 GROUP BY period ORDER BY period`, [unit, from, to]),
  ]);
  return {
    activeUserCount: users.rows[0].count,
    totalListingCount: listings.rows[0].count,
    completedTransactionCount: transactions.rows[0].count,
    totalCompletedAmount: Number(transactions.rows[0].amount),
    listingRegistrationCounts: listingSeries.rows,
    completedTransactionCounts: transactionSeries.rows,
  };
}

export async function findUsers({ q, status, limit, offset }) {
  const search = q ? `%${q}%` : null;
  const where = `($1::text IS NULL OR u.login_id ILIKE $1 OR u.nickname ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1 OR u.idx::text=$2)
    AND ($3='ALL'
      OR ($3='ACTIVE' AND u.deleted_at IS NULL AND u.banned_at IS NULL)
      OR ($3='BANNED' AND u.deleted_at IS NULL AND u.banned_at IS NOT NULL)
      OR ($3='WITHDRAWN' AND u.deleted_at IS NOT NULL))`;
  const values = [search, q || null, status, limit, offset];
  const [items, count] = await Promise.all([
    query(
      `SELECT u.idx AS "userIdx",u.login_id AS "loginId",u.name,u.nickname,u.profile_image AS "profileImageUrl",u.phone,u.email,
              CASE WHEN u.deleted_at IS NOT NULL THEN 'WITHDRAWN' WHEN u.banned_at IS NOT NULL THEN 'BANNED' ELSE 'ACTIVE' END AS status,
              (SELECT COUNT(*) FROM transactions t WHERE (t.seller_idx=u.idx OR t.buyer_idx=u.idx) AND t.status='COMPLETED')::int AS "tradeCount",
              u.created_at AS "createdAt"
         FROM users u WHERE ${where} ORDER BY u.created_at DESC LIMIT $4 OFFSET $5`, values),
    query(`SELECT COUNT(*)::int AS count FROM users u WHERE ${where}`, values.slice(0, 3)),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findAdminUserDetail(userIdx) {
  const result = await query(
    `SELECT u.idx AS "userIdx",u.login_id AS "loginId",u.name,u.nickname,u.phone,u.email,
            u.profile_image AS "profileImageUrl",u.bio,u.role,u.admin_memo AS "adminMemo",
            u.banned_at AS "bannedAt",u.ban_reason AS "banReason",u.deleted_at AS "deletedAt",u.created_at AS "createdAt",
            (SELECT COUNT(*) FROM transactions t WHERE (t.seller_idx=u.idx OR t.buyer_idx=u.idx) AND t.status='COMPLETED')::int AS "tradeCount",
            (SELECT COUNT(*) FROM listings l WHERE l.seller_idx=u.idx)::int AS "listingCount",
            (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_idx=u.idx)::int AS "receivedReviewCount",
            COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_idx=u.idx),0) AS "averageRating"
       FROM users u WHERE u.idx=$1`, [userIdx]);
  return result.rows[0] ?? null;
}

export async function updateAdminMemo(userIdx, memo) {
  const result = await query("UPDATE users SET admin_memo=$2,updated_at=NOW() WHERE idx=$1 RETURNING idx,admin_memo,updated_at", [userIdx, memo]);
  return result.rows[0] ?? null;
}

export async function findAdminListings({ listingType, q, limit, offset }) {
  const search = q ? `%${q}%` : null;
  const values = [listingType, search, q || null, limit, offset];
  const where = `l.listing_type=$1::listing_type
    AND ($2::text IS NULL OR l.title ILIKE $2 OR seller.login_id ILIKE $2 OR l.idx::text=$3)`;
  const [items, count] = await Promise.all([
    query(
      `SELECT l.idx AS "listingIdx",l.listing_type AS "listingType",l.title,l.deleted_at AS "deletedAt",
              seller.idx AS "sellerIdx",seller.login_id AS "sellerLoginId",seller.nickname AS "sellerNickname",
              pi.image_url AS "thumbnailUrl",l.created_at AS "createdAt",
              up.price,up.trade_status AS "tradeStatus",ap.current_price AS "currentPrice",ap.status AS "auctionStatus",ap.ends_at AS "endsAt",
              winner.bidder_idx AS "winnerIdx",winner.nickname AS "winnerNickname"
         FROM listings l JOIN users seller ON seller.idx=l.seller_idx
         LEFT JOIN used_posts up ON up.listing_idx=l.idx
         LEFT JOIN auction_posts ap ON ap.listing_idx=l.idx
         LEFT JOIN post_images pi ON pi.listing_idx=l.idx AND pi.sort_order=0
         LEFT JOIN LATERAL (SELECT ab.bidder_idx,u.nickname FROM auction_bids ab JOIN users u ON u.idx=ab.bidder_idx WHERE ab.idx=ap.winning_bid_idx) winner ON TRUE
        WHERE ${where} ORDER BY l.created_at DESC LIMIT $4 OFFSET $5`, values),
    query(`SELECT COUNT(*)::int AS count FROM listings l JOIN users seller ON seller.idx=l.seller_idx WHERE ${where}`, values.slice(0,3)),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findAuctionWinners({ limit, offset }) {
  const [items, count] = await Promise.all([
    query(
      `SELECT l.idx AS "listingIdx",l.title,l.seller_idx AS "sellerIdx",seller.nickname AS "sellerNickname",
              ab.bidder_idx AS "winnerIdx",winner.nickname AS "winnerNickname",ab.bid_price AS "winningPrice",
              ap.ends_at AS "endedAt"
         FROM auction_posts ap JOIN listings l ON l.idx=ap.listing_idx
         JOIN users seller ON seller.idx=l.seller_idx
         JOIN auction_bids ab ON ab.idx=ap.winning_bid_idx
         JOIN users winner ON winner.idx=ab.bidder_idx
        WHERE ap.status='FINISHED' ORDER BY ap.ends_at DESC LIMIT $1 OFFSET $2`, [limit,offset]),
    query("SELECT COUNT(*)::int AS count FROM auction_posts WHERE status='FINISHED' AND winning_bid_idx IS NOT NULL"),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findUserTransactions(userIdx, { limit, offset }) {
  const [items, count] = await Promise.all([
    query(`SELECT t.idx AS "transactionIdx",t.listing_idx AS "listingIdx",l.title,l.listing_type AS "listingType",
                  CASE WHEN t.seller_idx=$1 THEN 'SELL' ELSE 'BUY' END AS "tradeRole",t.amount,t.status,t.created_at AS "createdAt",t.completed_at AS "completedAt"
             FROM transactions t JOIN listings l ON l.idx=t.listing_idx
            WHERE t.seller_idx=$1 OR t.buyer_idx=$1 ORDER BY t.created_at DESC LIMIT $2 OFFSET $3`, [userIdx,limit,offset]),
    query("SELECT COUNT(*)::int AS count FROM transactions WHERE seller_idx=$1 OR buyer_idx=$1", [userIdx]),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findUserReviewActivity(userIdx, { limit, offset }) {
  const [items, count] = await Promise.all([
    query(`SELECT r.idx AS "reviewIdx",r.transaction_idx AS "transactionIdx",r.reviewer_idx AS "reviewerIdx",reviewer.nickname AS "reviewerNickname",
                  r.reviewee_idx AS "revieweeIdx",reviewee.nickname AS "revieweeNickname",r.rating,r.content,r.created_at AS "createdAt"
             FROM reviews r JOIN users reviewer ON reviewer.idx=r.reviewer_idx JOIN users reviewee ON reviewee.idx=r.reviewee_idx
            WHERE r.reviewer_idx=$1 OR r.reviewee_idx=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`, [userIdx,limit,offset]),
    query("SELECT COUNT(*)::int AS count FROM reviews WHERE reviewer_idx=$1 OR reviewee_idx=$1", [userIdx]),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

/** 사용자 영구정지와 DB 연쇄 정리를 한 transaction에서 수행한다. */
export async function banUserCascade(userIdx, reason) {
  return withTransaction(async (client) => {
    const targetResult = await client.query("SELECT idx,banned_at,deleted_at FROM users WHERE idx=$1 FOR UPDATE", [userIdx]);
    const target = targetResult.rows[0];
    if (!target) return { failure: "NOT_FOUND" };
    if (target.deleted_at) return { failure: "WITHDRAWN" };
    if (target.banned_at) return { failure: "ALREADY_BANNED" };

    const canceled = await client.query(
      `UPDATE transactions SET status='CANCELED',canceled_by=$1,updated_at=NOW()
        WHERE (seller_idx=$1 OR buyer_idx=$1) AND status='REQUESTED'
        RETURNING idx,seller_idx,buyer_idx`, [userIdx]);
    for (const tx of canceled.rows) {
      const receiverIdx = Number(tx.seller_idx) === Number(userIdx) ? tx.buyer_idx : tx.seller_idx;
      await client.query(`INSERT INTO notifications(receiver_idx,notification_type,reference_type,reference_idx,content)
        VALUES($1,'PAYMENT_CANCELED','TRANSACTION',$2,'거래 상대방의 계정 정지로 거래가 취소되었습니다.')`, [receiverIdx,tx.idx]);
    }

    const ownedAuctions = await client.query(`SELECT ap.listing_idx FROM auction_posts ap JOIN listings l ON l.idx=ap.listing_idx WHERE l.seller_idx=$1 AND l.deleted_at IS NULL AND ap.status='ON_GOING'`, [userIdx]);
    const deleted = await client.query(`UPDATE listings SET deleted_at=NOW(),deleted_by=$1,delete_reason='회원 영구정지로 인한 자동 삭제',updated_at=NOW() WHERE seller_idx=$1 AND deleted_at IS NULL RETURNING idx`, [userIdx]);
    const deletedIds = deleted.rows.map((row)=>row.idx);
    if (deletedIds.length) await client.query("DELETE FROM favorites WHERE listing_idx=ANY($1::bigint[])", [deletedIds]);

    const affected = await client.query(`SELECT DISTINCT ap.listing_idx,ap.start_price FROM auction_posts ap JOIN auction_bids ab ON ab.listing_idx=ap.listing_idx JOIN listings l ON l.idx=ap.listing_idx WHERE ab.bidder_idx=$1 AND ap.status='ON_GOING' AND l.deleted_at IS NULL`, [userIdx]);
    await client.query(`DELETE FROM auction_bids ab USING auction_posts ap WHERE ab.listing_idx=ap.listing_idx AND ab.bidder_idx=$1 AND ap.status='ON_GOING'`, [userIdx]);
    for (const auction of affected.rows) {
      const nextBid = await client.query("SELECT bid_price FROM auction_bids WHERE listing_idx=$1 ORDER BY bid_price DESC,created_at ASC LIMIT 1", [auction.listing_idx]);
      await client.query("UPDATE auction_posts SET current_price=$2,winning_bid_idx=NULL WHERE listing_idx=$1", [auction.listing_idx,nextBid.rows[0]?.bid_price ?? auction.start_price]);
    }

    const banned = await client.query("UPDATE users SET banned_at=NOW(),ban_reason=$2,updated_at=NOW() WHERE idx=$1 RETURNING banned_at", [userIdx,reason]);
    return {
      bannedAt: banned.rows[0].banned_at,
      ownedAuctionIdxs: ownedAuctions.rows.map((row)=>Number(row.listing_idx)),
      affectedAuctionIdxs: affected.rows.map((row)=>Number(row.listing_idx)),
      canceledTransactionCount: canceled.rowCount,
      deletedListingCount: deleted.rowCount,
    };
  });
}
