# 다이어그램

## 인증과 API 요청

```mermaid
sequenceDiagram
  participant C as React Client
  participant A as Express Auth
  participant R as Redis
  participant D as PostgreSQL

  C->>A: API request + Access cookie
  A->>D: current user 조회
  D-->>A: role / deleted_at / banned_at
  alt Access 만료
    C->>A: POST /auth/refresh + Refresh cookie
    A->>R: Lua compare-and-rotate
    R-->>A: rotated session
    A-->>C: new cookies
  end
  A-->>C: API response
```

## 입찰

```mermaid
sequenceDiagram
  participant B as Bidder
  participant API as Auction Service
  participant DB as PostgreSQL
  participant R as Redis
  participant S as Socket.IO

  B->>API: POST bid
  API->>DB: SELECT auction FOR UPDATE
  API->>DB: INSERT bid + UPDATE current_price
  API->>DB: INSERT OUTBID notification
  DB-->>API: COMMIT
  API->>R: state + ZADD bidder
  API->>S: bid-updated / leader-changed
  API->>S: outbid + notification
  API-->>B: current price DTO
```

## 낙찰

```mermaid
activityDiagram
  start
  :경매 행 잠금;
  if (이미 종료?) then (예)
    :멱등 반환;
    stop
  endif
  :최고 유효 입찰자 조회;
  if (낙찰자 있음?) then (예)
    :거래 생성;
    :판매자-낙찰자 채팅방 생성/재사용;
    :SYSTEM 메시지와 알림 저장;
  else (아니오)
    :판매자 무입찰 종료 알림 저장;
  endif
  :DB commit;
  :Timer/Redis 정리;
  :Socket 이벤트 전송;
  stop
```
