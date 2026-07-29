# Socket 이벤트 목록

> Socket.IO는 채팅, 경매, 알림에만 사용한다. 중요한 상태 변경은 서버 검증과 DB/Redis 처리가 끝난 뒤 emit한다.

## 1. 연결 정책

- 클라이언트는 로그인 후 Socket.IO에 연결한다.
- 서버는 쿠키 또는 handshake auth를 통해 사용자를 인증한다.
- 인증 실패 시 연결을 끊는다.
- 연결 성공 시 사용자 개인 room에 join한다.

```text
user:{userIdx}
chat:{chatRoomIdx}
auction:{listingIdx}
```

## 2. 공통 이벤트

| Direction | Event | 설명 |
|---|---|---|
| Server -> Client | `connect:success` | 연결 성공 |
| Server -> Client | `error` | 공통 에러 |
| Client -> Server | `presence:ping` | 접속 유지 확인 후보 |

## 3. 채팅 이벤트

| Direction | Event | 설명 |
|---|---|---|
| Client -> Server | `chat:join` | 채팅방 입장 |
| Client -> Server | `chat:leave` | 채팅방 퇴장 |
| Client -> Server | `chat:message:send` | 메시지 전송 |
| Server -> Client | `chat:message:new` | 새 메시지 수신 |
| Server -> Client | `chat:room:new` | 새 채팅방 생성 알림 |
| Server -> Client | `chat:read` | 읽음 처리 후보 |

### `chat:join`

```json
{
  "chatRoomIdx": 1
}
```

### `chat:message:new`

```json
{
  "chatRoomIdx": 1,
  "messageIdx": 10,
  "senderIdx": 2,
  "messageType": "TEXT",
  "content": "안녕하세요",
  "createdAt": "2026-07-29T00:00:00.000Z"
}
```

## 4. 경매 이벤트

| Direction | Event | 설명 |
|---|---|---|
| Client -> Server | `auction:join` | 경매 상세 room 입장 |
| Client -> Server | `auction:leave` | 경매 상세 room 퇴장 |
| Server -> Client | `auction:bid-updated` | 현재가 갱신 |
| Server -> Client | `auction:ended` | 경매 종료 |
| Server -> Client | `auction:canceled` | 경매 취소 |
| Server -> Client | `auction:won` | 낙찰자 개인 알림 |
| Server -> Client | `auction:outbid` | 최고 입찰자 밀림 |

### `auction:bid-updated`

```json
{
  "listingIdx": 1,
  "currentPrice": 50000,
  "highestBidderIdx": 3,
  "bidderNickname": "감자왕",
  "createdAt": "2026-07-29T00:00:00.000Z"
}
```

### `auction:canceled`

```json
{
  "listingIdx": 1,
  "reason": "경매가 취소되었습니다.",
  "disabledActions": ["favorite", "bid", "chat"]
}
```

## 5. 알림 이벤트

| Direction | Event | 설명 |
|---|---|---|
| Server -> Client | `notification:new` | 새 알림 |
| Server -> Client | `notification:unread-count` | 안읽은 알림 수 갱신 |
| Client -> Server | `notification:read` | 알림 읽음 처리 후보 |

### `notification:new`

```json
{
  "notificationIdx": 1,
  "notificationType": "NEW_MESSAGE",
  "referenceType": "CHAT_ROOM",
  "referenceIdx": 10,
  "content": "새 메시지가 도착했습니다.",
  "isRead": false,
  "createdAt": "2026-07-29T00:00:00.000Z"
}
```

## 6. 읽음 처리 정책

- 알림은 DB에 먼저 저장한다.
- 사용자가 현재 보고 있는 채팅방의 새 메시지 알림은 즉시 읽음 처리할 수 있다.
- 사용자가 경매 상세 화면을 보고 있어도 낙찰/취소처럼 중요한 알림은 DB에 남긴다.
- 프론트가 알림창을 열거나 알림을 클릭하면 읽음 API를 호출한다.

## 7. 구현 체크리스트

- [ ] Socket 인증
- [ ] 개인 room join
- [ ] 채팅 room join/leave
- [ ] 경매 room join/leave
- [ ] 메시지 저장 후 emit
- [ ] 입찰 성공 후 emit
- [ ] 스케줄러 종료 후 emit
- [ ] 알림 저장 후 push
- [ ] 미접속 사용자 알림 보존
- [ ] Socket 에러 응답 형식 통일
