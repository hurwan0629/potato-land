# C. 중고거래

## 1. 목적

사용자가 중고 상품을 등록하고, 구매 희망자와 채팅을 통해 거래를 진행하며, 거래 완료 후 후기를 남길 수 있게 한다.

## 2. 액터

- 판매자
- 구매자
- 관리자

## 3. 사전 조건

- 판매자는 로그인 상태이며 정지되지 않아야 한다.
- 구매자는 로그인 상태이며 정지되지 않아야 한다.
- 상품 카테고리가 활성화되어 있어야 한다.

## 4. 주요 기능

- 중고거래 글 작성
- 중고거래 글 목록 조회
- 중고거래 글 상세 조회
- 중고거래 글 취소
- 채팅 문의
- 거래 요청
- 거래 완료
- 거래 취소
- 후기 작성

## 5. 정상 플로우

1. 판매자가 중고거래 글 작성 페이지에 접근한다.
2. 판매자는 제목, 설명, 가격, 상품 상태, 희망 거래 장소, 카테고리, 이미지를 입력한다.
3. 서버는 `listings`, `used_posts`, `post_images`를 저장한다.
4. 구매자는 목록 또는 검색 결과에서 상품을 조회한다.
5. 구매자는 상세 페이지에서 채팅을 시작한다.
6. 서버는 `chat_rooms`를 생성하거나 기존 방을 반환한다.
7. 구매자와 판매자는 채팅으로 거래를 협의한다.
8. 거래 요청이 생성되면 `transactions`가 `REQUESTED`로 생성된다.
9. 거래 완료 시 `transactions.status = COMPLETED`, `used_posts.trade_status = SOLD`로 변경한다.
10. 거래 완료 후 구매자와 판매자는 후기를 작성할 수 있다.

## 6. 취소 정책

- 판매자는 판매중 상태의 글을 취소할 수 있다.
- 취소 시 `used_posts.trade_status = CANCELED`로 변경한다.
- 삭제와 숨김은 하지 않는다.
- 취소된 글은 거래 요청, 관심 추가, 채팅 시작 버튼을 비활성화한다.

## 7. 예외 플로우

- 정지 사용자의 글 작성
- 판매자가 자기 글에 채팅 시도
- 이미 판매완료된 상품 거래 요청
- 이미 활성 거래가 존재하는 상품에 중복 거래 요청
- 잘못된 가격 또는 상품 상태
- 이미지 업로드 실패

## 8. 관련 DB

- `listings`
- `used_posts`
- `post_images`
- `chat_rooms`
- `chat_messages`
- `transactions`
- `reviews`
- `notifications`

## 9. 관련 API

- `GET /api/used`
- `POST /api/used`
- `GET /api/used/:listingIdx`
- `PATCH /api/used/:listingIdx/cancel`
- `POST /api/chats`
- `POST /api/transactions`
- `PATCH /api/transactions/:transactionIdx/complete`
- `POST /api/reviews`

## 10. 구현 체크리스트

- [ ] 중고거래 글 작성
- [ ] 이미지 업로드
- [ ] 목록/검색 조회
- [ ] 상세 조회
- [ ] 판매자 본인 여부 판단
- [ ] 취소 처리
- [ ] 채팅방 생성
- [ ] 거래 요청/완료/취소
- [ ] 후기 작성 가능 조건 검증
