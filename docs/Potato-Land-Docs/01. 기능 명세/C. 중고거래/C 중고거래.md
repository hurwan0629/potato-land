# C. 중고거래

## 1. 목적

사용자가 중고 상품을 등록하고, 구매 희망자와 채팅을 통해 거래를 진행하며, 거래 완료 후 서로 후기를 남길 수 있게 한다.

## 2. 액터

- 판매자
- 구매자
- 관리자

## 3. 사전 조건

- 판매자는 로그인 상태이며 정지되지 않아야 한다.
- 구매자는 로그인 상태이며 정지되지 않아야 한다.
- 상품 카테고리가 활성화되어 있어야 한다.
- 삭제된 글은 일반 사용자 화면에서 조회되지 않는다.

## 4. 주요 기능

- 중고거래 글 작성
- 중고거래 글 목록 조회
- 중고거래 글 상세 조회
- 중고거래 글 수정
- 중고거래 글 삭제
- 채팅 문의
- 송금 요청
- 송금 요청 취소
- 거래 완료
- 후기 작성

## 5. 정상 플로우

1. 판매자가 중고거래 글 작성 페이지에 접근한다.
2. 판매자는 제목, 설명, 가격, 상품 상태, 희망 거래 장소, 카테고리, 이미지를 입력한다.
3. 서버는 `listings`, `used_posts`, `post_images`를 저장한다.
4. 구매자는 목록 또는 검색 결과에서 상품을 조회한다.
5. 구매자는 상세 페이지에서 채팅을 시작한다.
6. 서버는 `chat_rooms`를 생성하거나 기존 방을 반환한다.
7. 구매자와 판매자는 채팅으로 거래를 협의한다.
8. 판매자가 채팅방에서 송금 요청을 생성하면 `transactions.status = REQUESTED`가 된다.
9. 구매자는 채팅방의 송금 요청 링크로 송금 페이지에 접근한다.
10. 구매자가 송금하면 같은 transaction에서 `transactions.status = COMPLETED`, `used_posts.trade_status = SOLD`, `TRADE_COMPLETE` 시스템 메시지, 판매자 `PAYMENT_RECEIVED` 알림을 저장한다.
11. 거래 완료 후 구매자와 판매자는 서로 후기를 작성할 수 있다.

## 6. 수정/삭제 정책

- 판매자는 본인이 작성한 중고글을 수정할 수 있다.
- 판매자는 본인이 작성한 중고글을 삭제할 수 있다.
- 관리자는 중고글을 삭제할 수 있다.
- 삭제는 물리 삭제가 아니라 `listings.deleted_at`, `deleted_by`, `delete_reason`으로 처리한다.
- 삭제된 글은 목록, 검색, 관심목록, 상세, 마이페이지, 외부 프로필에서 조회되지 않는다.
- 삭제된 글 상세 URL에 직접 접근하면 `404 NOT_FOUND`를 반환한다.
- 삭제 시 해당 글의 `favorites` 행은 삭제한다.
- 삭제된 글과 연결된 채팅, 거래, 후기 이력은 DB에서 보존한다.
- 완료된 거래내역에서는 과거 상품 정보만 조회할 수 있고 게시글 상세 이동은 비활성화한다.
- 중고글 취소 상태는 사용하지 않는다.

## 7. 송금 요청 정책

- 송금 요청은 채팅방에서 판매자만 생성할 수 있다.
- 판매자는 같은 상품과 같은 구매 희망자에게 활성 송금 요청을 2개 이상 만들 수 없다.
- 송금 요청 생성 시 `transactions.status = REQUESTED`가 된다.
- 판매자가 송금 요청을 취소하면 `transactions.status = CANCELED`가 된다.
- 송금 요청 취소 시 구매자에게 `PAYMENT_CANCELED` 알림을 저장한다.
- 구매자가 송금하면 `transactions.status = COMPLETED`가 된다.
- 송금 요청 취소는 게시글 취소가 아니다.
- 송금 요청 취소 사유는 저장하지 않는다.
- 송금 요청 취소 시각은 별도 컬럼 없이 `transactions.updated_at`으로 판단한다.
- 구매자 또는 판매자가 탈퇴/영구정지되면 진행 중인 `REQUESTED` 거래를 `CANCELED`로 변경한다.
- 삭제/정지/탈퇴 사용자에게는 새 송금 요청을 생성할 수 없다.

## 8. 예외 플로우

- 정지 사용자의 글 작성
- 판매자가 자기 글에 채팅 시도
- 삭제된 상품 접근
- 삭제된 상품 상세 접근 시 404
- 이미 판매완료된 상품 송금 요청
- 비활성 사용자 대상 송금 요청
- 이미 활성 송금 요청이 존재하는 상품/구매자 조합
- 잘못된 가격 또는 상품 상태
- 이미지 업로드 실패

## 9. 관련 DB

- `listings`
- `used_posts`
- `post_images`
- `chat_rooms`
- `chat_messages`
- `transactions`
- `reviews`
- `notifications`

## 10. 관련 API

- `GET /api/used`
- `POST /api/used`
- `GET /api/used/:listingIdx`
- `PATCH /api/used/:listingIdx`
- `DELETE /api/used/:listingIdx`
- `POST /api/chats`
- `POST /api/transactions/payment-requests`
- `PATCH /api/transactions/:transactionIdx/complete`
- `PATCH /api/transactions/:transactionIdx/cancel`
- `POST /api/reviews`

## 11. 관련 Socket 이벤트

- `chat:message:send`
- `chat:message:new`
- `chat:room:updated`
- `notification:new`

## 12. 구현 체크리스트

- [ ] 중고거래 글 작성
- [ ] 이미지 업로드
- [ ] 목록/검색 조회
- [ ] 상세 조회
- [ ] 판매자 본인 여부 판단
- [ ] 수정 처리
- [ ] 삭제 처리
- [ ] 삭제 시 favorites 삭제
- [ ] 채팅방 생성
- [ ] 송금 요청/완료/취소
- [ ] 사용자 비활성화 시 REQUESTED 거래 CANCELED 처리
- [ ] 후기 작성 가능 조건 검증
