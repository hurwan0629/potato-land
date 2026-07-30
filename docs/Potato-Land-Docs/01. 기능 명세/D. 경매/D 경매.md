# D. 경매

## 1. 목적

사용자가 경매 상품을 등록하고, 다른 사용자가 실시간으로 입찰하며, 종료 시점에 서버가 낙찰을 확정하도록 한다.

## 2. 액터

- 판매자
- 입찰자
- 관리자
- 경매 Timer
- 복구 Scheduler

## 3. 사전 조건

- 판매자와 입찰자는 로그인 상태이며 정지되지 않아야 한다.
- Redis가 정상 동작해야 입찰을 받을 수 있다.
- 경매 상태가 `ON_GOING`이어야 입찰할 수 있다.
- 삭제된 경매는 조회하거나 입찰할 수 없다.

## 4. 주요 기능

- 경매 글 작성
- 경매 목록/검색 조회
- 경매 상세 조회
- 경매 글 수정
- 경매 글 삭제
- 입찰
- 실시간 현재가 갱신
- 경매 종료 Timer
- 경매 Timer 복구
- 낙찰 확정

## 5. 입찰 플로우

1. 입찰자가 경매 상세 페이지에서 입찰가를 입력한다.
2. 서버는 로그인, 정지 여부, 본인 경매 여부, 삭제 여부, 경매 상태, 종료 시간을 검증한다.
3. 서버는 Redis에서 현재 최고 입찰가를 확인한다.
4. 서버는 Redis Lua script 또는 원자 처리로 최소 입찰가 비교와 최고 입찰자 갱신을 한 번에 처리한다.
5. 입찰 성공 시 `auction_bids`에 저장하고 `auction_posts.current_price`를 갱신한다.
6. Socket.IO로 해당 경매방에 현재가 갱신 이벤트를 보낸다.
7. 기존 최고 입찰자가 밀려난 경우 `OUTBID` 알림을 만든다.
8. 판매자에게 `NEW_BID` 알림을 만든다.

## 6. 종료 플로우

1. 경매 등록 시 서버는 기본 24시간 종료 Timer를 등록한다.
2. 서버 시작 시 진행 중 경매 Timer를 복원한다.
3. 복구용 Scheduler는 Timer 누락 또는 서버 장애로 종료되지 않은 경매를 확인한다.
4. 종료 시 Redis와 DB 입찰 내역을 기준으로 최고 입찰을 확인한다.
5. 입찰자가 있으면 `FINISHED`와 `winning_bid_idx`를 저장한다.
6. 입찰자가 없으면 `FINISHED`로 종료하고 유찰 알림을 만든다.
7. 낙찰자와 판매자에게 알림을 저장한다.
8. 접속 중인 사용자가 있으면 Socket.IO로 종료 이벤트를 보낸다.

## 7. 수정/삭제 정책

- 판매자는 본인이 작성한 경매글을 수정할 수 있다.
- 판매자는 본인이 작성한 경매글을 삭제할 수 있다.
- 관리자는 경매글을 삭제할 수 있다.
- 삭제는 물리 삭제가 아니라 `listings.deleted_at`, `deleted_by`, `delete_reason`으로 처리한다.
- 삭제된 경매는 목록, 검색, 상세, 마이페이지, 외부 프로필에서 조회되지 않는다.
- 삭제된 경매와 연결된 입찰, 거래, 채팅, 후기 이력은 DB에서 보존한다.
- 종료된 경매도 삭제할 수 있다.
- 경매 취소 상태는 사용하지 않는다.

## 8. 종료 경매 화면 정책

- 종료된 경매는 삭제되지 않았다면 일반 사용자 화면에서 조회 가능하다.
- 종료된 경매는 입찰과 채팅이 비활성화된다.
- 종료된 경매에도 관심 추가는 가능하다.
- 경매 상세의 목록 버튼은 경매 메인 목록으로 이동한다.

## 9. Redis 장애 정책

- Redis 장애 시 신규 입찰은 차단한다.
- PostgreSQL의 `auction_posts`, `auction_bids`를 기준으로 Redis 상태를 복원할 수 있어야 한다.
- Redis persistence는 보조 수단이며 최종 영속 데이터 기준은 PostgreSQL이다.

## 10. Worker 확장안

MVP는 입찰 성공 시 DB에 즉시 저장한다. 확장 시 Redis Stream을 사용할 수 있다.

```text
XADD auction:bid:stream * listingIdx 1 bidderIdx 2 bidPrice 10000
```

Worker는 stream을 읽어 DB 저장과 재시도를 담당한다.

## 11. 관련 DB

- `listings`
- `auction_posts`
- `auction_bids`
- `post_images`
- `favorites`
- `notifications`
- `transactions`
- `chat_rooms`

## 12. 관련 API

- `GET /api/auctions`
- `POST /api/auctions`
- `GET /api/auctions/:listingIdx`
- `PATCH /api/auctions/:listingIdx`
- `DELETE /api/auctions/:listingIdx`
- `POST /api/auctions/:listingIdx/bids`
- `GET /api/auctions/:listingIdx/bids`

## 13. 관련 Socket 이벤트

- `auction:join`
- `auction:leave`
- `auction:bid-updated`
- `auction:ended`
- `auction:won`
- `auction:outbid`

## 14. 구현 체크리스트

- [ ] 경매 글 작성
- [ ] 경매 목록/검색 조회
- [ ] 경매 상세 조회
- [ ] 경매 수정 처리
- [ ] 경매 삭제 처리
- [ ] Redis 경매 상태 생성
- [ ] 입찰 원자 처리
- [ ] DB 입찰 저장
- [ ] Socket 현재가 갱신
- [ ] 경매별 Timer 등록
- [ ] 서버 시작 시 Timer 복원
- [ ] 복구 Scheduler 종료 누락 확인
- [ ] 낙찰/유찰 알림
- [ ] 종료 경매 버튼 비활성화
