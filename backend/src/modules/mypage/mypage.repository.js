import { query } from "../../infrastructure/database/database.js";

const TYPE_FILTER = `($2 = 'ALL' OR l.listing_type::text = $2)`;
const STATUS_FILTER = `($3::text IS NULL OR
  (l.listing_type = 'USED' AND up.trade_status::text = $3) OR
  (l.listing_type = 'AUCTION' AND ap.status::text = $3))`;

function listingSelect() {
  return `SELECT l.idx AS "listingIdx", l.listing_type AS "listingType", l.title,
                 pi.image_url AS "thumbnailUrl",
                 CASE WHEN l.listing_type='USED' THEN up.price ELSE ap.current_price END AS "displayPrice",
                 CASE WHEN l.listing_type='USED' THEN up.trade_status::text ELSE ap.status::text END AS status,
                 l.created_at AS "createdAt", ap.ends_at AS "endsAt"`;
}

export async function findListingsBySeller({ sellerIdx, type, status, limit, offset }) {
  const values = [sellerIdx, type, status, limit, offset];
  const joins = `FROM listings l
    LEFT JOIN used_posts up ON up.listing_idx=l.idx
    LEFT JOIN auction_posts ap ON ap.listing_idx=l.idx
    LEFT JOIN post_images pi ON pi.listing_idx=l.idx AND pi.sort_order=0`;
  const where = `l.seller_idx=$1 AND l.deleted_at IS NULL AND ${TYPE_FILTER} AND ${STATUS_FILTER}`;
  const [items, count] = await Promise.all([
    query(`${listingSelect()} ${joins} WHERE ${where} ORDER BY l.created_at DESC LIMIT $4 OFFSET $5`, values),
    query(`SELECT COUNT(*)::int AS count ${joins} WHERE ${where}`, values.slice(0, 3)),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findFavoritesByUser({ userIdx, type, status, limit, offset }) {
  const values = [userIdx, type, status, limit, offset];
  const joins = `FROM favorites f
    JOIN listings l ON l.idx=f.listing_idx
    LEFT JOIN used_posts up ON up.listing_idx=l.idx
    LEFT JOIN auction_posts ap ON ap.listing_idx=l.idx
    LEFT JOIN post_images pi ON pi.listing_idx=l.idx AND pi.sort_order=0`;
  const where = `f.user_idx=$1 AND l.deleted_at IS NULL AND ${TYPE_FILTER} AND ${STATUS_FILTER}`;
  const [items, count] = await Promise.all([
    query(`${listingSelect()}, f.created_at AS "favoritedAt" ${joins} WHERE ${where} ORDER BY f.created_at DESC LIMIT $4 OFFSET $5`, values),
    query(`SELECT COUNT(*)::int AS count ${joins} WHERE ${where}`, values.slice(0, 3)),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findHistoryByUser({ userIdx, type, status, q, limit, offset }) {
  const values = [userIdx, type, status, q ? `%${q}%` : null, limit, offset];
  const cte = `WITH history AS (
    SELECT t.idx AS "transactionIdx", l.idx AS "listingIdx", l.listing_type::text AS "listingType",
           l.title, pi.image_url AS "thumbnailUrl",
           CASE WHEN t.buyer_idx=$1 THEN 'BUY' ELSE 'SELL' END AS "tradeRole",
           t.status::text AS status, t.amount, COALESCE(t.completed_at,t.created_at) AS "displayDate",
           NULL::timestamptz AS "endsAt",
           CASE WHEN t.buyer_idx=$1 THEN t.seller_idx ELSE t.buyer_idx END AS "counterpartIdx",
           counterpart.nickname AS "counterpartNickname",
           (t.status='COMPLETED' AND NOT EXISTS (
             SELECT 1 FROM reviews r WHERE r.transaction_idx=t.idx AND r.reviewer_idx=$1
           )) AS "canWriteReview"
      FROM transactions t
      JOIN listings l ON l.idx=t.listing_idx
      JOIN users counterpart ON counterpart.idx=CASE WHEN t.buyer_idx=$1 THEN t.seller_idx ELSE t.buyer_idx END
      LEFT JOIN post_images pi ON pi.listing_idx=l.idx AND pi.sort_order=0
     WHERE t.buyer_idx=$1 OR t.seller_idx=$1
    UNION ALL
    SELECT NULL::bigint, l.idx, 'AUCTION', l.title, pi.image_url, 'AUCTION_BID',
           ap.status::text, ap.current_price, ap.ends_at, ap.ends_at,
           l.seller_idx, seller.nickname, FALSE
      FROM auction_posts ap
      JOIN listings l ON l.idx=ap.listing_idx
      JOIN users seller ON seller.idx=l.seller_idx
      LEFT JOIN post_images pi ON pi.listing_idx=l.idx AND pi.sort_order=0
     WHERE ap.status='ON_GOING' AND l.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM auction_bids ab WHERE ab.listing_idx=l.idx AND ab.bidder_idx=$1)
       AND NOT EXISTS (SELECT 1 FROM transactions tx WHERE tx.listing_idx=l.idx AND (tx.buyer_idx=$1 OR tx.seller_idx=$1))
  )`;
  const where = `WHERE ($2='ALL' OR "tradeRole"=$2)
    AND ($3::text IS NULL OR status=$3)
    AND ($4::text IS NULL OR title ILIKE $4)`;
  const [items, count] = await Promise.all([
    query(`${cte} SELECT * FROM history ${where} ORDER BY "displayDate" DESC, "listingIdx" DESC LIMIT $5 OFFSET $6`, values),
    query(`${cte} SELECT COUNT(*)::int AS count FROM history ${where}`, values.slice(0, 4)),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}

export async function findReviewsRelatedToUser({ userIdx, direction, type, limit, offset }) {
  const relation = direction === "WRITTEN" ? "r.reviewer_idx=$1" : "r.reviewee_idx=$1";
  const roleExpression = `CASE WHEN t.buyer_idx=r.reviewer_idx THEN 'BUYER_REVIEW' ELSE 'SELLER_REVIEW' END`;
  const where = `${relation} AND ($2='ALL' OR ${roleExpression}=$2)`;
  const values = [userIdx, type, limit, offset];
  const base = `FROM reviews r
    JOIN transactions t ON t.idx=r.transaction_idx
    JOIN listings l ON l.idx=t.listing_idx
    JOIN users reviewer ON reviewer.idx=r.reviewer_idx
    JOIN users reviewee ON reviewee.idx=r.reviewee_idx`;
  const [items, count] = await Promise.all([
    query(
      `SELECT r.idx AS "reviewIdx", r.transaction_idx AS "transactionIdx", r.rating, r.content,
              r.reviewer_idx AS "reviewerIdx", reviewer.nickname AS "reviewerNickname",
              r.reviewee_idx AS "revieweeIdx", reviewee.nickname AS "revieweeNickname",
              l.idx AS "listingIdx", l.title AS "listingTitle", ${roleExpression} AS "reviewType",
              r.created_at AS "createdAt"
         ${base} WHERE ${where}
        ORDER BY r.created_at DESC LIMIT $3 OFFSET $4`,
      values,
    ),
    query(`SELECT COUNT(*)::int AS count ${base} WHERE ${where}`, values.slice(0, 2)),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].count };
}
