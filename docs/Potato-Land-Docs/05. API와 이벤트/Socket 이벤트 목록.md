# Socket 이벤트 목록

> Socket.IO는 채팅, 경매, 알림에만 사용한다.
> 중요한 상태 변경은 서버 검증과 DB/Redis 처리가 끝난 뒤 emit한다.

## 1. 연결 정책

- 클라이언트는 로그인 후 Socket.IO에 연결한다.
- 서버는 쿠키의 `access_token` 또는 handshake auth token을 검증한다.
- MVP 기본값은 쿠키 인증이다.
- 인증 실패, 탈퇴 사용자, 영구정지 사용자는 연결을 끊는다.
- 연결 성공 시 사용자 개인 room에 join한다.

```text
user:{userIdx}
chat:{chatRoomIdx}
auction:{listingIdx}
```

### Handshake 후보

쿠키 인증을 우선하지만, 프론트 구현이 어렵다면 handshake auth를 허용할 수 있다.

```js
io("http://localhost:3000", {
  withCredentials: true
})
```

또는

```js
io("http://localhost:3000", {
  auth: {
    accessToken: "access_token_value"
  }
})
```

## 2. Ack 규칙

Client -> Server 이벤트는 가능하면 Socket.IO ack callback을 사용한다.

### 성공 Ack

```json
{
  "success": true,
  "data": {}
}
```

### 실패 Ack

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "권한이 없습니다."
}
```

### 공통 에러 이벤트

서버가 ack callback으로 돌려주기 어려운 비동기 에러는 `error` 이벤트로 보낸다.

| Direction | Event | 설명 |
|---|---|---|
| Server -> Client | `error` | 공통 Socket 에러 |

Payload:

```json
{
  "code": "SOCKET_ERROR",
  "message": "요청을 처리할 수 없습니다.",
  "event": "chat:message:send",
  "details": {}
}
```

## 3. 채팅 이벤트

| Direction | Event | 설명 | Room |
|---|---|---|---|
| Client -> Server | `chat:join` | 채팅방 입장 | `chat:{chatRoomIdx}` |
| Client -> Server | `chat:leave` | 채팅방 퇴장 | `chat:{chatRoomIdx}` |
| Client -> Server | `chat:message:send` | 텍스트 메시지 전송 | `chat:{chatRoomIdx}` |
| Client -> Server | `chat:read` | 마지막으로 읽은 메시지 기준 읽음 처리 | `chat:{chatRoomIdx}` |
| Server -> Client | `chat:message:new` | 새 메시지 수신 | `chat:{chatRoomIdx}` |
| Server -> Client | `chat:room:new` | 새 채팅방 생성 알림 | `user:{userIdx}` |
| Server -> Client | `chat:room:updated` | 채팅 목록 갱신 | `user:{userIdx}` |
| Server -> Client | `chat:read:updated` | 상대방 읽음 상태 갱신 | `chat:{chatRoomIdx}` |

### `chat:join`

Client -> Server payload:

```json
{
  "chatRoomIdx": 1
}
```

Success ack:

```json
{
  "success": true,
  "data": {
    "chatRoomIdx": 1,
    "joined": true,
    "lastReadMessageIdx": 150
  }
}
```

검증:

- 로그인 사용자만 가능하다.
- 채팅방 참여자만 join할 수 있다.
- 게시글/경매가 삭제되었으면 채팅방 조회와 과거 메시지 조회는 가능하지만 새 메시지 전송은 차단한다.
- 성공 시 서버는 `socket.data.activeChatRoomIdx = chatRoomIdx`로 갱신한다.

### `chat:leave`

Client -> Server payload:

```json
{
  "chatRoomIdx": 1
}
```

Success ack:

```json
{
  "success": true,
  "data": {
    "chatRoomIdx": 1,
    "left": true
  }
}
```

처리:

- 성공 시 서버는 `socket.data.activeChatRoomIdx = null`로 정리한다.

### `chat:message:send`

Client -> Server payload:

```json
{
  "clientMessageId": "temp-uuid-1",
  "chatRoomIdx": 1,
  "messageType": "TEXT",
  "content": "안녕하세요"
}
```

Success ack:

```json
{
  "success": true,
  "data": {
    "clientMessageId": "temp-uuid-1",
    "messageIdx": 10,
    "createdAt": "2026-07-30T00:00:00.000Z"
  }
}
```

검증:

- `messageType`은 MVP에서 `TEXT`만 허용한다.
- 이미지 메시지는 `POST /api/chats/:chatRoomIdx/messages/images`로 업로드한다.
- 채팅방 참여자만 메시지를 보낼 수 있다.
- 정지/탈퇴 사용자는 메시지를 보낼 수 없다.
- 삭제된 게시글과 삭제된 경매에서는 새 메시지를 차단한다.
- 종료된 경매의 일반 채팅은 차단하되, 판매자·낙찰자의 `REQUESTED` 거래에 연결된 정산 채팅방은 허용한다.

### `chat:message:new`

Server -> Client payload:

```json
{
  "chatRoomIdx": 1,
  "messageIdx": 10,
  "senderIdx": 2,
  "senderNickname": "감자왕",
  "senderProfileImageUrl": "/resources/profiles/2.png",
  "messageType": "TEXT",
  "content": "안녕하세요",
  "imageUrl": null,
  "transactionIdx": null,
  "createdAt": "2026-07-30T00:00:00.000Z"
}
```

송금 요청 메시지인 경우:

```json
{
  "chatRoomIdx": 1,
  "messageIdx": 11,
  "senderIdx": 1,
  "senderNickname": "판매자",
  "messageType": "PAYMENT_REQUEST",
  "content": "송금 요청이 도착했습니다.",
  "imageUrl": null,
  "transactionIdx": 5,
  "paymentRequest": {
    "transactionIdx": 5,
    "amount": 10000,
    "status": "REQUESTED"
  },
  "createdAt": "2026-07-30T00:00:00.000Z"
}
```

### `chat:room:new`

Server -> Client payload:

```json
{
  "chatRoomIdx": 1,
  "listingIdx": 10,
  "listingTitle": "감자 키보드",
  "listingThumbnailUrl": "/resources/listings/10-1.png",
  "opponentIdx": 2,
  "opponentNickname": "상대방",
  "lastMessage": null,
  "unreadCount": 0,
  "createdAt": "2026-07-30T00:00:00.000Z"
}
```

### `chat:room:updated`

Server -> Client payload:

```json
{
  "chatRoomIdx": 1,
  "listingIdx": 10,
  "lastMessage": {
    "messageIdx": 10,
    "messageType": "TEXT",
    "content": "안녕하세요",
    "senderIdx": 2,
    "createdAt": "2026-07-30T00:00:00.000Z"
  },
  "unreadCount": 3,
  "updatedAt": "2026-07-30T00:00:00.000Z"
}
```

### `chat:read`

Client -> Server payload:

```json
{
  "chatRoomIdx": 1,
  "lastMessageIdx": 150
}
```

Success ack:

```json
{
  "success": true,
  "data": {
    "chatRoomIdx": 1,
    "lastReadMessageIdx": 150,
    "unreadCount": 0
  }
}
```

### `chat:read:updated`

Server -> Client payload:

```json
{
  "chatRoomIdx": 1,
  "readerIdx": 2,
  "lastReadMessageIdx": 150,
  "readAt": "2026-07-30T00:00:00.000Z"
}
```

## 4. 경매 이벤트

| Direction | Event | 설명 | Room |
|---|---|---|---|
| Client -> Server | `auction:join` | 경매 상세 room 입장 | `auction:{listingIdx}` |
| Client -> Server | `auction:leave` | 경매 상세 room 퇴장 | `auction:{listingIdx}` |
| Server -> Client | `auction:bid-updated` | 현재가 갱신 | `auction:{listingIdx}` |
| Server -> Client | `auction:leader-changed` | 최고 입찰자 재계산 | `auction:{listingIdx}` |
| Server -> Client | `auction:ended` | 경매 종료 | `auction:{listingIdx}` |
| Server -> Client | `auction:deleted` | 경매 삭제 | `auction:{listingIdx}` |
| Server -> Client | `auction:won` | 낙찰자 개인 알림 | `user:{winnerIdx}` |
| Server -> Client | `auction:outbid` | 최고 입찰자 밀림 | `user:{previousHighestBidderIdx}` |

### `auction:join`

Client -> Server payload:

```json
{
  "listingIdx": 1
}
```

Success ack:

```json
{
  "success": true,
  "data": {
    "listingIdx": 1,
    "joined": true,
    "status": "ON_GOING",
    "currentPrice": 50000,
    "highestBidderIdx": 3,
    "endsAt": "2026-07-31T00:00:00.000Z"
  }
}
```

검증:

- 삭제된 경매는 join할 수 없다.
- 종료된 경매는 join 자체는 가능하지만 입찰과 일반 신규 채팅은 비활성화한다. 연결된 `REQUESTED` 정산 거래 채팅은 별도 권한으로 처리한다.
- 성공 시 서버는 `socket.data.activeAuctionListingIdx = listingIdx`로 갱신한다.

### `auction:leave`

Client -> Server payload:

```json
{
  "listingIdx": 1
}
```

Success ack:

```json
{
  "success": true,
  "data": {
    "listingIdx": 1,
    "left": true
  }
}
```

처리:

- 성공 시 서버는 `socket.data.activeAuctionListingIdx = null`로 정리한다.

### `auction:bid-updated`

Server -> Client payload:

```json
{
  "listingIdx": 1,
  "bidIdx": 10,
  "currentPrice": 50000,
  "minNextBid": 51000,
  "highestBidderIdx": 3,
  "bidderNickname": "감자왕",
  "createdAt": "2026-07-30T00:00:00.000Z"
}
```

입찰 자체는 HTTP API `POST /api/auctions/:listingIdx/bids`로 처리한다.
Socket은 성공한 입찰 결과를 전파하는 용도다.

### `auction:outbid`

Server -> Client payload:

```json
{
  "listingIdx": 1,
  "listingTitle": "경매 상품",
  "previousBidAmount": 49000,
  "currentPrice": 50000,
  "newHighestBidderIdx": 3,
  "createdAt": "2026-07-30T00:00:00.000Z"
}
```

### `auction:leader-changed`

Server -> Client payload:

```json
{
  "listingIdx": 1,
  "currentPrice": 30000,
  "minNextBid": 31000,
  "highestBidderIdx": 4,
  "highestBidderNickname": "새입찰자",
  "reason": "LEADER_WITHDRAWN",
  "message": "최고 입찰자가 자리를 내주었습니다.",
  "changedAt": "2026-07-30T00:00:00.000Z"
}
```

다음 유효 입찰자가 없는 경우:

```json
{
  "listingIdx": 1,
  "currentPrice": 10000,
  "minNextBid": 11000,
  "highestBidderIdx": null,
  "highestBidderNickname": null,
  "reason": "LEADER_WITHDRAWN",
  "message": "최고 입찰자가 자리를 내주었습니다.",
  "changedAt": "2026-07-30T00:00:00.000Z"
}
```

내부 제재 사유는 payload에 담지 않는다.

### `auction:ended`

Server -> Client payload:

```json
{
  "listingIdx": 1,
  "status": "FINISHED",
  "finalPrice": 50000,
  "winnerIdx": 3,
  "winnerNickname": "감자왕",
  "endedAt": "2026-07-31T00:00:00.000Z"
}
```

종료된 경매는 입찰과 일반 신규 채팅이 비활성화되지만, 삭제되지 않았다면 조회와 관심 추가는 가능하다. 판매자·낙찰자의 정산 채팅은 거래 상태 기준으로 처리한다.

### `auction:deleted`

Server -> Client payload:

```json
{
  "listingIdx": 1,
  "deletedAt": "2026-07-30T00:00:00.000Z",
  "message": "경매가 삭제되었습니다.",
  "disabledActions": {
    "favorite": true,
    "bid": true,
    "chat": true,
    "paymentRequest": true
  }
}
```

진행 중 경매 삭제 후 DB commit, Redis 정리, Timer 정리가 끝난 뒤 전송한다.

### `auction:won`

Server -> Client payload:

```json
{
  "listingIdx": 1,
  "listingTitle": "경매 상품",
  "finalPrice": 50000,
  "sellerIdx": 2,
  "sellerNickname": "판매자",
  "endedAt": "2026-07-31T00:00:00.000Z"
}
```

## 5. 알림 이벤트

| Direction | Event | 설명 | Room |
|---|---|---|---|
| Server -> Client | `notification:new` | 새 알림 | `user:{userIdx}` |
| Server -> Client | `notification:unread-count` | 안읽은 알림 수 갱신 | `user:{userIdx}` |

### `notification:new`

Server -> Client payload:

```json
{
  "notificationIdx": 1,
  "notificationType": "NEW_MESSAGE",
  "referenceType": "CHAT_MESSAGE",
  "referenceIdx": 10,
  "content": "새 메시지가 도착했습니다.",
  "isRead": false,
  "createdAt": "2026-07-30T00:00:00.000Z"
}
```

사용 가능한 `notificationType`:

```text
NEW_CHAT_ROOM
NEW_MESSAGE
PAYMENT_REQUESTED
PAYMENT_RECEIVED
PAYMENT_CANCELED
NEW_REVIEW
NEW_BID
OUTBID
AUCTION_WON
AUCTION_ENDED
AUCTION_ENDED_WITHOUT_BID
AUCTION_LEADER_CHANGED
LISTING_DELETED
```

사용 가능한 `referenceType`:

```text
CHAT_ROOM
CHAT_MESSAGE
LISTING
TRANSACTION
REVIEW
AUCTION
```

### `notification:unread-count`

Server -> Client payload:

```json
{
  "unreadCount": 5
}
```

`unreadCount`는 증감값이 아니라 절대값이다.

## 6. 읽음 처리 정책

- 일반 알림은 DB에 먼저 저장한다.
- 채팅 메시지 알림은 수신자의 Socket 연결 중 `socket.data.activeChatRoomIdx === chatRoomIdx`인 연결이 없을 때만 `NEW_MESSAGE` row를 저장한다.
- 수신자가 해당 채팅방을 보고 있으면 `NEW_MESSAGE` row를 만들지 않는다.
- 채팅방을 보고 있는 사용자는 `chat:read`로 마지막 읽은 메시지 기준 읽음 상태를 갱신한다.
- `chat:read` 성공 후 서버는 해당 사용자에게 `notification:unread-count`를 보낸다.
- 상대방에게는 필요 시 `chat:read:updated`를 보내 읽음 상태를 갱신한다.
- 사용자가 경매 상세 화면을 보고 있어도 낙찰/종료처럼 중요한 알림은 DB에 남긴다.
- 프론트가 알림창을 열거나 알림을 클릭하면 HTTP 읽음 API를 호출한다.

## 7. 이벤트별 저장 책임

| Event | DB 저장 | Redis 사용 | 비고 |
|---|---|---|---|
| `chat:message:send` | `chat_messages`, 조건부 `notifications` | 없음 | 수신자가 해당 채팅방을 보고 있으면 NEW_MESSAGE 저장 생략 |
| `chat:read` | `chat_room_reads`, 조건부 `notifications.is_read` | 없음 | 저장된 메시지 알림이 있을 때만 읽음 처리 |
| `auction:bid-updated` | `auction_bids` | 필수 | HTTP 입찰 성공 후 emit |
| `auction:ended` | `auction_posts`, `notifications` | commit 후 state 삭제 | Timer 또는 Recovery Scheduler, 거래 자동 생성 없음 |
| `auction:deleted` | `listings`, `notifications` | 필수 | 경매 soft delete 후 emit |
| `auction:leader-changed` | `auction_posts`, `notifications` | 필수 | 최고 입찰자 비활성화 재계산 후 emit |
| `auction:won` | `notifications` | 없음 | 낙찰자 개인 알림 |
| `auction:outbid` | `notifications` | 없음 | 이전 최고 입찰자 개인 알림 |
| `notification:new` | `notifications` | 없음 | DB 저장 후 emit |

## 8. 구현 체크리스트

- [ ] Socket 인증
- [ ] 인증 실패/정지/탈퇴 사용자 연결 차단
- [ ] 개인 room join
- [ ] 채팅 room join/leave
- [ ] 경매 room join/leave
- [ ] Client -> Server 이벤트 ack 통일
- [ ] Socket 에러 이벤트 규격 통일
- [ ] 메시지 저장 후 `chat:message:new` emit
- [ ] 채팅 목록 갱신 `chat:room:updated` emit
- [ ] 현재 채팅방 수신자 NEW_MESSAGE 저장 생략
- [ ] 저장된 NEW_MESSAGE `chat:read` 읽음 처리
- [ ] 입찰 성공 후 `auction:bid-updated` emit
- [ ] 최고 입찰자 변경 시 `auction:outbid` emit
- [ ] 최고 입찰자 비활성화 재계산 시 `auction:leader-changed` emit
- [ ] 경매 Timer 종료 후 `auction:ended`, `auction:won` emit
- [ ] 진행 중 경매 삭제 후 `auction:deleted` emit
- [ ] 알림 저장 후 `notification:new` push
- [ ] 안읽음 수 변경 시 `notification:unread-count` emit
- [ ] 미접속 사용자 알림 DB 보존
