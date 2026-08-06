import { query } from "../../infrastructure/database/database.js";

const LISTING_SUMMARY_SELECT = `
  SELECT
    l.idx AS "listingIdx",
    l.listing_type AS "listingType",
    l.title,
    c.idx AS "categoryIdx",
    c.name AS "categoryName",
    (SELECT pi.image_url FROM post_images pi WHERE pi.listing_idx = l.idx ORDER BY pi.sort_order LIMIT 1) AS "thumbnailUrl",
    CASE WHEN l.listing_type = 'USED' THEN up.price ELSE ap.current_price END AS "displayPrice",
    CASE WHEN l.listing_type = 'USED' THEN up.trade_status::text ELSE ap.status::text END AS status,
    COALESCE((SELECT COUNT(*) FROM favorites f WHERE f.listing_idx = l.idx), 0)::int AS "favoriteCount",
    l.created_at AS "createdAt",
    ap.ends_at AS "endsAt"
  FROM listings l
  JOIN categories c ON c.idx = l.category_idx
  LEFT JOIN used_posts up ON up.listing_idx = l.idx
  LEFT JOIN auction_posts ap ON ap.listing_idx = l.idx
`;

export async function findMainSections(limit) {
  const [usedPopular, auctionPopular, recentListings, auctionClosingSoon] = await Promise.all([
    query(`${LISTING_SUMMARY_SELECT}
      WHERE l.deleted_at IS NULL AND l.listing_type = 'USED' AND up.trade_status = 'ON_SALE'
      ORDER BY "favoriteCount" DESC, l.created_at DESC LIMIT $1`, [limit]),
    query(`${LISTING_SUMMARY_SELECT}
      WHERE l.deleted_at IS NULL AND l.listing_type = 'AUCTION' AND ap.status = 'ON_GOING' AND ap.ends_at > NOW()
      ORDER BY "favoriteCount" DESC, l.created_at DESC LIMIT $1`, [limit]),
    query(`${LISTING_SUMMARY_SELECT}
      WHERE l.deleted_at IS NULL
        AND ((l.listing_type = 'USED' AND up.trade_status = 'ON_SALE') OR (l.listing_type = 'AUCTION' AND ap.status = 'ON_GOING' AND ap.ends_at > NOW()))
      ORDER BY l.created_at DESC LIMIT $1`, [limit]),
    query(`${LISTING_SUMMARY_SELECT}
      WHERE l.deleted_at IS NULL AND l.listing_type = 'AUCTION' AND ap.status = 'ON_GOING' AND ap.ends_at > NOW()
      ORDER BY ap.ends_at ASC LIMIT $1`, [limit]),
  ]);

  return {
    usedPopular: usedPopular.rows,
    auctionPopular: auctionPopular.rows,
    recentListings: recentListings.rows,
    auctionClosingSoon: auctionClosingSoon.rows,
  };
}

export async function findActiveCategories() {
  const result = await query(
    `SELECT idx AS "categoryIdx", name, sort_order AS "sortOrder"
       FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order, idx`,
  );
  return result.rows;
}
