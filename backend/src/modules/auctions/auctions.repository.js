import { query, withTransaction } from "../../infrastructure/database/database.js";

const SORT_SQL = {
  LATEST: "l.created_at DESC",
  ENDING_SOON: "ap.ends_at ASC",
  PRICE_ASC: "ap.current_price ASC, l.created_at DESC",
  PRICE_DESC: "ap.current_price DESC, l.created_at DESC",
};

/** 검색 조건에 맞는 경매 목록과 전체 개수를 조회한다. */
export async function findAuctions({ q, categoryIdx, status, sort, limit, offset }) {
  const values = [`%${q}%`, categoryIdx, status, limit, offset];
  const where = `l.deleted_at IS NULL AND l.listing_type = 'AUCTION'
    AND ($1 = '%%' OR l.title ILIKE $1 OR l.description ILIKE $1)
    AND ($2::bigint IS NULL OR l.category_idx = $2)
    AND ($3::auction_status IS NULL OR ap.status = $3)`;
  const [items, count] = await Promise.all([
    query(
      `SELECT l.idx, l.title, l.created_at, c.idx AS category_idx, c.name AS category_name,
              ap.start_price, ap.current_price, ap.status, ap.started_at, ap.ends_at,
              (SELECT pi.image_url FROM post_images pi WHERE pi.listing_idx = l.idx ORDER BY pi.sort_order LIMIT 1) AS thumbnail_url,
              (SELECT COUNT(*)::int FROM auction_bids ab WHERE ab.listing_idx = l.idx) AS bid_count,
              (SELECT COUNT(*)::int FROM favorites f WHERE f.listing_idx = l.idx) AS favorite_count
         FROM listings l
         JOIN auction_posts ap ON ap.listing_idx = l.idx
         JOIN categories c ON c.idx = l.category_idx
        WHERE ${where}
        ORDER BY ${SORT_SQL[sort]}
        LIMIT $4 OFFSET $5`,
      values,
    ),
    query(
      `SELECT COUNT(*)::int AS total_count
         FROM listings l
         JOIN auction_posts ap ON ap.listing_idx = l.idx
        WHERE ${where}`,
      values.slice(0, 3),
    ),
  ]);
  return { rows: items.rows, totalCount: count.rows[0].total_count };
}

/** 경매 상세 정보와 집계값을 조회한다. */
export async function findAuctionDetail(listingIdx) {
  const result = await query(
    `SELECT l.idx, l.seller_idx, l.title, l.description, l.preferred_trade_location,
            l.product_status, l.view_count, l.created_at, c.idx AS category_idx,
            c.name AS category_name, ap.start_price, ap.current_price, ap.bid_unit,
            ap.started_at, ap.ends_at, ap.status, u.nickname AS seller_nickname,
            u.profile_image AS seller_profile_image,
            winner.bidder_idx AS highest_bidder_idx, winner.nickname AS highest_bidder_nickname,
            (SELECT COUNT(*)::int FROM auction_bids ab WHERE ab.listing_idx = l.idx) AS bid_count,
            (SELECT COUNT(*)::int FROM favorites f WHERE f.listing_idx = l.idx) AS favorite_count
       FROM listings l
       JOIN auction_posts ap ON ap.listing_idx = l.idx
       JOIN categories c ON c.idx = l.category_idx
       JOIN users u ON u.idx = l.seller_idx
       LEFT JOIN LATERAL (
         SELECT ab.bidder_idx, bu.nickname
           FROM auction_bids ab JOIN users bu ON bu.idx = ab.bidder_idx
          WHERE ab.listing_idx = l.idx
          ORDER BY ab.bid_price DESC, ab.created_at ASC LIMIT 1
       ) winner ON TRUE
      WHERE l.idx = $1 AND l.listing_type = 'AUCTION' AND l.deleted_at IS NULL`,
    [listingIdx],
  );
  if (!result.rows[0]) return null;
  const images = await query("SELECT idx, image_url, sort_order FROM post_images WHERE listing_idx = $1 ORDER BY sort_order", [listingIdx]);
  return { ...result.rows[0], images: images.rows };
}

/** 상세 조회수를 1 증가시킨다. */
export async function increaseAuctionViewCount(listingIdx) {
  await query("UPDATE listings SET view_count = view_count + 1 WHERE idx = $1", [listingIdx]);
}

/** listings·auction_posts·post_images를 한 트랜잭션으로 생성한다. */
export async function insertAuction({ sellerIdx, title, description, categoryIdx, productStatus, startPrice, preferredTradeLocation, imageUrls, startedAt, endsAt, bidUnit }) {
  return withTransaction(async (client) => {
    const listing = await client.query(
      `INSERT INTO listings (seller_idx, category_idx, listing_type, title, description, preferred_trade_location, product_status)
       VALUES ($1, $2, 'AUCTION', $3, $4, $5, $6)
       RETURNING idx`,
      [sellerIdx, categoryIdx, title, description, preferredTradeLocation, productStatus],
    );
    const listingIdx = listing.rows[0].idx;
    await client.query(
      `INSERT INTO auction_posts (listing_idx, start_price, current_price, bid_unit, started_at, ends_at)
       VALUES ($1, $2, $2, $3, $4, $5)`,
      [listingIdx, startPrice, bidUnit, startedAt, endsAt],
    );
    for (const [sortOrder, imageUrl] of imageUrls.entries()) {
      await client.query("INSERT INTO post_images (listing_idx, image_url, sort_order) VALUES ($1, $2, $3)", [listingIdx, imageUrl, sortOrder]);
    }
    return listingIdx;
  });
}

/** 소유자 확인을 위해 삭제되지 않은 경매의 핵심 상태를 조회한다. */
export async function findAuctionForMutation(listingIdx) {
  const result = await query(
    `SELECT l.idx, l.seller_idx, ap.status, ap.ends_at
       FROM listings l JOIN auction_posts ap ON ap.listing_idx = l.idx
      WHERE l.idx = $1 AND l.listing_type = 'AUCTION' AND l.deleted_at IS NULL`,
    [listingIdx],
  );
  return result.rows[0] ?? null;
}

/** 경매의 변경 가능한 상품 정보와 선택적 새 이미지 목록을 저장한다. */
export async function updateAuctionRecord(listingIdx, data, imageUrls) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE listings SET title = $2, description = $3, category_idx = $4,
              product_status = $5, preferred_trade_location = $6, updated_at = NOW()
        WHERE idx = $1 RETURNING updated_at`,
      [listingIdx, data.title, data.description, data.categoryIdx, data.productStatus, data.preferredTradeLocation],
    );
    if (imageUrls.length) {
      await client.query("DELETE FROM post_images WHERE listing_idx = $1", [listingIdx]);
      for (const [sortOrder, imageUrl] of imageUrls.entries()) {
        await client.query("INSERT INTO post_images (listing_idx, image_url, sort_order) VALUES ($1, $2, $3)", [listingIdx, imageUrl, sortOrder]);
      }
    }
    return result.rows[0].updated_at;
  });
}

/** 경매를 논리 삭제하고 관심 등록을 제거한다. */
export async function softDeleteAuction(listingIdx, deletedBy, deleteReason) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE listings SET deleted_at = NOW(), deleted_by = $2, delete_reason = $3, updated_at = NOW()
        WHERE idx = $1 AND deleted_at IS NULL RETURNING deleted_at`,
      [listingIdx, deletedBy, deleteReason],
    );
    await client.query("DELETE FROM favorites WHERE listing_idx = $1", [listingIdx]);
    return result.rows[0]?.deleted_at ?? null;
  });
}

/** 타이머가 만료된 경매를 종료 상태로 변경한다. */
export async function finishAuction(listingIdx) {
  await query("UPDATE auction_posts SET status = 'FINISHED' WHERE listing_idx = $1 AND status = 'ON_GOING'", [listingIdx]);
}
