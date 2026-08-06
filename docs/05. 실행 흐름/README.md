# 실행 흐름

API를 구현하거나 검토할 때 아래 순서가 실제 코드와 일치하는지 확인한다.

```text
인증·권한
→ 입력 검증
→ DB 조회·필요 시 FOR UPDATE
→ DB transaction과 알림 INSERT
→ commit
→ Redis 갱신·정리
→ Timer 갱신·정리
→ Socket room 전송
→ 응답 DTO
```

## 경매 등록

```text
POST /api/auctions
→ requireAuth
→ listingImageUpload.array("images", 4)
→ validateAuctionCreate
→ transaction
   → listings INSERT
   → auction_posts INSERT
   → post_images를 파일 수만큼 INSERT
→ commit
→ 종료 Timer 등록
→ Redis auction state 저장
→ listingIdx 응답
```

## 경매 입찰

```text
POST /api/auctions/:listingIdx/bids
→ requireAuth
→ listingIdx·bidAmount 검증
→ transaction
   → auction_posts + listings SELECT FOR UPDATE
   → 삭제·종료·판매자 본인·최소가 확인
   → auction_bids INSERT (원본 이력 보존)
   → auction_posts.current_price UPDATE
   → 이전 최고 입찰자 OUTBID notification INSERT
→ commit
→ Redis state와 bidder score 갱신
→ auction room: bid-updated, leader-changed
→ 이전 최고 입찰자 user room: outbid, notification:new, unread-count
```

순위 조회는 `DISTINCT ON (bidder_idx)`로 사용자별 최고 입찰만 반환한다.

## 경매 삭제

```text
DELETE /api/auctions/:listingIdx
→ 소유권 또는 ADMIN 확인
→ transaction
   → 전체 DISTINCT 입찰자 조회
   → listings 논리 삭제
   → favorites 삭제
   → 입찰자별 LISTING_DELETED notification INSERT
→ commit
→ Timer 취소
→ Redis state·bidders 삭제
→ auction room: auction:deleted
→ 입찰자 user room: notification:new, unread-count
```

DB 알림을 먼저 저장하므로 경매 화면을 보고 있지 않거나 오프라인인 입찰자도 다음 접속에서 삭제 사실을 확인한다.

## 경매 종료·낙찰 채팅

```text
Timer 또는 Recovery Scheduler
→ finalizeAuction
→ transaction
   → auction_posts SELECT FOR UPDATE
   → 최고 유효 입찰자 조회
   → FINISHED + winning_bid_idx UPDATE
   → AUCTION transaction 생성 또는 재사용
   → 판매자-낙찰자 chat_room 생성 또는 재사용
   → 새 방이면 SYSTEM message 생성
   → 판매자·낙찰자·미낙찰자 notification INSERT
→ commit
→ Timer·Redis 정리
→ auction:ended / auction:won
→ 새 방이면 양측 chat:room:new
→ 각 수신자 notification:new / unread-count
```

낙찰 알림은 `TRANSACTION`을 참조하므로 클릭 시 거래 확인 화면으로 이동한다.

## 채팅 메시지

```text
chat:message:send
→ Socket 사용자 인증
→ 채팅방 참여자 확인
→ 게시글·거래·사용자 상태로 쓰기 가능 여부 확인
→ clientMessageId 중복 확인
→ transaction
   → chat_messages INSERT
   → chat_rooms.last_message_at UPDATE
   → 상대가 방을 보고 있지 않으면 NEW_MESSAGE notification INSERT
→ commit
→ chat room: message:new
→ 양측 user room: room:updated
→ 필요 시 상대 user room: notification:new / unread-count
```

진행 중 경매에는 일반 개인 채팅방을 만들지 않는다. 경매 채팅은 낙찰 거래 생성 후에만 쓸 수 있다.

## 알림 모두 읽음

```text
PATCH /api/notifications/read-all
→ requireAuth
→ transaction
   → receiver_idx 일치 + is_read=false 행 UPDATE
   → is_read=true, read_at=COALESCE(read_at, NOW())
→ commit
→ user room: notification:unread-count { unreadCount: 0 }
```
