import {
  query,
  withTransaction,
} from "../../infrastructure/database/database.js";

const SORT_SQL = Object.freeze({
  LATEST: "l.created_at DESC",
  ENDING_SOON: "ap.ends_at ASC",
  PRICE_ASC: "ap.current_price ASC, l.created_at DESC",
  PRICE_DESC: "ap.current_price DESC, l.created_at DESC",
});

/** 경매 목록과 현재 사용자의 관심·입찰 상태를 조회한다. */
export async function findAuctions(
  {
    q,
    categoryIdx,
    status,
    sort,
    limit,
    offset,
  },
  viewerUserIdx = null,
) {
  const values = [
    `%${q}%`,
    categoryIdx,
    status,
    viewerUserIdx,
    limit,
    offset,
  ];

  const where = `
    l.deleted_at IS NULL
    AND l.listing_type = 'AUCTION'
    AND ($1 = '%%' OR l.title ILIKE $1 OR l.description ILIKE $1)
    AND ($2::bigint IS NULL OR l.category_idx = $2)
    AND ($3::auction_status IS NULL OR ap.status = $3)
  `;

  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          l.idx,
          l.title,
          l.created_at,
          c.idx AS category_idx,
          c.name AS category_name,
          ap.start_price,
          ap.current_price,
          ap.status,
          ap.started_at,
          ap.ends_at,
          (
            SELECT pi.image_url
            FROM post_images pi
            WHERE pi.listing_idx = l.idx
            ORDER BY pi.sort_order
            LIMIT 1
          ) AS thumbnail_url,
          (
            SELECT COUNT(*)::int
            FROM auction_bids ab
            WHERE ab.listing_idx = l.idx
          ) AS bid_count,
          (
            SELECT COUNT(*)::int
            FROM favorites f
            WHERE f.listing_idx = l.idx
          ) AS favorite_count,
          EXISTS (
            SELECT 1
            FROM auction_bids ab
            WHERE ab.listing_idx = l.idx
              AND ab.bidder_idx = $4
          ) AS has_my_bid,
          (
            SELECT MAX(ab.bid_price)
            FROM auction_bids ab
            WHERE ab.listing_idx = l.idx
              AND ab.bidder_idx = $4
          ) AS my_bid_amount,
          EXISTS (
            SELECT 1
            FROM favorites f
            WHERE f.listing_idx = l.idx
              AND f.user_idx = $4
          ) AS is_favorite
        FROM listings l
        JOIN auction_posts ap ON ap.listing_idx = l.idx
        JOIN categories c ON c.idx = l.category_idx
        WHERE ${where}
        ORDER BY ${SORT_SQL[sort]}
        LIMIT $5 OFFSET $6
      `,
      values,
    ),
    query(
      `
        SELECT COUNT(*)::int AS total_count
        FROM listings l
        JOIN auction_posts ap ON ap.listing_idx = l.idx
        WHERE ${where}
      `,
      values.slice(0, 3),
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].total_count,
  };
}

/** 상세 화면에 필요한 경매·판매자·이미지 정보를 조회한다. */
export async function findAuctionDetail(listingIdx, viewerUserIdx = null) {
  const result = await query(
    `
      SELECT
        l.idx,
        l.seller_idx,
        l.title,
        l.description,
        l.preferred_trade_location,
        l.product_status,
        l.view_count,
        l.created_at,
        l.updated_at,
        c.idx AS category_idx,
        c.name AS category_name,
        ap.start_price,
        ap.current_price,
        ap.bid_unit,
        ap.started_at,
        ap.ends_at,
        ap.status,
        u.nickname AS seller_nickname,
        u.profile_image AS seller_profile_image,
        COALESCE(
          (SELECT AVG(r.rating) FROM reviews r WHERE r.reviewee_idx = u.idx),
          0
        ) AS seller_average_rating,
        (
          SELECT COUNT(*)::int
          FROM reviews r
          WHERE r.reviewee_idx = u.idx
        ) AS seller_review_count,
        winner.bidder_idx AS highest_bidder_idx,
        winner.nickname AS highest_bidder_nickname,
        (
          SELECT COUNT(*)::int
          FROM auction_bids ab
          WHERE ab.listing_idx = l.idx
        ) AS bid_count,
        (
          SELECT COUNT(*)::int
          FROM favorites f
          WHERE f.listing_idx = l.idx
        ) AS favorite_count,
        EXISTS (
          SELECT 1
          FROM favorites f
          WHERE f.listing_idx = l.idx
            AND f.user_idx = $2
        ) AS is_favorite
      FROM listings l
      JOIN auction_posts ap ON ap.listing_idx = l.idx
      JOIN categories c ON c.idx = l.category_idx
      JOIN users u ON u.idx = l.seller_idx
      LEFT JOIN LATERAL (
        SELECT
          ab.bidder_idx,
          bidder.nickname
        FROM auction_bids ab
        JOIN users bidder ON bidder.idx = ab.bidder_idx
        WHERE ab.listing_idx = l.idx
        ORDER BY ab.bid_price DESC, ab.created_at ASC
        LIMIT 1
      ) winner ON TRUE
      WHERE l.idx = $1
        AND l.listing_type = 'AUCTION'
        AND l.deleted_at IS NULL
    `,
    [listingIdx, viewerUserIdx],
  );

  if (!result.rows[0]) {
    return null;
  }

  const images = await query(
    `
      SELECT idx, image_url, sort_order
      FROM post_images
      WHERE listing_idx = $1
      ORDER BY sort_order
    `,
    [listingIdx],
  );

  return {
    ...result.rows[0],
    images: images.rows,
  };
}

/** 상세 조회가 성공한 경매의 조회수를 증가시킨다. */
export async function increaseAuctionViewCount(listingIdx) {
  await query(
    "UPDATE listings SET view_count = view_count + 1 WHERE idx = $1",
    [listingIdx],
  );
}

/** 경매 게시글, 경매 정보, 이미지를 하나의 transaction으로 저장한다. */
export async function insertAuction({
  sellerIdx,
  title,
  description,
  categoryIdx,
  productStatus,
  startPrice,
  preferredTradeLocation,
  imageUrls,
  startedAt,
  endsAt,
  bidUnit,
}) {
  return withTransaction(async (client) => {
    const listing = await client.query(
      `
        INSERT INTO listings (
          seller_idx,
          category_idx,
          listing_type,
          title,
          description,
          preferred_trade_location,
          product_status
        )
        VALUES ($1, $2, 'AUCTION', $3, $4, $5, $6)
        RETURNING idx
      `,
      [
        sellerIdx,
        categoryIdx,
        title,
        description,
        preferredTradeLocation,
        productStatus,
      ],
    );

    const listingIdx = listing.rows[0].idx;

    await client.query(
      `
        INSERT INTO auction_posts (
          listing_idx,
          start_price,
          current_price,
          bid_unit,
          started_at,
          ends_at
        )
        VALUES ($1, $2, $2, $3, $4, $5)
      `,
      [listingIdx, startPrice, bidUnit, startedAt, endsAt],
    );

    for (const [sortOrder, imageUrl] of imageUrls.entries()) {
      await client.query(
        `
          INSERT INTO post_images (listing_idx, image_url, sort_order)
          VALUES ($1, $2, $3)
        `,
        [listingIdx, imageUrl, sortOrder],
      );
    }

    return listingIdx;
  });
}

/** 수정·삭제·입찰 전에 소유자와 현재 경매 상태를 조회한다. */
export async function findAuctionForMutation(listingIdx) {
  const result = await query(
    `
      SELECT
        l.idx,
        l.seller_idx,
        ap.status,
        ap.ends_at,
        ap.start_price,
        ap.current_price,
        ap.bid_unit
      FROM listings l
      JOIN auction_posts ap ON ap.listing_idx = l.idx
      WHERE l.idx = $1
        AND l.listing_type = 'AUCTION'
        AND l.deleted_at IS NULL
    `,
    [listingIdx],
  );

  return result.rows[0] ?? null;
}

/** Socket room 입장 검증에 필요한 최소 경매 상태를 조회한다. */
export async function findAuctionRoomState(listingIdx) {
  const result = await query(
    `
      SELECT l.idx, ap.status, ap.ends_at
      FROM listings l
      JOIN auction_posts ap ON ap.listing_idx = l.idx
      WHERE l.idx = $1
        AND l.deleted_at IS NULL
    `,
    [listingIdx],
  );

  return result.rows[0] ?? null;
}

/** 경매 정보와 새 이미지가 전달된 경우 이미지 전체를 교체한다. */
export async function updateAuctionRecord(listingIdx, data, imageUrls) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE listings
        SET
          title = $2,
          description = $3,
          category_idx = $4,
          product_status = $5,
          preferred_trade_location = $6,
          updated_at = NOW()
        WHERE idx = $1
        RETURNING updated_at
      `,
      [
        listingIdx,
        data.title,
        data.description,
        data.categoryIdx,
        data.productStatus,
        data.preferredTradeLocation,
      ],
    );

    if (imageUrls.length > 0) {
      await client.query(
        "DELETE FROM post_images WHERE listing_idx = $1",
        [listingIdx],
      );

      for (const [sortOrder, imageUrl] of imageUrls.entries()) {
        await client.query(
          `
            INSERT INTO post_images (listing_idx, image_url, sort_order)
            VALUES ($1, $2, $3)
          `,
          [listingIdx, imageUrl, sortOrder],
        );
      }
    }

    return result.rows[0].updated_at;
  });
}

/**
 * 경매를 논리 삭제하고 모든 입찰자에게 영속 알림을 저장한다.
 * Socket 접속 여부와 관계없이 다음 로그인에서 삭제 사실을 확인할 수 있다.
 */
export async function softDeleteAuction(
  listingIdx,
  deletedBy,
  deleteReason,
) {
  return withTransaction(async (client) => {
    const biddersResult = await client.query(
      `
        SELECT DISTINCT bidder_idx AS "receiverIdx"
        FROM auction_bids
        WHERE listing_idx = $1
      `,
      [listingIdx],
    );

    const deletedResult = await client.query(
      `
        UPDATE listings
        SET
          deleted_at = NOW(),
          deleted_by = $2,
          delete_reason = $3,
          updated_at = NOW()
        WHERE idx = $1
          AND deleted_at IS NULL
        RETURNING deleted_at AS "deletedAt"
      `,
      [listingIdx, deletedBy, deleteReason],
    );

    const deleted = deletedResult.rows[0];
    if (!deleted) {
      return null;
    }

    await client.query(
      "DELETE FROM favorites WHERE listing_idx = $1",
      [listingIdx],
    );

    const notifications = [];
    for (const bidder of biddersResult.rows) {
      const notificationResult = await client.query(
        `
          INSERT INTO notifications (
            receiver_idx,
            notification_type,
            reference_type,
            reference_idx,
            content
          )
          VALUES (
            $1,
            'LISTING_DELETED',
            'AUCTION',
            $2,
            '입찰에 참여한 경매가 판매자에 의해 삭제되었습니다.'
          )
          RETURNING
            idx AS "notificationIdx",
            receiver_idx AS "receiverIdx",
            notification_type AS "notificationType",
            reference_type AS "referenceType",
            reference_idx AS "referenceIdx",
            content,
            is_read AS "isRead",
            created_at AS "createdAt"
        `,
        [bidder.receiverIdx, listingIdx],
      );
      notifications.push(notificationResult.rows[0]);
    }

    return {
      deletedAt: deleted.deletedAt,
      notifications,
    };
  });
}

/**
 * 입찰 경쟁 상태를 막기 위해 auction_posts 행을 FOR UPDATE로 잠근 뒤
 * 입찰 저장과 현재가 변경, 추월 알림 생성을 같은 transaction에서 처리한다.
 */
export async function insertBid({ listingIdx, bidderIdx, bidAmount }) {
  return withTransaction(async (client) => {
    const auctionResult = await client.query(
      `
        SELECT
          l.seller_idx,
          l.deleted_at,
          ap.status,
          ap.ends_at,
          ap.current_price,
          ap.bid_unit
        FROM auction_posts ap
        JOIN listings l ON l.idx = ap.listing_idx
        WHERE ap.listing_idx = $1
        FOR UPDATE
      `,
      [listingIdx],
    );

    const auction = auctionResult.rows[0];

    if (!auction || auction.deleted_at) {
      return { failure: "NOT_FOUND" };
    }

    if (
      auction.status !== "ON_GOING"
      || new Date(auction.ends_at).getTime() <= Date.now()
    ) {
      return { failure: "CLOSED" };
    }

    if (Number(auction.seller_idx) === Number(bidderIdx)) {
      return { failure: "OWNER" };
    }

    const minimum = Number(auction.current_price) + Number(auction.bid_unit);
    if (bidAmount < minimum) {
      return { failure: "TOO_LOW", minimum };
    }

    const previousResult = await client.query(
      `
        SELECT ab.bidder_idx, ab.bid_price
        FROM auction_bids ab
        WHERE ab.listing_idx = $1
        ORDER BY ab.bid_price DESC, ab.created_at ASC
        LIMIT 1
      `,
      [listingIdx],
    );
    const previous = previousResult.rows[0] ?? null;

    const bidResult = await client.query(
      `
        INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price)
        VALUES ($1, $2, $3)
        RETURNING idx, created_at
      `,
      [listingIdx, bidderIdx, bidAmount],
    );

    await client.query(
      `
        UPDATE auction_posts
        SET current_price = $2
        WHERE listing_idx = $1
      `,
      [listingIdx, bidAmount],
    );

    let notification = null;
    let unreadCount = null;

    if (previous && Number(previous.bidder_idx) !== Number(bidderIdx)) {
      const notificationResult = await client.query(
        `
          INSERT INTO notifications (
            receiver_idx,
            notification_type,
            reference_type,
            reference_idx,
            content
          )
          VALUES (
            $1,
            'OUTBID',
            'AUCTION',
            $2,
            '다른 사용자가 더 높은 금액으로 입찰했습니다.'
          )
          RETURNING
            idx AS "notificationIdx",
            receiver_idx AS "receiverIdx",
            notification_type AS "notificationType",
            reference_type AS "referenceType",
            reference_idx AS "referenceIdx",
            content,
            is_read AS "isRead",
            created_at AS "createdAt"
        `,
        [previous.bidder_idx, listingIdx],
      );
      notification = notificationResult.rows[0];

      const unread = await client.query(
        `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE receiver_idx = $1
            AND is_read = FALSE
        `,
        [previous.bidder_idx],
      );
      unreadCount = unread.rows[0].count;
    }

    return {
      bid: bidResult.rows[0],
      previous,
      notification,
      unreadCount,
      currentPrice: bidAmount,
      minimumNextBid: bidAmount + Number(auction.bid_unit),
    };
  });
}

/**
 * 입찰 원본 이력은 보존하되 순위 화면에는 사용자별 최고 입찰만 반환한다.
 */
export async function findAuctionBids({ listingIdx, page, limit, offset }) {
  const [items, count] = await Promise.all([
    query(
      `
        WITH bidder_best AS (
          SELECT DISTINCT ON (ab.bidder_idx)
            ab.idx AS "bidIdx",
            ab.bidder_idx AS "bidderIdx",
            u.nickname AS "bidderNickname",
            ab.bid_price AS "bidAmount",
            ab.created_at AS "createdAt"
          FROM auction_bids ab
          JOIN users u ON u.idx = ab.bidder_idx
          WHERE ab.listing_idx = $1
          ORDER BY
            ab.bidder_idx,
            ab.bid_price DESC,
            ab.created_at ASC
        )
        SELECT *
        FROM bidder_best
        ORDER BY "bidAmount" DESC, "createdAt" ASC
        LIMIT $2 OFFSET $3
      `,
      [listingIdx, limit, offset],
    ),
    query(
      `
        SELECT COUNT(DISTINCT bidder_idx)::int AS count
        FROM auction_bids
        WHERE listing_idx = $1
      `,
      [listingIdx],
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
    page,
    limit,
  };
}

export async function addAuctionFavoriteRow(userIdx, listingIdx) {
  await query(
    `
      INSERT INTO favorites (user_idx, listing_idx)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [userIdx, listingIdx],
  );

  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM favorites
      WHERE listing_idx = $1
    `,
    [listingIdx],
  );

  return result.rows[0].count;
}

export async function removeAuctionFavoriteRow(userIdx, listingIdx) {
  await query(
    "DELETE FROM favorites WHERE user_idx = $1 AND listing_idx = $2",
    [userIdx, listingIdx],
  );

  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM favorites
      WHERE listing_idx = $1
    `,
    [listingIdx],
  );

  return result.rows[0].count;
}

/**
 * 경매 종료, 낙찰 거래, 판매자-낙찰자 채팅방, 알림을 한 transaction에서 만든다.
 * 이미 종료된 경매는 상태를 다시 만들지 않고 멱등하게 반환한다.
 */
export async function finalizeAuctionRecord(listingIdx) {
  return withTransaction(async (client) => {
    const auctionResult = await client.query(
      `
        SELECT
          listing.seller_idx,
          listing.title,
          listing.deleted_at,
          auction.status,
          auction.ends_at,
          seller.nickname AS seller_nickname,
          seller.profile_image AS seller_profile_image,
          thumbnail.image_url AS thumbnail_url
        FROM auction_posts auction
        JOIN listings listing ON listing.idx = auction.listing_idx
        JOIN users seller ON seller.idx = listing.seller_idx
        LEFT JOIN LATERAL (
          SELECT image_url
          FROM post_images
          WHERE listing_idx = listing.idx
          ORDER BY sort_order ASC
          LIMIT 1
        ) thumbnail ON TRUE
        WHERE auction.listing_idx = $1
        FOR UPDATE
      `,
      [listingIdx],
    );

    const auction = auctionResult.rows[0];
    if (!auction) {
      return { failure: "NOT_FOUND" };
    }
    if (auction.status === "FINISHED") {
      return { alreadyFinished: true };
    }

    const winnerResult = await client.query(
      `
        SELECT
          bid.idx,
          bid.bidder_idx,
          bid.bid_price,
          bidder.nickname AS bidder_nickname,
          bidder.profile_image AS bidder_profile_image
        FROM auction_bids bid
        JOIN users bidder ON bidder.idx = bid.bidder_idx
        WHERE bid.listing_idx = $1
          AND bidder.deleted_at IS NULL
          AND bidder.banned_at IS NULL
        ORDER BY bid.bid_price DESC, bid.created_at ASC
        LIMIT 1
      `,
      [listingIdx],
    );
    const winner = winnerResult.rows[0] ?? null;

    await client.query(
      `
        UPDATE auction_posts
        SET
          status = 'FINISHED',
          winning_bid_idx = $2
        WHERE listing_idx = $1
      `,
      [listingIdx, winner?.idx ?? null],
    );

    let transaction = null;
    let chatRoom = null;

    if (winner && !auction.deleted_at) {
      const transactionResult = await client.query(
        `
          INSERT INTO transactions (
            listing_idx,
            seller_idx,
            buyer_idx,
            transaction_type,
            status,
            amount
          )
          VALUES ($1, $2, $3, 'AUCTION', 'REQUESTED', $4)
          ON CONFLICT DO NOTHING
          RETURNING idx
        `,
        [
          listingIdx,
          auction.seller_idx,
          winner.bidder_idx,
          winner.bid_price,
        ],
      );

      transaction = transactionResult.rows[0]
        ?? (
          await client.query(
            `
              SELECT idx
              FROM transactions
              WHERE listing_idx = $1
                AND seller_idx = $2
                AND buyer_idx = $3
                AND transaction_type = 'AUCTION'
              ORDER BY created_at DESC
              LIMIT 1
            `,
            [listingIdx, auction.seller_idx, winner.bidder_idx],
          )
        ).rows[0]
        ?? null;

      const insertedRoom = await client.query(
        `
          INSERT INTO chat_rooms (listing_idx, buyer_idx)
          VALUES ($1, $2)
          ON CONFLICT (listing_idx, buyer_idx) DO NOTHING
          RETURNING
            idx AS "chatRoomIdx",
            created_at AS "createdAt"
        `,
        [listingIdx, winner.bidder_idx],
      );

      const roomRow = insertedRoom.rows[0]
        ?? (
          await client.query(
            `
              SELECT
                idx AS "chatRoomIdx",
                created_at AS "createdAt"
              FROM chat_rooms
              WHERE listing_idx = $1
                AND buyer_idx = $2
            `,
            [listingIdx, winner.bidder_idx],
          )
        ).rows[0];

      if (insertedRoom.rowCount === 1) {
        const systemMessage = await client.query(
          `
            INSERT INTO chat_messages (
              chat_room_idx,
              sender_idx,
              message_type,
              transaction_idx,
              content
            )
            VALUES (
              $1,
              NULL,
              'SYSTEM',
              $2,
              '경매가 종료되어 판매자와 낙찰자의 채팅방이 연결되었습니다.'
            )
            RETURNING created_at AS "createdAt"
          `,
          [roomRow.chatRoomIdx, transaction?.idx ?? null],
        );

        await client.query(
          `
            UPDATE chat_rooms
            SET
              updated_at = NOW(),
              last_message_at = $2
            WHERE idx = $1
          `,
          [roomRow.chatRoomIdx, systemMessage.rows[0].createdAt],
        );
      }

      chatRoom = {
        chatRoomIdx: Number(roomRow.chatRoomIdx),
        listingIdx: Number(listingIdx),
        listingTitle: auction.title,
        listingThumbnailUrl: auction.thumbnail_url,
        sellerIdx: Number(auction.seller_idx),
        sellerNickname: auction.seller_nickname,
        sellerProfileImageUrl: auction.seller_profile_image,
        buyerIdx: Number(winner.bidder_idx),
        buyerNickname: winner.bidder_nickname,
        buyerProfileImageUrl: winner.bidder_profile_image,
        created: insertedRoom.rowCount === 1,
        createdAt: roomRow.createdAt,
      };
    }

    const notifications = [];
    const sellerType = winner
      ? "AUCTION_ENDED"
      : "AUCTION_ENDED_WITHOUT_BID";
    const sellerMessage = winner
      ? "경매가 종료되어 낙찰자가 결정되었습니다."
      : "입찰 없이 경매가 종료되었습니다.";
    const sellerReferenceType = transaction ? "TRANSACTION" : "AUCTION";
    const sellerReferenceIdx = transaction?.idx ?? listingIdx;

    const sellerNotification = await client.query(
      `
        INSERT INTO notifications (
          receiver_idx,
          notification_type,
          reference_type,
          reference_idx,
          content
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          idx AS "notificationIdx",
          receiver_idx AS "receiverIdx",
          notification_type AS "notificationType",
          reference_type AS "referenceType",
          reference_idx AS "referenceIdx",
          content,
          is_read AS "isRead",
          created_at AS "createdAt"
      `,
      [
        auction.seller_idx,
        sellerType,
        sellerReferenceType,
        sellerReferenceIdx,
        sellerMessage,
      ],
    );
    notifications.push(sellerNotification.rows[0]);

    if (winner) {
      const wonNotification = await client.query(
        `
          INSERT INTO notifications (
            receiver_idx,
            notification_type,
            reference_type,
            reference_idx,
            content
          )
          VALUES (
            $1,
            'AUCTION_WON',
            'TRANSACTION',
            $2,
            '경매에 낙찰되었습니다.'
          )
          RETURNING
            idx AS "notificationIdx",
            receiver_idx AS "receiverIdx",
            notification_type AS "notificationType",
            reference_type AS "referenceType",
            reference_idx AS "referenceIdx",
            content,
            is_read AS "isRead",
            created_at AS "createdAt"
        `,
        [winner.bidder_idx, transaction.idx],
      );
      notifications.push(wonNotification.rows[0]);

      const losingBidders = await client.query(
        `
          SELECT DISTINCT bidder_idx
          FROM auction_bids
          WHERE listing_idx = $1
            AND bidder_idx <> $2
        `,
        [listingIdx, winner.bidder_idx],
      );

      for (const bidder of losingBidders.rows) {
        const endedNotification = await client.query(
          `
            INSERT INTO notifications (
              receiver_idx,
              notification_type,
              reference_type,
              reference_idx,
              content
            )
            VALUES (
              $1,
              'AUCTION_ENDED',
              'AUCTION',
              $2,
              '참여한 경매가 종료되었습니다.'
            )
            RETURNING
              idx AS "notificationIdx",
              receiver_idx AS "receiverIdx",
              notification_type AS "notificationType",
              reference_type AS "referenceType",
              reference_idx AS "referenceIdx",
              content,
              is_read AS "isRead",
              created_at AS "createdAt"
          `,
          [bidder.bidder_idx, listingIdx],
        );
        notifications.push(endedNotification.rows[0]);
      }
    }

    return {
      winner,
      transaction,
      chatRoom,
      notifications,
      endedAt: new Date(),
    };
  });
}

/** 서버 재시작 시 복구할 진행 중 경매와 종료 시각을 조회한다. */
export async function findRecoverableAuctions() {
  const result = await query(`
    SELECT ap.listing_idx, ap.ends_at
    FROM auction_posts ap
    JOIN listings l ON l.idx = ap.listing_idx
    WHERE ap.status = 'ON_GOING'
      AND l.deleted_at IS NULL
    ORDER BY ap.ends_at
  `);

  return result.rows;
}
