> 사용 DB는 PostgreSQL 기준으로 설정하였습니다.

- DBML
    
    ```markdown
    Project gamja_nara {
      database_type: 'PostgreSQL'
      Note: '감자나라 중고거래 및 경매 서비스 논리 ERD'
    }
    
    /* =========================================================
       ENUM
       ========================================================= */
    
    Enum user_role {
      USER
      ADMIN
    }
    
    Enum notification_type {
      NEW_CHAT_ROOM
      NEW_MESSAGE
    
      NEW_BID
      OUTBID
      AUCTION_WON
      AUCTION_ENDED
      AUCTION_ENDED_WITHOUT_BID
    
      PAYMENT_COMPLETED
      PAYMENT_RECEIVED
      NEW_REVIEW
    }
    
    Enum notification_reference_type {
      CHAT_ROOM
      LISTING
      TRANSACTION
      REVIEW
    }
    
    Enum listing_type {
      USED
      AUCTION
    }
    
    Enum product_status {
      NEW
      LIKE_NEW
      USED
      DAMAGED
    }
    
    Enum used_trade_status {
      ON_SALE
      CANCELED
      SOLD
    }
    
    Enum auction_status {
      ON_GOING
      FINISHED
      CANCELED
    }
    
    Enum chat_message_type {
      TEXT
      IMAGE
      SYSTEM
      PAYMENT_REQUEST
      TRADE_COMPLETE
    }
    
    Enum transaction_type {
      DIRECT_SALE
      AUCTION
    }
    
    Enum transaction_status {
      REQUESTED
      COMPLETED
      CANCELED
    }
    
    /* =========================================================
       사용자
       ========================================================= */
    
    Table users {
      idx bigint [pk, increment]
    
      login_id varchar(50) [not null]
      password_hash varchar(255) [not null]
      name varchar(50) [not null]
      nickname varchar(50) [not null]
      phone varchar(30) [not null]
      email varchar(255)
      profile_image varchar(2048)
    
      role user_role [not null, default: 'USER']
    
      created_at timestamptz [not null, default: `now()`]
      updated_at timestamptz [not null, default: `now()`]
    
      deleted_at timestamptz [note: '사용자 자진 탈퇴']
    
      banned_at timestamptz [note: '관리자 밴 시작 시각']
      banned_until timestamptz [
        note: 'banned_at이 존재하고 이 값이 NULL이면 영구 밴'
      ]
      ban_reason text
    
      indexes {
        login_id [unique, name: 'uq_users_login_id']
        nickname [unique, name: 'uq_users_nickname']
        phone [unique, name: 'uq_users_phone']
      }
    }
    
    /* =========================================================
       알림
       ========================================================= */
    
    Table notifications {
      idx bigint [pk, increment]
    
      receiver_idx bigint [not null]
    
      notification_type notification_type [not null]
      reference_type notification_reference_type [not null]
    
      reference_idx bigint [
        not null,
        note: '다형성 참조. reference_type에 따라 대상 테이블이 달라지므로 직접 FK를 설정하지 않음'
      ]
    
      content text [not null]
      is_read boolean [not null, default: false]
    
      created_at timestamptz [not null, default: `now()`]
    
      indexes {
        (receiver_idx, is_read, created_at) [
          name: 'idx_notifications_receiver_read_created'
        ]
      }
    }
    
    /* =========================================================
       카테고리
       ========================================================= */
    
    Table categories {
      idx bigint [pk, increment]
    
      name varchar(100) [not null]
      sort_order integer [not null]
      is_active boolean [not null, default: true]
    
      indexes {
        name [unique, name: 'uq_categories_name']
        sort_order [name: 'idx_categories_sort_order']
      }
    }
    
    /* =========================================================
       공통 판매 게시글
       ========================================================= */
    
    Table listings {
      idx bigint [pk, increment]
    
      seller_idx bigint [not null]
      category_idx bigint [not null]
    
      listing_type listing_type [not null]
    
      title varchar(200) [not null]
      description text [not null]
      preferred_trade_location varchar(255)
    
      view_count bigint [not null, default: 0]
    
      created_at timestamptz [not null, default: `now()`]
      updated_at timestamptz [not null, default: `now()`]
    
      indexes {
        seller_idx [name: 'idx_listings_seller']
        category_idx [name: 'idx_listings_category']
        (listing_type, created_at) [
          name: 'idx_listings_type_created'
        ]
      }
    }
    
    /* =========================================================
       관심 품목
       ========================================================= */
    
    Table favorites {
      user_idx bigint [not null]
      listing_idx bigint [not null]
    
      created_at timestamptz [not null, default: `now()`]
    
      indexes {
        (user_idx, listing_idx) [
          pk,
          name: 'pk_favorites'
        ]
    
        listing_idx [
          name: 'idx_favorites_listing'
        ]
      }
    }
    
    /* =========================================================
       중고거래 상세
       ========================================================= */
    
    Table used_posts {
      listing_idx bigint [pk]
    
      price bigint [not null]
      product_status product_status [not null]
      trade_status used_trade_status [
        not null,
        default: 'ON_SALE'
      ]
    
      checks {
        `price >= 0` [name: 'chk_used_posts_price']
      }
    }
    
    /* =========================================================
       경매 상세
       ========================================================= */
    
    Table auction_posts {
      listing_idx bigint [pk]
    
      start_price bigint [not null]
      current_price bigint [not null]
      bid_unit bigint [not null]
    
      started_at timestamptz [not null]
      ends_at timestamptz [not null]
    
      status auction_status [
        not null,
        default: 'ON_GOING'
      ]
    
      winning_bid_idx bigint [
        note: '낙찰된 auction_bids.idx. 입찰자가 없으면 NULL'
      ]
    
      checks {
        `start_price >= 0` [
          name: 'chk_auction_posts_start_price'
        ]
    
        `current_price >= start_price` [
          name: 'chk_auction_posts_current_price'
        ]
    
        `bid_unit >= 100` [
          name: 'chk_auction_posts_bid_unit'
        ]
    
        `ends_at > started_at` [
          name: 'chk_auction_posts_period'
        ]
      }
    }
    
    /* =========================================================
       경매 입찰
       ========================================================= */
    
    Table auction_bids {
      idx bigint [pk, increment]
    
      listing_idx bigint [not null]
      bidder_idx bigint [not null]
    
      bid_price bigint [not null]
    
      created_at timestamptz [not null, default: `now()`]
    
      indexes {
        (listing_idx, bid_price) [
          name: 'idx_auction_bids_listing_price'
        ]
    
        (idx, listing_idx) [
          unique,
          name: 'uq_auction_bids_idx_listing'
        ]
      }
    
      checks {
        `bid_price >= 0` [
          name: 'chk_auction_bids_price'
        ]
      }
    }
    
    /* =========================================================
       게시글 이미지
       ========================================================= */
    
    Table post_images {
      idx bigint [pk, increment]
    
      listing_idx bigint [not null]
    
      image_url varchar(2048) [not null]
      sort_order integer [not null]
    
      created_at timestamptz [not null, default: `now()`]
    
      indexes {
        (listing_idx, sort_order) [
          unique,
          name: 'uq_post_images_listing_order'
        ]
      }
    
      checks {
        `sort_order >= 0` [
          name: 'chk_post_images_sort_order'
        ]
      }
    }
    
    /* =========================================================
       채팅방
       ========================================================= */
    
    Table chat_rooms {
      idx bigint [pk, increment]
    
      listing_idx bigint [not null]
      buyer_idx bigint [not null]
    
      created_at timestamptz [not null, default: `now()`]
      updated_at timestamptz [not null, default: `now()`]
    
      last_message_at timestamptz
    
      indexes {
        (listing_idx, buyer_idx) [
          unique,
          name: 'uq_chat_rooms_listing_buyer'
        ]
    
        (buyer_idx, last_message_at) [
          name: 'idx_chat_rooms_buyer_recent'
        ]
      }
    }
    
    /* =========================================================
       거래내역
       ========================================================= */
    
    Table transactions {
      idx bigint [pk, increment]
    
      listing_idx bigint [not null]
    
      seller_idx bigint [not null]
      buyer_idx bigint [not null]
    
      transaction_type transaction_type [not null]
      status transaction_status [
        not null,
        default: 'REQUESTED'
      ]
    
      amount bigint [not null]
    
      created_at timestamptz [not null, default: `now()`]
      updated_at timestamptz [not null, default: `now()`]
    
      completed_at timestamptz
    
      canceled_at timestamptz
      canceled_by bigint
      cancel_reason text
    
      indexes {
        listing_idx [
          name: 'idx_transactions_listing'
        ]
    
        buyer_idx [
          name: 'idx_transactions_buyer'
        ]
    
        seller_idx [
          name: 'idx_transactions_seller'
        ]
      }
    
      checks {
        `amount >= 0` [
          name: 'chk_transactions_amount'
        ]
    
        `seller_idx <> buyer_idx` [
          name: 'chk_transactions_participants'
        ]
      }
    
      Note: '''
      PostgreSQL에서 별도의 부분 UNIQUE 인덱스 필요:
    
      CREATE UNIQUE INDEX uq_transactions_active_listing
      ON transactions(listing_idx)
      WHERE status IN ('REQUESTED', 'COMPLETED');
      '''
    }
    
    /* =========================================================
       채팅 메시지
       ========================================================= */
    
    Table chat_messages {
      idx bigint [pk, increment]
    
      chat_room_idx bigint [not null]
      sender_idx bigint [not null]
    
      message_type chat_message_type [not null]
    
      transaction_idx bigint [
        note: 'PAYMENT_REQUEST와 TRADE_COMPLETE 메시지에서 사용'
      ]
    
      content text [not null]
    
      created_at timestamptz [not null, default: `now()`]
      deleted_at timestamptz
    
      indexes {
        (chat_room_idx, created_at, idx) [
          name: 'idx_chat_messages_room_recent'
        ]
      }
    }
    
    /* =========================================================
       거래 후기
       ========================================================= */
    
    Table reviews {
      idx bigint [pk, increment]
    
      transaction_idx bigint [not null]
    
      reviewer_idx bigint [not null]
      reviewee_idx bigint [not null]
    
      rating smallint [not null]
      content text
    
      created_at timestamptz [not null, default: `now()`]
      updated_at timestamptz [not null, default: `now()`]
    
      indexes {
        (transaction_idx, reviewer_idx) [
          unique,
          name: 'uq_reviews_transaction_reviewer'
        ]
    
        reviewee_idx [
          name: 'idx_reviews_reviewee'
        ]
      }
    
      checks {
        `rating BETWEEN 1 AND 10` [
          name: 'chk_reviews_rating'
        ]
    
        `reviewer_idx <> reviewee_idx` [
          name: 'chk_reviews_participants'
        ]
      }
    }
    
    /* =========================================================
       관계
       ========================================================= */
    
    Ref: notifications.receiver_idx > users.idx
    
    Ref: listings.seller_idx > users.idx
    Ref: listings.category_idx > categories.idx
    
    Ref: favorites.user_idx > users.idx
    Ref: favorites.listing_idx > listings.idx
    
    Ref: used_posts.listing_idx - listings.idx
    Ref: auction_posts.listing_idx - listings.idx
    
    Ref: auction_bids.listing_idx > auction_posts.listing_idx
    Ref: auction_bids.bidder_idx > users.idx
    
    Ref: auction_posts.(winning_bid_idx, listing_idx)
      > auction_bids.(idx, listing_idx)
    
    Ref: post_images.listing_idx > listings.idx
    
    Ref: chat_rooms.listing_idx > listings.idx
    Ref: chat_rooms.buyer_idx > users.idx
    
    Ref: transactions.listing_idx > listings.idx
    Ref: transactions.seller_idx > users.idx
    Ref: transactions.buyer_idx > users.idx
    Ref: transactions.canceled_by > users.idx
    
    Ref: chat_messages.chat_room_idx > chat_rooms.idx
    Ref: chat_messages.sender_idx > users.idx
    Ref: chat_messages.transaction_idx > transactions.idx
    
    Ref: reviews.transaction_idx > transactions.idx
    Ref: reviews.reviewer_idx > users.idx
    Ref: reviews.reviewee_idx > users.idx
    
    Ref: "transactions"."idx" < "transactions"."seller_idx"
    ```

![[Potato Land.png]]

- 1. 사용자 `users`
    
    > `UNIQUE(login_id)`  
    > `UNIQUE(nickname)`  
    > `UNIQUE(phone)`
    
    - idx
    - login_id
    - password_hash
    - name
    - nickname
    - phone
    - email `NULL`
    - profile_image `VARCHAR`
    - role [ `USER`, `ADMIN` ]
    - created_at
    - updated_at
    - deleted_at ( `deleted_at`는 사용자 자진 탈퇴 )
    - banned_at ( `관리자 밴` )
    - banned_until NULL ( `기본적으로 NULL -> 영구밴` )
    - ban_reason NULL ( 밴 사유 )
- 2. 알림 `notifications`
    
    - idx
    - receiver_idx
    - notification_type
        - 채팅 페이지로 이동이동: `NEW_CHAT_ROOM`,`NEW_MESSAGE`, `PAYMENT_COMPLETED`,`NEW_REVIEW`, `PAYMENT_RECEIVED`
        - 경매 상세페이지로 이동: `AUCTION_WON`,`AUCTION_ENDED`, `AUCTION_ENDED_WITHOUT_BID`, `NEW_BID`,`OUTBID`
    - reference_type [ `CHAT_ROOM` `LISTING` `TRANSACTION` `REVIEW` ]
    - reference_idx [ `알림과 관련된 대상을 가리키는 값` 예를 들어 `chat_room_idx`, `listing_idx`, `review_idx`, `transactions` ]
    - content
    - is_read
    - created_at
- 3. 카테고리 `categories`
    
    > `UNIQUE(name)`
    
    - idx
    - name
    - sort_order
    - is_active
- 4. 관심 품목 `favorites`
    
    > `PRIMARY KEY(user_idx, listing_idx)`  
    > `INDEX(listing_idx)`
    
    - user_idx
    - listing_idx
    - created_at
- 5. 공통 판매 게시글 `listings`
    
    - idx
    - seller_idx
    - category_idx
    - listing_type [ `USED`, `AUCTION` ]
    - title
    - description
    - preferred_trade_location
    - view_count
    - created_at
    - updated_at
- 6. 중고글 `used_posts`
    
    > `PRIMARY KEY (listing_idx)`  
    > `FOREIGN KEY (listing_idx)`  
    > `CHECK(price >= 0)`
    
    - listing_idx
    - price ( 상품 가격 )
    - product_status ( 상품 상태 )
    - trade_status [ `ON_SALE`, `CANCELED`, `SOLD` ]
- 7. 경매글 `auction_posts`
    
    > `PRIMARY KEY (listing_idx)`  
    > `FOREIGN KEY (listing_idx)`
    > 
    > `CHECK(start_price >= 0)`  
    > `CHECK(current_price >= start_price)`  
    > `CHECK(bid_unit >= 100)`  
    > `CHECK(ends_at > started_at)`
    
    - listing_idx
    - start_price
    - current_price [ `실시간 데이터는 몇개 데이터를 캐싱하기` ]
    - bid_unit (최소 입찰 단위) `이건 단위 고정으로?` 시작가//10` 으로 하는 느낌. 최소 50원이라던가 제한은 주기
    - started_at
    - ends_at ( 지금은 일단 started_at + 24 )
    - status [ `ON_GOING`, `FINISHED`, `CANCELED` ]
    - winning_bid_idx ( `실제 낙찰된 입찰 기록 번호` )
- 8. 경매 입찰 기록 (+실시간) `auction_bids`
    
    > `INDEX(listing_idx, bid_price DESC)`
    
    - idx
    - listing_idx( `경매 글 idx` )
    - bidder_idx (`입찰 시도자 idx`)
    - bid_price (`입찰 가격`)
    - created_at
- 9. 게시글 이미지 `post_images`
    
    > `UNIQUE(listing_idx, sort_order)`
    
    - idx
    - listing_idx
    - image_url
    - sort_order ( `가장 낮은 순번은 썸네일로` )
    - created_at
- 10. 채팅방 `chat_rooms`
    
    > `UNIQUE(listing_idx, buyer_idx)`  
    > `INDEX(buyer_idx, last_message_at DESC)`
    
    - idx
    - ~~seller_idx [ `거래별로 메시지를 파는 경우에는 제거 가능` ]~~
    - ~~UNIQUE[ `user1`, `user2` ] (`user1` < `user2`)~~
    - buyer_idx
    - listing_idx
    - created_at
    - updated_at
    - last_message_at
- 11. 채팅 메시지 `chat_messages`
    
    > `INDEX(chat_room_idx, created_at DESC, idx DESC)`
    
    - idx
    - chat_room_idx
    - sender_idx
    - message_type [ `TEXT`, `IMAGE`, `SYSTEM`, `PAYMENT_REQUEST`, `TRADE_COMPLETE` ]
    - transaction_idx [ `NULL` ] [ `PAYMENT_REQUEST`와 `TRADE_COMPLETE` 에서 참조할 `transaction.idx` ]
    - content `TEXT`
    - created_at
    - deleted_at
- 12. 거래내역 `transactions`
    
    > `UNIQUE(listing_idx) WHERE status IN (REQUESTED, COMPLETED)`
    
    - idx
    - listing_idx
    - seller_idx
    - buyer_idx
    - transaction_type [ `DIRECT_SALE`, `AUCTION` ]
    - status [ `REQUESTED`, `COMPLETED`, `CANCELED` ]
    - amount
    - created_at
    - updated_at
    - completed_at NULL
    - canceled_at NULL ( 취소된 날짜 )
    - canceled_by NULL ( `user_idx` )
    - cancel_reason NULL ( 취소 사유 )
- 13. 거래 후기 `reviews`
    
    > CHECK(rating BETWEEN 1 AND 10)  
    > CHECK(reviewer_idx <> reviewee_idx)  
    > UNIQUE(transaction_idx, reviewer_idx)
    
    - idx
    - transaction_idx (거래 기록)
    - reviewer_idx
    - reviewee_idx
    - rating
    - content
    - created_at
    - updated_at