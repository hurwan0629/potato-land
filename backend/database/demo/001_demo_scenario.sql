-- Potato Land development demo data
-- Target schema: migrations 001_initial_schema.sql through 004_remove_review_tags.sql
--
-- All demo accounts use the password: Potato123!
-- Includes three administrators and an eight-transaction review bot pool.
-- This script is repeatable. It deletes only users whose login_id starts with
-- "demo_" and the rows connected to those demo users/listings.
--
-- Recommended usage:
--   1. npm run db:migrate
--   2. npm run db:seed
--   3. npm run db:demo
--
-- Do not run against a production database.

BEGIN;

DO $$
DECLARE
  v_password_hash CONSTANT TEXT := '$2b$10$dzGDVppz2o2ZEX2PLkedWO2hbLI42JE/8379DfNuBB6BYCHZJodau';
  v_now CONSTANT TIMESTAMPTZ := NOW();
  i INTEGER;

  v_category_clothes BIGINT;
  v_category_electronics BIGINT;
  v_category_books BIGINT;
  v_category_shoes BIGINT;

  v_admin BIGINT;
  v_admin2 BIGINT;
  v_admin3 BIGINT;
  v_seller BIGINT;
  v_seller2 BIGINT;
  v_bidder_a BIGINT;
  v_bidder_b BIGINT;
  v_buyer BIGINT;
  v_spectator BIGINT;
  v_banned BIGINT;
  v_withdrawn BIGINT;

  v_used_on_sale BIGINT;
  v_used_sold BIGINT;
  v_used_canceled BIGINT;
  v_auction_live BIGINT;
  v_auction_delete BIGINT;
  v_auction_requested BIGINT;
  v_auction_completed BIGINT;
  v_auction_no_bid BIGINT;
  v_auction_deleted BIGINT;

  v_live_bid_a1 BIGINT;
  v_live_bid_a2 BIGINT;
  v_live_bid_b BIGINT;
  v_delete_bid_a BIGINT;
  v_delete_bid_b BIGINT;
  v_requested_bid_a BIGINT;
  v_requested_bid_b BIGINT;
  v_completed_bid BIGINT;
  v_deleted_bid_a BIGINT;

  v_direct_completed_tx BIGINT;
  v_direct_canceled_tx BIGINT;
  v_auction_requested_tx BIGINT;
  v_auction_completed_tx BIGINT;

  v_used_live_room BIGINT;
  v_used_completed_room BIGINT;
  v_auction_requested_room BIGINT;
  v_auction_completed_room BIGINT;

  v_live_message BIGINT;
  v_completed_review_by_buyer BIGINT;
  v_completed_review_by_seller BIGINT;
BEGIN
  -----------------------------------------------------------------------------
  -- 1. Remove only previously loaded demo data.
  -----------------------------------------------------------------------------
  DELETE FROM reviews
  WHERE reviewer_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR reviewee_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR transaction_idx IN (
    SELECT tx.idx
    FROM transactions tx
    JOIN listings listing ON listing.idx = tx.listing_idx
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM notifications
  WHERE receiver_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM chat_messages
  WHERE chat_room_idx IN (
    SELECT room.idx
    FROM chat_rooms room
    JOIN listings listing ON listing.idx = room.listing_idx
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
       OR room.buyer_idx IN (
         SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
       )
  );

  DELETE FROM chat_rooms
  WHERE listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR buyer_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM favorites
  WHERE user_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM transactions
  WHERE seller_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR buyer_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  UPDATE auction_posts
  SET winning_bid_idx = NULL
  WHERE listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM auction_bids
  WHERE bidder_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  )
     OR listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM auction_posts
  WHERE listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM used_posts
  WHERE listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM post_images
  WHERE listing_idx IN (
    SELECT listing.idx
    FROM listings listing
    JOIN users seller ON seller.idx = listing.seller_idx
    WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM listings
  WHERE seller_idx IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  );

  UPDATE listings
  SET deleted_by = NULL
  WHERE deleted_by IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  );

  UPDATE transactions
  SET canceled_by = NULL
  WHERE canceled_by IN (
    SELECT idx FROM users WHERE login_id LIKE 'demo\_%' ESCAPE '\'
  );

  DELETE FROM users
  WHERE login_id LIKE 'demo\_%' ESCAPE '\';

  -----------------------------------------------------------------------------
  -- 2. Ensure the categories required by the scenarios exist.
  -----------------------------------------------------------------------------
  INSERT INTO categories (name, sort_order, is_active)
  VALUES ('의류', 1, TRUE)
  ON CONFLICT (name) DO UPDATE
  SET sort_order = EXCLUDED.sort_order,
      is_active = TRUE
  RETURNING idx INTO v_category_clothes;

  INSERT INTO categories (name, sort_order, is_active)
  VALUES ('전자기기', 2, TRUE)
  ON CONFLICT (name) DO UPDATE
  SET sort_order = EXCLUDED.sort_order,
      is_active = TRUE
  RETURNING idx INTO v_category_electronics;

  INSERT INTO categories (name, sort_order, is_active)
  VALUES ('도서', 5, TRUE)
  ON CONFLICT (name) DO UPDATE
  SET sort_order = EXCLUDED.sort_order,
      is_active = TRUE
  RETURNING idx INTO v_category_books;

  INSERT INTO categories (name, sort_order, is_active)
  VALUES ('신발', 7, TRUE)
  ON CONFLICT (name) DO UPDATE
  SET sort_order = EXCLUDED.sort_order,
      is_active = TRUE
  RETURNING idx INTO v_category_shoes;

  -----------------------------------------------------------------------------
  -- 3. Demo accounts. Password for every account: Potato123!
  -----------------------------------------------------------------------------
  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio, role
  )
  VALUES (
    'demo_admin', v_password_hash, '데모 관리자', '관리감자',
    '01081000001', 'demo-admin@potato.local',
    '관리자 페이지와 차트를 확인하는 계정입니다.', 'ADMIN'
  )
  RETURNING idx INTO v_admin;


  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio, role
  )
  VALUES (
    'demo_admin_2', v_password_hash, '데모 관리자 둘', '운영감자',
    '01081000010', 'demo-admin-2@potato.local',
    '회원과 상품 관리 기능을 확인하는 두 번째 관리자입니다.', 'ADMIN'
  )
  RETURNING idx INTO v_admin2;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio, role
  )
  VALUES (
    'demo_admin_3', v_password_hash, '데모 관리자 셋', '통계감자',
    '01081000011', 'demo-admin-3@potato.local',
    '대시보드와 낙찰 통계를 확인하는 세 번째 관리자입니다.', 'ADMIN'
  )
  RETURNING idx INTO v_admin3;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio
  )
  VALUES (
    'demo_seller', v_password_hash, '데모 판매자', '판매감자',
    '01081000002', 'demo-seller@potato.local',
    '중고 상품과 경매를 등록한 판매자입니다.'
  )
  RETURNING idx INTO v_seller;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio
  )
  VALUES (
    'demo_seller2', v_password_hash, '데모 판매자 둘', '책감자',
    '01081000003', 'demo-seller2@potato.local',
    '완료 거래와 후기를 확인하기 위한 판매자입니다.'
  )
  RETURNING idx INTO v_seller2;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio
  )
  VALUES (
    'demo_bidder_a', v_password_hash, '데모 입찰자 A', '입찰감자A',
    '01081000004', 'demo-bidder-a@potato.local',
    '같은 경매에 여러 번 입찰한 사용자입니다.'
  )
  RETURNING idx INTO v_bidder_a;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio
  )
  VALUES (
    'demo_bidder_b', v_password_hash, '데모 입찰자 B', '입찰감자B',
    '01081000005', 'demo-bidder-b@potato.local',
    '현재 최고 입찰자와 낙찰자 역할을 확인하는 사용자입니다.'
  )
  RETURNING idx INTO v_bidder_b;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio
  )
  VALUES (
    'demo_buyer', v_password_hash, '데모 구매자', '구매감자',
    '01081000006', 'demo-buyer@potato.local',
    '거래 완료와 후기 작성을 확인하는 구매자입니다.'
  )
  RETURNING idx INTO v_buyer;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio
  )
  VALUES (
    'demo_spectator', v_password_hash, '데모 관전자', '구경감자',
    '01081000007', 'demo-spectator@potato.local',
    '관심 상품과 일반 사용자 화면을 확인하는 계정입니다.'
  )
  RETURNING idx INTO v_spectator;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio,
    banned_at, banned_until, ban_reason
  )
  VALUES (
    'demo_banned', v_password_hash, '데모 정지 회원', '정지감자',
    '01081000008', 'demo-banned@potato.local',
    '관리자 회원 상태 필터 확인용 계정입니다.',
    v_now - INTERVAL '1 day', NULL, '데모 데이터: 영구 정지 상태'
  )
  RETURNING idx INTO v_banned;

  INSERT INTO users (
    login_id, password_hash, name, nickname, phone, email, bio, deleted_at
  )
  VALUES (
    'demo_withdrawn', v_password_hash, '데모 탈퇴 회원', '탈퇴감자',
    '01081000009', 'demo-withdrawn@potato.local',
    '관리자 탈퇴 회원 필터 확인용 계정입니다.',
    v_now - INTERVAL '2 days'
  )
  RETURNING idx INTO v_withdrawn;

  -----------------------------------------------------------------------------
  -- 4. Used listings.
  -----------------------------------------------------------------------------
  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller, v_category_electronics, 'USED',
    '데모 무선 키보드',
    '키감이 부드러운 무선 키보드입니다. 중고거래 채팅을 확인할 수 있습니다.',
    '강남역 5번 출구', 'LIKE_NEW', 34,
    v_now - INTERVAL '6 days'
  )
  RETURNING idx INTO v_used_on_sale;

  INSERT INTO used_posts (listing_idx, price, trade_status)
  VALUES (v_used_on_sale, 35000, 'ON_SALE');

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_used_on_sale, 'https://picsum.photos/seed/potato-used-keyboard-1/900/700', 0),
    (v_used_on_sale, 'https://picsum.photos/seed/potato-used-keyboard-2/900/700', 1),
    (v_used_on_sale, 'https://picsum.photos/seed/potato-used-keyboard-3/900/700', 2);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller2, v_category_clothes, 'USED',
    '거래 완료된 데모 후드티',
    '완료 거래, 채팅, 거래 완료 메시지와 후기를 확인하기 위한 상품입니다.',
    '잠실역 2번 출구', 'USED', 51,
    v_now - INTERVAL '5 days'
  )
  RETURNING idx INTO v_used_sold;

  INSERT INTO used_posts (listing_idx, price, trade_status)
  VALUES (v_used_sold, 45000, 'SOLD');

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_used_sold, 'https://picsum.photos/seed/potato-used-hoodie-1/900/700', 0),
    (v_used_sold, 'https://picsum.photos/seed/potato-used-hoodie-2/900/700', 1);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller, v_category_shoes, 'USED',
    '취소 거래가 있는 데모 운동화',
    '거래 요청이 취소된 뒤 다시 판매 중인 상품입니다.',
    '사당역 10번 출구', 'USED', 18,
    v_now - INTERVAL '3 days'
  )
  RETURNING idx INTO v_used_canceled;

  INSERT INTO used_posts (listing_idx, price, trade_status)
  VALUES (v_used_canceled, 70000, 'ON_SALE');

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_used_canceled, 'https://picsum.photos/seed/potato-used-shoes-1/900/700', 0),
    (v_used_canceled, 'https://picsum.photos/seed/potato-used-shoes-2/900/700', 1);

  -----------------------------------------------------------------------------
  -- 5. Auction listings.
  -----------------------------------------------------------------------------
  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller, v_category_electronics, 'AUCTION',
    '실시간 입찰 순위 데모 경매',
    '입찰자 A가 두 번 입찰하고 입찰자 B가 최고 입찰자인 진행 중 경매입니다.',
    '역삼역 1번 출구', 'LIKE_NEW', 87,
    v_now - INTERVAL '4 hours'
  )
  RETURNING idx INTO v_auction_live;

  INSERT INTO auction_posts (
    listing_idx, start_price, current_price, bid_unit,
    started_at, ends_at, status
  )
  VALUES (
    v_auction_live, 10000, 15000, 1000,
    v_now - INTERVAL '4 hours', v_now + INTERVAL '20 hours', 'ON_GOING'
  );

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_auction_live, 'https://picsum.photos/seed/potato-auction-live-1/900/700', 0),
    (v_auction_live, 'https://picsum.photos/seed/potato-auction-live-2/900/700', 1),
    (v_auction_live, 'https://picsum.photos/seed/potato-auction-live-3/900/700', 2),
    (v_auction_live, 'https://picsum.photos/seed/potato-auction-live-4/900/700', 3);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller, v_category_books, 'AUCTION',
    '판매자 삭제 알림 데모 경매',
    '두 명이 입찰한 상태입니다. 판매자 계정으로 삭제해 입찰자 알림을 확인하세요.',
    '신촌역 3번 출구', 'USED', 43,
    v_now - INTERVAL '3 hours'
  )
  RETURNING idx INTO v_auction_delete;

  INSERT INTO auction_posts (
    listing_idx, start_price, current_price, bid_unit,
    started_at, ends_at, status
  )
  VALUES (
    v_auction_delete, 20000, 23000, 1000,
    v_now - INTERVAL '3 hours', v_now + INTERVAL '21 hours', 'ON_GOING'
  );

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_auction_delete, 'https://picsum.photos/seed/potato-auction-delete-1/900/700', 0),
    (v_auction_delete, 'https://picsum.photos/seed/potato-auction-delete-2/900/700', 1);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller, v_category_electronics, 'AUCTION',
    '낙찰 후 거래 요청 데모 경매',
    '낙찰자와 판매자 채팅방, 낙찰 알림 및 거래 요청 화면을 확인합니다.',
    '서울역 4번 출구', 'LIKE_NEW', 112,
    v_now - INTERVAL '4 days'
  )
  RETURNING idx INTO v_auction_requested;

  INSERT INTO auction_posts (
    listing_idx, start_price, current_price, bid_unit,
    started_at, ends_at, status
  )
  VALUES (
    v_auction_requested, 30000, 35000, 1000,
    v_now - INTERVAL '4 days', v_now - INTERVAL '3 days', 'FINISHED'
  );

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_auction_requested, 'https://picsum.photos/seed/potato-auction-requested-1/900/700', 0),
    (v_auction_requested, 'https://picsum.photos/seed/potato-auction-requested-2/900/700', 1),
    (v_auction_requested, 'https://picsum.photos/seed/potato-auction-requested-3/900/700', 2);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller2, v_category_books, 'AUCTION',
    '거래 완료된 데모 경매',
    '관리자 거래 차트와 완료 거래 후기를 확인하는 경매입니다.',
    '홍대입구역 8번 출구', 'USED', 76,
    v_now - INTERVAL '7 days'
  )
  RETURNING idx INTO v_auction_completed;

  INSERT INTO auction_posts (
    listing_idx, start_price, current_price, bid_unit,
    started_at, ends_at, status
  )
  VALUES (
    v_auction_completed, 50000, 56000, 1000,
    v_now - INTERVAL '7 days', v_now - INTERVAL '6 days', 'FINISHED'
  );

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_auction_completed, 'https://picsum.photos/seed/potato-auction-completed-1/900/700', 0),
    (v_auction_completed, 'https://picsum.photos/seed/potato-auction-completed-2/900/700', 1);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count, created_at
  )
  VALUES (
    v_seller2, v_category_clothes, 'AUCTION',
    '입찰 없이 종료된 데모 경매',
    '낙찰자가 없는 종료 상태와 판매자 알림을 확인합니다.',
    '건대입구역 1번 출구', 'NEW', 9,
    v_now - INTERVAL '2 days'
  )
  RETURNING idx INTO v_auction_no_bid;

  INSERT INTO auction_posts (
    listing_idx, start_price, current_price, bid_unit,
    started_at, ends_at, status
  )
  VALUES (
    v_auction_no_bid, 120000, 120000, 5000,
    v_now - INTERVAL '2 days', v_now - INTERVAL '1 day', 'FINISHED'
  );

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_auction_no_bid, 'https://picsum.photos/seed/potato-auction-no-bid-1/900/700', 0);

  INSERT INTO listings (
    seller_idx, category_idx, listing_type, title, description,
    preferred_trade_location, product_status, view_count,
    created_at, updated_at, deleted_at, deleted_by, delete_reason
  )
  VALUES (
    v_seller2, v_category_electronics, 'AUCTION',
    '관리자용 삭제된 데모 경매',
    '관리자 상품 목록의 삭제 상태를 확인하기 위한 데이터입니다.',
    '온라인 협의', 'DAMAGED', 22,
    v_now - INTERVAL '2 days', v_now - INTERVAL '1 day',
    v_now - INTERVAL '1 day', v_seller2, '데모 데이터: 판매자가 직접 삭제'
  )
  RETURNING idx INTO v_auction_deleted;

  INSERT INTO auction_posts (
    listing_idx, start_price, current_price, bid_unit,
    started_at, ends_at, status
  )
  VALUES (
    v_auction_deleted, 5000, 6000, 1000,
    v_now - INTERVAL '2 days', v_now + INTERVAL '22 hours', 'ON_GOING'
  );

  INSERT INTO post_images (listing_idx, image_url, sort_order)
  VALUES
    (v_auction_deleted, 'https://picsum.photos/seed/potato-auction-deleted-1/900/700', 0);

  -----------------------------------------------------------------------------
  -- 6. Bids. Raw history retains repeated bids by the same user.
  -----------------------------------------------------------------------------
  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_live, v_bidder_a, 11000, v_now - INTERVAL '170 minutes')
  RETURNING idx INTO v_live_bid_a1;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_live, v_bidder_a, 13000, v_now - INTERVAL '120 minutes')
  RETURNING idx INTO v_live_bid_a2;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_live, v_bidder_b, 15000, v_now - INTERVAL '70 minutes')
  RETURNING idx INTO v_live_bid_b;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_delete, v_bidder_a, 21000, v_now - INTERVAL '130 minutes')
  RETURNING idx INTO v_delete_bid_a;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_delete, v_bidder_b, 23000, v_now - INTERVAL '80 minutes')
  RETURNING idx INTO v_delete_bid_b;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_requested, v_bidder_a, 31000, v_now - INTERVAL '3 days 2 hours')
  RETURNING idx INTO v_requested_bid_a;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_requested, v_bidder_b, 35000, v_now - INTERVAL '3 days 1 hour')
  RETURNING idx INTO v_requested_bid_b;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_completed, v_buyer, 56000, v_now - INTERVAL '6 days 1 hour')
  RETURNING idx INTO v_completed_bid;

  INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price, created_at)
  VALUES (v_auction_deleted, v_bidder_a, 6000, v_now - INTERVAL '36 hours')
  RETURNING idx INTO v_deleted_bid_a;

  UPDATE auction_posts
  SET winning_bid_idx = v_requested_bid_b
  WHERE listing_idx = v_auction_requested;

  UPDATE auction_posts
  SET winning_bid_idx = v_completed_bid
  WHERE listing_idx = v_auction_completed;

  -----------------------------------------------------------------------------
  -- 7. Favorites.
  -----------------------------------------------------------------------------
  INSERT INTO favorites (user_idx, listing_idx, created_at)
  VALUES
    (v_buyer, v_used_on_sale, v_now - INTERVAL '2 days'),
    (v_spectator, v_used_on_sale, v_now - INTERVAL '1 day'),
    (v_spectator, v_auction_live, v_now - INTERVAL '50 minutes'),
    (v_bidder_a, v_auction_delete, v_now - INTERVAL '120 minutes')
  ON CONFLICT DO NOTHING;

  -----------------------------------------------------------------------------
  -- 8. Transactions.
  -----------------------------------------------------------------------------
  INSERT INTO transactions (
    listing_idx, seller_idx, buyer_idx, transaction_type, status, amount,
    created_at, updated_at, completed_at
  )
  VALUES (
    v_used_sold, v_seller2, v_buyer, 'DIRECT_SALE', 'COMPLETED', 45000,
    v_now - INTERVAL '5 days', v_now - INTERVAL '4 days 20 hours',
    v_now - INTERVAL '4 days 20 hours'
  )
  RETURNING idx INTO v_direct_completed_tx;

  INSERT INTO transactions (
    listing_idx, seller_idx, buyer_idx, transaction_type, status, amount,
    created_at, updated_at, canceled_by
  )
  VALUES (
    v_used_canceled, v_seller, v_bidder_a, 'DIRECT_SALE', 'CANCELED', 70000,
    v_now - INTERVAL '2 days 12 hours', v_now - INTERVAL '2 days', v_seller
  )
  RETURNING idx INTO v_direct_canceled_tx;

  INSERT INTO transactions (
    listing_idx, seller_idx, buyer_idx, transaction_type, status, amount,
    created_at, updated_at
  )
  VALUES (
    v_auction_requested, v_seller, v_bidder_b, 'AUCTION', 'REQUESTED', 35000,
    v_now - INTERVAL '3 days', v_now - INTERVAL '3 days'
  )
  RETURNING idx INTO v_auction_requested_tx;

  INSERT INTO transactions (
    listing_idx, seller_idx, buyer_idx, transaction_type, status, amount,
    created_at, updated_at, completed_at
  )
  VALUES (
    v_auction_completed, v_seller2, v_buyer, 'AUCTION', 'COMPLETED', 56000,
    v_now - INTERVAL '6 days', v_now - INTERVAL '5 days 18 hours',
    v_now - INTERVAL '5 days 18 hours'
  )
  RETURNING idx INTO v_auction_completed_tx;

  -----------------------------------------------------------------------------
  -- 9. Chat rooms and messages.
  -----------------------------------------------------------------------------
  INSERT INTO chat_rooms (
    listing_idx, buyer_idx, created_at, updated_at, last_message_at
  )
  VALUES (
    v_used_on_sale, v_bidder_a,
    v_now - INTERVAL '2 days', v_now - INTERVAL '30 minutes',
    v_now - INTERVAL '30 minutes'
  )
  RETURNING idx INTO v_used_live_room;

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, client_message_id, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_used_live_room, v_bidder_a, 'demo-used-live-text-1', 'TEXT',
    NULL, '안녕하세요. 오늘 저녁에 거래 가능할까요?', NULL,
    v_now - INTERVAL '40 minutes'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, client_message_id, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_used_live_room, v_seller, 'demo-used-live-text-2', 'TEXT',
    NULL, '네, 강남역에서 가능합니다.', NULL,
    v_now - INTERVAL '35 minutes'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_used_live_room, v_bidder_a, 'IMAGE',
    NULL, '', 'https://picsum.photos/seed/potato-chat-image-1/800/600',
    v_now - INTERVAL '30 minutes'
  )
  RETURNING idx INTO v_live_message;

  INSERT INTO chat_rooms (
    listing_idx, buyer_idx, created_at, updated_at, last_message_at
  )
  VALUES (
    v_used_sold, v_buyer,
    v_now - INTERVAL '5 days', v_now - INTERVAL '4 days 20 hours',
    v_now - INTERVAL '4 days 20 hours'
  )
  RETURNING idx INTO v_used_completed_room;

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, client_message_id, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_used_completed_room, v_buyer, 'demo-used-completed-text-1', 'TEXT',
    NULL, '구매하고 싶습니다.', NULL,
    v_now - INTERVAL '5 days'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_used_completed_room, v_seller2, 'PAYMENT_REQUEST',
    v_direct_completed_tx, '45,000원 송금 요청이 생성되었습니다.', NULL,
    v_now - INTERVAL '4 days 22 hours'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_used_completed_room, NULL, 'TRADE_COMPLETE',
    v_direct_completed_tx, '거래가 완료되었습니다.', NULL,
    v_now - INTERVAL '4 days 20 hours'
  );

  INSERT INTO chat_rooms (
    listing_idx, buyer_idx, created_at, updated_at, last_message_at
  )
  VALUES (
    v_auction_requested, v_bidder_b,
    v_now - INTERVAL '3 days', v_now - INTERVAL '2 days 22 hours',
    v_now - INTERVAL '2 days 22 hours'
  )
  RETURNING idx INTO v_auction_requested_room;

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_auction_requested_room, NULL, 'SYSTEM',
    v_auction_requested_tx,
    '경매가 종료되어 판매자와 낙찰자의 채팅방이 연결되었습니다.',
    NULL, v_now - INTERVAL '3 days'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, client_message_id, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_auction_requested_room, v_seller, 'demo-auction-requested-text-1', 'TEXT',
    NULL, '낙찰을 축하드립니다. 거래 시간을 정해주세요.', NULL,
    v_now - INTERVAL '2 days 23 hours'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_auction_requested_room, v_seller, 'PAYMENT_REQUEST',
    v_auction_requested_tx, '35,000원 송금 요청이 생성되었습니다.', NULL,
    v_now - INTERVAL '2 days 22 hours'
  );

  INSERT INTO chat_rooms (
    listing_idx, buyer_idx, created_at, updated_at, last_message_at
  )
  VALUES (
    v_auction_completed, v_buyer,
    v_now - INTERVAL '6 days', v_now - INTERVAL '5 days 18 hours',
    v_now - INTERVAL '5 days 18 hours'
  )
  RETURNING idx INTO v_auction_completed_room;

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_auction_completed_room, NULL, 'SYSTEM',
    v_auction_completed_tx,
    '경매가 종료되어 판매자와 낙찰자의 채팅방이 연결되었습니다.',
    NULL, v_now - INTERVAL '6 days'
  );

  INSERT INTO chat_messages (
    chat_room_idx, sender_idx, message_type,
    transaction_idx, content, image_url, created_at
  )
  VALUES (
    v_auction_completed_room, NULL, 'TRADE_COMPLETE',
    v_auction_completed_tx, '거래가 완료되었습니다.', NULL,
    v_now - INTERVAL '5 days 18 hours'
  );

  -----------------------------------------------------------------------------
  -- 10. Reviews. Content stays within the current 50-character DB limit.
  -----------------------------------------------------------------------------
  INSERT INTO reviews (
    transaction_idx, reviewer_idx, reviewee_idx, rating, content, created_at
  )
  VALUES (
    v_direct_completed_tx, v_buyer, v_seller2, 10,
    '설명이 정확하고 거래가 친절했어요.',
    v_now - INTERVAL '4 days 18 hours'
  )
  RETURNING idx INTO v_completed_review_by_buyer;

  INSERT INTO reviews (
    transaction_idx, reviewer_idx, reviewee_idx, rating, content, created_at
  )
  VALUES (
    v_direct_completed_tx, v_seller2, v_buyer, 9,
    '시간 약속을 잘 지켜주셨어요.',
    v_now - INTERVAL '4 days 17 hours'
  )
  RETURNING idx INTO v_completed_review_by_seller;

  INSERT INTO reviews (
    transaction_idx, reviewer_idx, reviewee_idx, rating, content, created_at
  )
  VALUES
    (
      v_auction_completed_tx, v_buyer, v_seller2, 8,
      '경매 후 거래 안내가 빨랐어요.',
      v_now - INTERVAL '5 days 16 hours'
    ),
    (
      v_auction_completed_tx, v_seller2, v_buyer, 10,
      '낙찰 후 바로 연락이 되어 좋았습니다.',
      v_now - INTERVAL '5 days 15 hours'
    );

  -----------------------------------------------------------------------------
  -- 11. Review bot pool. The bot gradually writes both sides of these reviews.
  -----------------------------------------------------------------------------
  FOR i IN 1..8 LOOP
    INSERT INTO listings (
      seller_idx, category_idx, listing_type, title, description,
      preferred_trade_location, product_status, view_count, created_at
    )
    VALUES (
      CASE WHEN i % 2 = 0 THEN v_seller ELSE v_seller2 END,
      CASE WHEN i % 2 = 0 THEN v_category_books ELSE v_category_clothes END,
      'USED',
      FORMAT('후기 봇 거래 상품 %s', i),
      '개발 데모 봇이 완료 거래 후기를 순서대로 작성하기 위한 상품입니다.',
      '데모 거래 장소', 'USED', 10 + i,
      v_now - (i || ' days')::INTERVAL
    )
    RETURNING idx INTO v_used_canceled;

    INSERT INTO used_posts (listing_idx, price, trade_status)
    VALUES (v_used_canceled, 10000 + i * 1000, 'SOLD');

    INSERT INTO post_images (listing_idx, image_url, sort_order)
    VALUES (
      v_used_canceled,
      FORMAT('https://picsum.photos/seed/potato-review-bot-%s/900/700', i),
      0
    );

    INSERT INTO transactions (
      listing_idx, seller_idx, buyer_idx, transaction_type, status, amount,
      created_at, updated_at, completed_at
    )
    VALUES (
      v_used_canceled,
      CASE WHEN i % 2 = 0 THEN v_seller ELSE v_seller2 END,
      CASE WHEN i % 2 = 0 THEN v_bidder_a ELSE v_buyer END,
      'DIRECT_SALE', 'COMPLETED', 10000 + i * 1000,
      v_now - (i || ' days')::INTERVAL,
      v_now - (i || ' days')::INTERVAL + INTERVAL '2 hours',
      v_now - (i || ' days')::INTERVAL + INTERVAL '2 hours'
    );
  END LOOP;

  -----------------------------------------------------------------------------
  -- 12. Notifications covering navigation and read/unread states.
  -----------------------------------------------------------------------------
  INSERT INTO notifications (
    receiver_idx, notification_type, reference_type, reference_idx,
    content, is_read, read_at, created_at
  )
  VALUES
    (
      v_seller, 'NEW_MESSAGE', 'CHAT_MESSAGE', v_live_message,
      '새 이미지가 도착했습니다.', FALSE, NULL,
      v_now - INTERVAL '30 minutes'
    ),
    (
      v_bidder_a, 'OUTBID', 'AUCTION', v_auction_live,
      '다른 사용자가 더 높은 금액으로 입찰했습니다.', FALSE, NULL,
      v_now - INTERVAL '70 minutes'
    ),
    (
      v_seller, 'NEW_CHAT_ROOM', 'CHAT_ROOM', v_used_live_room,
      '새 채팅방이 생성되었습니다.', TRUE, v_now - INTERVAL '1 day',
      v_now - INTERVAL '2 days'
    ),
    (
      v_bidder_b, 'AUCTION_WON', 'TRANSACTION', v_auction_requested_tx,
      '경매에 낙찰되었습니다.', FALSE, NULL,
      v_now - INTERVAL '3 days'
    ),
    (
      v_seller, 'AUCTION_ENDED', 'TRANSACTION', v_auction_requested_tx,
      '경매가 종료되어 낙찰자가 결정되었습니다.', FALSE, NULL,
      v_now - INTERVAL '3 days'
    ),
    (
      v_bidder_a, 'AUCTION_ENDED', 'AUCTION', v_auction_requested,
      '참여한 경매가 종료되었습니다.', TRUE, v_now - INTERVAL '2 days 20 hours',
      v_now - INTERVAL '3 days'
    ),
    (
      v_bidder_b, 'PAYMENT_REQUESTED', 'TRANSACTION', v_auction_requested_tx,
      '판매자가 송금을 요청했습니다.', FALSE, NULL,
      v_now - INTERVAL '2 days 22 hours'
    ),
    (
      v_seller2, 'AUCTION_ENDED_WITHOUT_BID', 'AUCTION', v_auction_no_bid,
      '입찰 없이 경매가 종료되었습니다.', FALSE, NULL,
      v_now - INTERVAL '1 day'
    ),
    (
      v_seller2, 'NEW_REVIEW', 'REVIEW', v_completed_review_by_buyer,
      '새로운 후기가 도착했습니다.', TRUE, v_now - INTERVAL '4 days 17 hours',
      v_now - INTERVAL '4 days 18 hours'
    ),
    (
      v_bidder_a, 'LISTING_DELETED', 'AUCTION', v_auction_deleted,
      '입찰에 참여한 경매가 판매자에 의해 삭제되었습니다.', FALSE, NULL,
      v_now - INTERVAL '1 day'
    );

  RAISE NOTICE 'Potato Land demo data loaded.';
  RAISE NOTICE 'Password for all demo accounts: Potato123!';
  RAISE NOTICE 'Admin ids: %, %, %; seller id: %, bidder A id: %, bidder B id: %',
    v_admin, v_admin2, v_admin3, v_seller, v_bidder_a, v_bidder_b;
  RAISE NOTICE 'Live auction id: %, deletion test auction id: %, requested transaction id: %',
    v_auction_live, v_auction_delete, v_auction_requested_tx;
END
$$;

COMMIT;

-- Account summary printed after successful execution.
SELECT
  idx AS "userIdx",
  login_id AS "loginId",
  nickname,
  role,
  CASE
    WHEN deleted_at IS NOT NULL THEN 'WITHDRAWN'
    WHEN banned_at IS NOT NULL THEN 'BANNED'
    ELSE 'ACTIVE'
  END AS status
FROM users
WHERE login_id LIKE 'demo\_%' ESCAPE '\'
ORDER BY idx;

-- Scenario listing summary.
SELECT
  listing.idx AS "listingIdx",
  listing.listing_type AS "listingType",
  listing.title,
  COALESCE(used_post.trade_status::text, auction.status::text) AS status,
  listing.deleted_at AS "deletedAt"
FROM listings listing
LEFT JOIN used_posts used_post ON used_post.listing_idx = listing.idx
LEFT JOIN auction_posts auction ON auction.listing_idx = listing.idx
JOIN users seller ON seller.idx = listing.seller_idx
WHERE seller.login_id LIKE 'demo\_%' ESCAPE '\'
ORDER BY listing.idx;
