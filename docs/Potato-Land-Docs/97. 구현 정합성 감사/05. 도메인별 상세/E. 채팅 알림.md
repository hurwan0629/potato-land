---
title: "채팅 알림 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 채팅·알림 상세

## 채팅

HTTP 5개와 Socket 4개 핵심 inbound 이벤트가 실제로 구현됐다.

- HTTP: 목록, 생성, 상세, 메시지 목록, 이미지 메시지
- Socket: `chat:join`, `chat:leave`, `chat:message:send`, `chat:read`
- 개인 room, 채팅 room
- 참가자 검증
- active room 상태
- 읽음 알림 update
- clientMessageId idempotency
- 수신자가 방을 보고 있으면 NEW_MESSAGE notification 생략
- 이미지 1장당 IMAGE message 1건

### 남은 문제

- 생성 응답 DTO가 문서보다 축약됨
- HTTP 상세 조회만으로 읽음 처리되지 않고 Socket join에 의존
- 이미지 URL prefix가 정적 mount와 불일치
- endpoint/Socket integration test 없음

## 알림

알림 4개 API는 현재 브랜치에서 문서 핵심 계약을 가장 잘 충족한다.

- 사용자별 목록
- unreadOnly, pagination
- 단건 owner check
- 전체 읽음
- read_at
- unread count
- commit 후 Socket 전파
