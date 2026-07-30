# HTTP API 상세 명세

> 이 문서는 라우터/컨트롤러 구현 기준이다.
> 목록만 볼 때는 [[05. API와 이벤트/HTTP API 목록]]을 사용한다.

## 1. 공통 규칙

### Base URL

```text
/api
```

### 인증 쿠키

| Cookie | 용도 | Max-Age | Path | httpOnly | SameSite | Secure |
|---|---|---:|---|---|---|---|
| `access_token` | 보호 API 인증 | 15분 | `/` | true | `Lax` | 운영 true |
| `refresh_token` | 토큰 재발급 | 7일 | `/api/auth/refresh` | true | `Lax` | 운영 true |

- 프론트 요청은 `withCredentials: true`를 사용한다.
- Auth가 `USER`, `판매자`, `구매자`, `참여자`, `ADMIN`인 API는 `access_token` 쿠키가 필요하다.
- `/api/auth/refresh`는 `refresh_token` 쿠키가 필요하고, 요청 body는 없다.
- 로그아웃 시 서버는 `access_token`과 `refresh_token`을 모두 만료 쿠키로 내려준다.
- Refresh Token rotation 적용 시 재발급 성공마다 두 쿠키를 다시 설정한다.

### 성공 응답

```json
{
  "success": true,
  "data": {}
}
```

### 실패 응답

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해주세요."
}
```

### 페이지네이션 Query

| Field | Type | Required | Default | 설명 |
|---|---|---|---|---|
| `page` | number | N | `1` | 1부터 시작 |
| `limit` | number | N | `10` | 목록 개수 |

목록 응답 공통:

```json
{
  "items": [],
  "page": 1,
  "limit": 10,
  "totalCount": 0,
  "totalPages": 0
}
```

## 2. 인증

### `POST /api/auth/signup`

회원가입 후 로그인 쿠키를 발급한다.

Cookies: 없음

Body:

```json
{
  "name": "홍길동",
  "nickname": "감자왕",
  "loginId": "potato123",
  "password": "Password123!",
  "passwordConfirm": "Password123!",
  "phoneVerificationId": "phone_verification_id",
  "email": "user@example.com",
  "termsAgreed": true,
  "privacyAgreed": true
}
```

Response:

```json
{
  "userIdx": 1,
  "role": "USER",
  "nickname": "감자왕"
}
```

Set-Cookie: `access_token`, `refresh_token`

### `GET /api/auth/check-id`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `loginId` | string | Y | 중복 확인할 아이디 |

Response:

```json
{
  "available": true
}
```

### `POST /api/auth/phone/send`

Body:

```json
{
  "phone": "01012345678",
  "purpose": "SIGNUP"
}
```

`purpose`: `SIGNUP`, `FIND_ID`, `RESET_PASSWORD`, `CHANGE_PASSWORD`, `CHANGE_PHONE`

Response:

```json
{
  "phoneVerificationId": "phone_verification_id",
  "expiresInSeconds": 180,
  "resendAfterSeconds": 30
}
```

### `POST /api/auth/phone/verify`

Body:

```json
{
  "phoneVerificationId": "phone_verification_id",
  "code": "123456"
}
```

Response:

```json
{
  "verified": true,
  "phoneVerificationId": "phone_verification_id"
}
```

### `GET /api/auth/phone/status`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `phoneVerificationId` | string | Y | 인증 식별자 |

Response:

```json
{
  "verified": true,
  "purpose": "SIGNUP",
  "phone": "01012345678"
}
```

### `DELETE /api/auth/phone/status`

Body:

```json
{
  "phoneVerificationId": "phone_verification_id"
}
```

Response:

```json
{
  "cleared": true
}
```

### `POST /api/auth/login`

Body:

```json
{
  "loginId": "potato123",
  "password": "Password123!",
  "rememberLoginId": true
}
```

Response:

```json
{
  "userIdx": 1,
  "role": "USER",
  "nickname": "감자왕"
}
```

Set-Cookie: `access_token`, `refresh_token`

### `POST /api/auth/logout`

Cookies: `access_token` 권장, 없어도 처리 가능

Body: 없음

Response:

```json
{
  "loggedOut": true
}
```

Set-Cookie: `access_token` 만료, `refresh_token` 만료

### `POST /api/auth/refresh`

Cookies: `refresh_token`

Body: 없음

Response:

```json
{
  "refreshed": true
}
```

Set-Cookie: 새 `access_token`, 새 `refresh_token`

### `GET /api/auth/me`

Cookies: `access_token`

Response:

```json
{
  "userIdx": 1,
  "loginId": "potato123",
  "nickname": "감자왕",
  "role": "USER",
  "banned": false
}
```

### `POST /api/auth/find-id`

전화번호 인증 완료 후 아이디를 팝업에 표시한다. SMS로 아이디를 보내지 않는다.

Body:

```json
{
  "name": "홍길동",
  "phoneVerificationId": "phone_verification_id"
}
```

Response:

```json
{
  "loginId": "potato123"
}
```

### `POST /api/auth/password/reset`

Body:

```json
{
  "name": "홍길동",
  "loginId": "potato123",
  "phoneVerificationId": "phone_verification_id",
  "newPassword": "NewPassword123!",
  "newPasswordConfirm": "NewPassword123!"
}
```

Response:

```json
{
  "reset": true
}
```

## 3. 사용자/프로필

### `GET /api/users/:userIdx/profile`

Params: `userIdx`

Cookies: optional `access_token`

Response:

```json
{
  "userIdx": 2,
  "nickname": "판매자",
  "profileImageUrl": "/resources/profiles/2.png",
  "bio": "상태 메시지",
  "sellCount": 3,
  "buyCount": 5,
  "averageRating": 4.8
}
```

### `GET /api/users/me`

Cookies: `access_token`

Response:

```json
{
  "userIdx": 1,
  "name": "홍길동",
  "loginId": "potato123",
  "nickname": "감자왕",
  "phone": "01012345678",
  "email": "user@example.com",
  "profileImageUrl": "/resources/profiles/1.png",
  "bio": "상태 메시지"
}
```

### `PATCH /api/users/me/profile`

Content-Type: `multipart/form-data`

Cookies: `access_token`

Form Data:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `profileImage` | file | N | 새 프로필 이미지 |
| `bio` | string | N | 소개글/상태 메시지 |

Response:

```json
{
  "profileImageUrl": "/resources/profiles/1.png",
  "bio": "상태 메시지"
}
```

### `POST /api/users/me/verify-password`

Cookies: `access_token`

Body:

```json
{
  "password": "현재비밀번호"
}
```

Response:

```json
{
  "verified": true,
  "verificationToken": "member_edit_verification_token"
}
```

### `PATCH /api/users/me`

회원 정보 수정 전 `POST /api/users/me/verify-password` 성공이 필요하다.

Cookies: `access_token`

Body:

```json
{
  "verificationToken": "member_edit_verification_token",
  "nickname": "새닉네임",
  "email": "new@example.com",
  "phoneVerificationId": "phone_verification_id"
}
```

Response:

```json
{
  "userIdx": 1,
  "nickname": "새닉네임",
  "email": "new@example.com",
  "phone": "01099998888"
}
```

### `PATCH /api/users/me/password`

Cookies: `access_token`

Body:

```json
{
  "verificationToken": "member_edit_verification_token",
  "newPassword": "NewPassword123!",
  "newPasswordConfirm": "NewPassword123!"
}
```

Response:

```json
{
  "changed": true
}
```

### `DELETE /api/users/me`

Cookies: `access_token`

Body:

```json
{
  "password": "현재비밀번호"
}
```

Response:

```json
{
  "deleted": true
}
```

Set-Cookie: `access_token` 만료, `refresh_token` 만료

## 4. 메인/검색

### `GET /api/main`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `limit` | number | N | 영역별 노출 개수 |

Response:

```json
{
  "usedListings": [],
  "auctionListings": [],
  "popularListings": []
}
```

### `GET /api/categories`

Response:

```json
{
  "items": [
    {
      "categoryIdx": 1,
      "name": "디지털"
    }
  ]
}
```

### `GET /api/search`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `q` | string | N | 검색어 |
| `type` | string | N | `USED`, `AUCTION`, `ALL` |
| `categoryIdx` | number | N | 카테고리 |
| `minPrice` | number | N | 최소 가격 |
| `maxPrice` | number | N | 최대 가격 |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

## 5. 중고거래

### `GET /api/used`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `q` | string | N | 검색어 |
| `categoryIdx` | number | N | 카테고리 |
| `status` | string | N | `ON_SALE`, `SOLD` |
| `minPrice` | number | N | 최소 가격 |
| `maxPrice` | number | N | 최대 가격 |
| `sort` | string | N | `latest`, `price_asc`, `price_desc` |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

### `POST /api/used`

Content-Type: `multipart/form-data`

Cookies: `access_token`

Form Data:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `title` | string | Y | 제목 |
| `description` | string | Y | 내용 |
| `categoryIdx` | number | Y | 카테고리 |
| `price` | number | Y | 판매가 |
| `preferredTradeLocation` | string | N | 희망 거래 장소 문자열 |
| `images` | file[] | N | 상품 이미지 |

Response:

```json
{
  "listingIdx": 1
}
```

### `GET /api/used/:listingIdx`

Params: `listingIdx`

Cookies: optional `access_token`

Response:

```json
{
  "listingIdx": 1,
  "title": "감자 키보드",
  "description": "상태 좋음",
  "price": 10000,
  "tradeStatus": "ON_SALE",
  "seller": {},
  "images": [],
  "isFavorite": false
}
```

### `PATCH /api/used/:listingIdx`

Cookies: `access_token`

Content-Type: `multipart/form-data`

Form Data: `POST /api/used`와 동일하되 수정할 필드만 전송 가능

Response:

```json
{
  "updated": true
}
```

### `DELETE /api/used/:listingIdx`

Cookies: `access_token`

Body:

```json
{
  "deleteReason": "판매자가 직접 삭제"
}
```

Response:

```json
{
  "deleted": true
}
```

### `POST /api/used/:listingIdx/favorite`

Cookies: `access_token`

Body: 없음

Response:

```json
{
  "favorited": true
}
```

### `DELETE /api/used/:listingIdx/favorite`

Cookies: `access_token`

Body: 없음

Response:

```json
{
  "favorited": false
}
```

## 6. 경매

### `GET /api/auctions`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `q` | string | N | 검색어 |
| `categoryIdx` | number | N | 카테고리 |
| `status` | string | N | `ON_GOING`, `FINISHED` |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |
| `sort` | string | N | `latest`, `ending_soon`, `price_desc` |

Response: 페이지네이션 공통 형식

### `POST /api/auctions`

Content-Type: `multipart/form-data`

Cookies: `access_token`

Form Data:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `title` | string | Y | 제목 |
| `description` | string | Y | 내용 |
| `categoryIdx` | number | Y | 카테고리 |
| `startPrice` | number | Y | 시작가 |
| `preferredTradeLocation` | string | N | 희망 거래 장소 문자열 |
| `images` | file[] | N | 상품 이미지 |

Response:

```json
{
  "listingIdx": 2,
  "startedAt": "2026-07-30T00:00:00.000Z",
  "endsAt": "2026-07-31T00:00:00.000Z"
}
```

### `GET /api/auctions/:listingIdx`

Params: `listingIdx`

Cookies: optional `access_token`

Response:

```json
{
  "listingIdx": 2,
  "title": "경매 상품",
  "startPrice": 10000,
  "currentPrice": 15000,
  "status": "ON_GOING",
  "startedAt": "2026-07-30T00:00:00.000Z",
  "endsAt": "2026-07-31T00:00:00.000Z",
  "seller": {},
  "highestBidder": {},
  "bidCount": 3,
  "isFavorite": false
}
```

### `PATCH /api/auctions/:listingIdx`

Cookies: `access_token`

Content-Type: `multipart/form-data`

Form Data: `POST /api/auctions`와 동일하되 수정 가능한 필드만 전송

Response:

```json
{
  "updated": true
}
```

### `DELETE /api/auctions/:listingIdx`

Cookies: `access_token`

Body:

```json
{
  "deleteReason": "판매자가 직접 삭제"
}
```

Response:

```json
{
  "deleted": true
}
```

### `POST /api/auctions/:listingIdx/bids`

Cookies: `access_token`

Body:

```json
{
  "bidAmount": 20000
}
```

Response:

```json
{
  "bidIdx": 10,
  "listingIdx": 2,
  "currentPrice": 20000,
  "highestBidderIdx": 1
}
```

### `GET /api/auctions/:listingIdx/bids`

Query: 페이지네이션 공통

Response: 페이지네이션 공통 형식

### `POST /api/auctions/:listingIdx/favorite`

Cookies: `access_token`

Body: 없음

Response:

```json
{
  "favorited": true
}
```

### `DELETE /api/auctions/:listingIdx/favorite`

Cookies: `access_token`

Body: 없음

Response:

```json
{
  "favorited": false
}
```

## 7. 채팅

### `GET /api/chats`

Cookies: `access_token`

Query: 페이지네이션 공통

Response: 페이지네이션 공통 형식

### `POST /api/chats`

Cookies: `access_token`

Body:

```json
{
  "listingIdx": 1
}
```

Response:

```json
{
  "chatRoomIdx": 1,
  "created": false
}
```

### `GET /api/chats/:chatRoomIdx`

Cookies: `access_token`

Params: `chatRoomIdx`

Response:

```json
{
  "chatRoomIdx": 1,
  "listing": {},
  "seller": {},
  "buyer": {},
  "lastReadMessageIdx": 100
}
```

### `GET /api/chats/:chatRoomIdx/messages`

Cookies: `access_token`

Query: 페이지네이션 공통

Response: 페이지네이션 공통 형식

### `POST /api/chats/:chatRoomIdx/messages/images`

채팅 텍스트는 Socket `chat:message:send`로 전송한다. 이 API는 이미지 메시지 업로드 전용이다.

Content-Type: `multipart/form-data`

Cookies: `access_token`

Form Data:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `image` | file | Y | 채팅 이미지 |

Response:

```json
{
  "messageIdx": 10,
  "messageType": "IMAGE",
  "imageUrl": "/resources/chats/10.png"
}
```

## 8. 거래/후기

### `POST /api/transactions/payment-requests`

판매자가 채팅에서 송금 요청을 만들 때 호출한다.

Cookies: `access_token`

Body:

```json
{
  "listingIdx": 1,
  "buyerIdx": 2,
  "amount": 10000,
  "message": "송금 요청드립니다."
}
```

Response:

```json
{
  "transactionIdx": 1,
  "status": "REQUESTED"
}
```

### `GET /api/transactions/:transactionIdx`

Cookies: `access_token`

Params: `transactionIdx`

Response:

```json
{
  "transactionIdx": 1,
  "listing": {},
  "seller": {},
  "buyer": {},
  "amount": 10000,
  "status": "REQUESTED"
}
```

### `PATCH /api/transactions/:transactionIdx/complete`

구매자가 송금 완료 버튼을 누를 때 호출한다.

Cookies: `access_token`

Body:

```json
{
  "confirm": true
}
```

Response:

```json
{
  "transactionIdx": 1,
  "status": "COMPLETED"
}
```

### `PATCH /api/transactions/:transactionIdx/cancel`

판매자가 송금 요청을 취소할 때 호출한다.

Cookies: `access_token`

Body:

```json
{
  "cancelReason": "다른 구매자와 거래하기로 함"
}
```

Response:

```json
{
  "transactionIdx": 1,
  "status": "CANCELED"
}
```

### `POST /api/reviews`

구매자와 판매자 모두 완료 거래에 대해 서로에게 1회씩 작성할 수 있다.

Cookies: `access_token`

Body:

```json
{
  "transactionIdx": 1,
  "revieweeIdx": 2,
  "rating": 5,
  "content": "좋은 거래였습니다."
}
```

Response:

```json
{
  "reviewIdx": 1
}
```

### `GET /api/users/:userIdx/reviews`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `type` | string | N | `ALL`, `SELLER_REVIEW`, `BUYER_REVIEW` |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

## 9. 마이페이지

### `GET /api/mypage/me/listings`

Cookies: `access_token`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `type` | string | N | `ALL`, `USED`, `AUCTION` |
| `status` | string | N | 상태 필터 |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

### `GET /api/mypage/me/favorites`

Cookies: `access_token`

Query: 페이지네이션 공통

Response: 페이지네이션 공통 형식

### `GET /api/mypage/me/history`

Cookies: `access_token`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `type` | string | N | `ALL`, `SELL`, `BUY`, `BID` |
| `status` | string | N | 거래 상태 |
| `q` | string | N | 상품명 검색 |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

### `GET /api/mypage/me/reviews`

Cookies: `access_token`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `type` | string | N | `ALL`, `SELLER_REVIEW`, `BUYER_REVIEW` |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

### `GET /api/mypage/:userIdx/listings`

Params: `userIdx`

Query: `type`, `page`, `limit`

Response: 페이지네이션 공통 형식

### `GET /api/mypage/:userIdx/reviews`

Params: `userIdx`

Query: `type`, `page`, `limit`

Response: 페이지네이션 공통 형식

## 10. 알림

### `GET /api/notifications`

Cookies: `access_token`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `unreadOnly` | boolean | N | 안읽음만 조회 |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

### `PATCH /api/notifications/:notificationIdx/read`

Cookies: `access_token`

Params: `notificationIdx`

Body: 없음

Response:

```json
{
  "read": true
}
```

### `PATCH /api/notifications/read-all`

Cookies: `access_token`

Body: 없음

Response:

```json
{
  "readCount": 3
}
```

### `GET /api/notifications/unread-count`

Cookies: `access_token`

Response:

```json
{
  "unreadCount": 5
}
```

## 11. 관리자

모든 관리자 API는 `access_token` 쿠키가 필요하고, 사용자 role이 `ADMIN`이어야 한다.

### `GET /api/admin/dashboard`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `from` | string | N | `YYYY-MM-DD` |
| `to` | string | N | `YYYY-MM-DD` |

Response:

```json
{
  "userCount": 10,
  "listingCount": 20,
  "auctionCount": 5,
  "transactionCount": 3
}
```

### `GET /api/admin/users`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `q` | string | N | 이름/아이디/닉네임 검색 |
| `status` | string | N | `ACTIVE`, `BANNED`, `DELETED` |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

### `GET /api/admin/users/:userIdx`

Params: `userIdx`

Response:

```json
{
  "user": {},
  "tradeSummary": {},
  "reviewSummary": {},
  "adminMemo": "관리자 메모"
}
```

### `PATCH /api/admin/users/:userIdx/ban`

관리자 화면의 회원 삭제 버튼에 대응한다. 실제 user row는 삭제하지 않고 `banned_at`을 저장한다.

Body:

```json
{
  "reason": "운영 정책 위반"
}
```

Response:

```json
{
  "banned": true
}
```

### `PATCH /api/admin/users/:userIdx/memo`

Body:

```json
{
  "memo": "관리자 메모"
}
```

Response:

```json
{
  "saved": true
}
```

### `GET /api/admin/used`

Query: `q`, `status`, `page`, `limit`

Response: 페이지네이션 공통 형식

### `DELETE /api/admin/used/:listingIdx`

Body:

```json
{
  "deleteReason": "관리자 삭제"
}
```

Response:

```json
{
  "deleted": true
}
```

### `GET /api/admin/auctions`

Query: `q`, `status`, `page`, `limit`

Response: 페이지네이션 공통 형식

### `DELETE /api/admin/auctions/:listingIdx`

Body:

```json
{
  "deleteReason": "관리자 삭제"
}
```

Response:

```json
{
  "deleted": true
}
```

### `GET /api/admin/auctions/winners`

Query:

| Field | Type | Required | 설명 |
|---|---|---|---|
| `q` | string | N | 상품명/회원 검색 |
| `page` | number | N | 페이지 |
| `limit` | number | N | 개수 |

Response: 페이지네이션 공통 형식

## 12. 구현 시 검증 포인트

- `deleted_at IS NOT NULL`인 게시글/경매는 일반 목록/검색/상세/마이페이지/외부 프로필에서 제외한다.
- 종료 경매는 삭제되지 않았다면 조회와 관심 등록은 허용하고, 입찰/채팅은 차단한다.
- 정지 사용자는 로그인, 토큰 재발급, 보호 API, Socket 연결을 차단한다.
- 전화번호/이메일은 탈퇴 또는 영구정지 후에도 재사용할 수 없다.
- 판매자는 같은 게시글의 같은 구매자에게 `REQUESTED` 송금 요청을 중복 생성할 수 없다.
- 후기는 `COMPLETED` 거래의 구매자/판매자만 작성할 수 있고, `transactionIdx + reviewerIdx` 기준 1회만 허용한다.
