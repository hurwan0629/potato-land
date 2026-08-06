import { query, withTransaction } from "../../infrastructure/database/database.js";

const SORT_SQL = {
  LATEST: "l.created_at DESC",
  POPULAR: '"favoriteCount" DESC, l.created_at DESC',
  PRICE_ASC: "up.price ASC, l.created_at DESC",
  PRICE_DESC: "up.price DESC, l.created_at DESC",
};

const SUMMARY_SELECT = `
  SELECT
    l.idx AS "listingIdx",
    l.title,
    l.created_at AS "createdAt",
    c.idx AS "categoryIdx",
    c.name AS "categoryName",
    up.price,
    up.trade_status::text AS "tradeStatus",
    (SELECT pi.image_url FROM post_images pi WHERE pi.listing_idx = l.idx ORDER BY pi.sort_order LIMIT 1) AS "thumbnailUrl",
    (SELECT COUNT(*) FROM favorites f WHERE f.listing_idx = l.idx)::int AS "favoriteCount",
    EXISTS(SELECT 1 FROM favorites f WHERE f.listing_idx = l.idx AND f.user_idx = $6) AS "isFavorite"
  FROM listings l
  JOIN used_posts up ON up.listing_idx = l.idx
  JOIN categories c ON c.idx = l.category_idx
`;

export async function findUsedListings({ q, categoryIdx, status, sort, limit, offset }, viewerUserIdx) {
  const values = [`%${q}%`, categoryIdx, status, limit, offset, viewerUserIdx];
  const where = `l.deleted_at IS NULL AND l.listing_type = 'USED'
    AND ($1 = '%%' OR l.title ILIKE $1 OR l.description ILIKE $1)
    AND ($2::bigint IS NULL OR l.category_idx = $2)
    AND ($3::used_trade_status IS NULL OR up.trade_status = $3)`;
  const [items, count] = await Promise.all([
    query(`${SUMMARY_SELECT} WHERE ${where} ORDER BY ${SORT_SQL[sort]} LIMIT $4 OFFSET $5`, values),
    query(`SELECT COUNT(*)::int AS "totalCount" FROM listings l JOIN used_posts up ON up.listing_idx = l.idx WHERE ${where}`, values.slice(0, 3)),
  ]);
  return { rows: items.rows, totalCount: Number(count.rows[0].totalCount) };
}

export async function insertUsedListing({ sellerIdx, title, description, categoryIdx, productStatus, price, preferredTradeLocation, imageUrls }) {
  return withTransaction(async (client) => {
    const listing = await client.query(
      `INSERT INTO listings (seller_idx, category_idx, listing_type, title, description, preferred_trade_location, product_status)
       VALUES ($1, $2, 'USED', $3, $4, $5, $6) RETURNING idx, created_at`,
      [sellerIdx, categoryIdx, title, description, preferredTradeLocation, productStatus],
    );
    const listingIdx = listing.rows[0].idx;
    await client.query("INSERT INTO used_posts (listing_idx, price, trade_status) VALUES ($1, $2, 'ON_SALE')", [listingIdx, price]);
    for (const [sortOrder, imageUrl] of imageUrls.entries()) {
      await client.query("INSERT INTO post_images (listing_idx, image_url, sort_order) VALUES ($1, $2, $3)", [listingIdx, imageUrl, sortOrder]);
    }
    return listing.rows[0];
  });
}

export async function findUsedDetail(listingIdx, viewerUserIdx) {
  const result = await query(
    `SELECT
       l.idx, l.seller_idx, l.title, l.description, l.preferred_trade_location, l.product_status,
       l.view_count, l.created_at, l.updated_at, c.idx AS category_idx, c.name AS category_name,
       up.price, up.trade_status, u.nickname AS seller_nickname, u.profile_image AS seller_profile_image,
       (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.reviewee_idx = u.idx) AS seller_average_rating,
       (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_idx = u.idx)::int AS seller_review_count,
       (SELECT COUNT(*) FROM favorites f WHERE f.listing_idx = l.idx)::int AS favorite_count,
       EXISTS(SELECT 1 FROM favorites f WHERE f.listing_idx = l.idx AND f.user_idx = $2) AS is_favorite
     FROM listings l
     JOIN used_posts up ON up.listing_idx = l.idx
     JOIN categories c ON c.idx = l.category_idx
     JOIN users u ON u.idx = l.seller_idx
     WHERE l.idx = $1 AND l.listing_type = 'USED' AND l.deleted_at IS NULL`,
    [listingIdx, viewerUserIdx],
  );
  if (!result.rows[0]) return null;
  const images = await query("SELECT idx, image_url, sort_order FROM post_images WHERE listing_idx = $1 ORDER BY sort_order", [listingIdx]);
  return { ...result.rows[0], images: images.rows };
}

export async function increaseViewCount(listingIdx) {
  await query("UPDATE listings SET view_count = view_count + 1 WHERE idx = $1", [listingIdx]);
}

export async function findUsedForMutation(listingIdx, client = null) {
  const executor = client ?? { query };
  const result = await executor.query(
    `SELECT l.idx, l.seller_idx, up.trade_status
       FROM listings l JOIN used_posts up ON up.listing_idx = l.idx
      WHERE l.idx = $1 AND l.listing_type = 'USED' AND l.deleted_at IS NULL`,
    [listingIdx],
  );
  return result.rows[0] ?? null;
}

export async function updateUsedRecord(listingIdx, data, imageUrls) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE listings
          SET title=$2, description=$3, category_idx=$4, product_status=$5,
              preferred_trade_location=$6, updated_at=NOW()
        WHERE idx=$1 RETURNING updated_at`,
      [listingIdx, data.title, data.description, data.categoryIdx, data.productStatus, data.preferredTradeLocation],
    );
    await client.query("UPDATE used_posts SET price=$2 WHERE listing_idx=$1", [listingIdx, data.price]);
    if (imageUrls.length > 0) {
      await client.query("DELETE FROM post_images WHERE listing_idx=$1", [listingIdx]);
      for (const [sortOrder, imageUrl] of imageUrls.entries()) {
        await client.query("INSERT INTO post_images (listing_idx, image_url, sort_order) VALUES ($1,$2,$3)", [listingIdx, imageUrl, sortOrder]);
      }
    }
    return result.rows[0].updated_at;
  });
}

export async function softDeleteUsed(listingIdx, userIdx, deleteReason) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE listings SET deleted_at=NOW(), deleted_by=$2, delete_reason=$3, updated_at=NOW()
        WHERE idx=$1 AND deleted_at IS NULL RETURNING deleted_at`,
      [listingIdx, userIdx, deleteReason],
    );
    await client.query("DELETE FROM favorites WHERE listing_idx=$1", [listingIdx]);
    return result.rows[0]?.deleted_at ?? null;
  });
}

export async function addFavoriteRow(userIdx, listingIdx) {
  await query("INSERT INTO favorites (user_idx, listing_idx) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userIdx, listingIdx]);
  return countFavorites(listingIdx);
}

export async function removeFavoriteRow(userIdx, listingIdx) {
  await query("DELETE FROM favorites WHERE user_idx=$1 AND listing_idx=$2", [userIdx, listingIdx]);
  return countFavorites(listingIdx);
}

async function countFavorites(listingIdx) {
  const result = await query("SELECT COUNT(*)::int AS count FROM favorites WHERE listing_idx=$1", [listingIdx]);
  return Number(result.rows[0].count);
}
