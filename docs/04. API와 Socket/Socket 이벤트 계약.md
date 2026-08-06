# Socket 이벤트 계약

## 연결

1. Access Token cookie 검증
2. DB에서 현재 사용자 정지·탈퇴 상태 확인
3. `user:{userIdx}` room 자동 join
4. 현재 미확인 알림 수 전송

## Inbound

| 이벤트 | 입력 | 작업 |
|---|---|---|
| `chat:join` | `{ chatRoomIdx }` | 참여자 확인, active room 저장, 새 메시지 알림 읽음 |
| `chat:leave` | `{ chatRoomIdx }` | room leave, active room 해제 |
| `chat:message:send` | 메시지 DTO | 쓰기 가능 상태 확인, 멱등 저장, 알림 생성 |
| `chat:read` | `{ chatRoomIdx }` | 연결된 메시지 알림 일괄 읽음 |
| `auction:join` | `{ listingIdx }` | 삭제·종료 상태 확인 후 room join |
| `auction:leave` | `{ listingIdx }` | room leave |

## Outbound

| 이벤트 | Room | 목적 |
|---|---|---|
| `chat:message:new` | `chat:{id}` | 새 메시지 |
| `chat:room:new` | `user:{id}` | 새 채팅방 |
| `chat:room:updated` | `user:{id}` | 마지막 메시지·미확인 수 갱신 |
| `auction:bid-updated` | `auction:{id}` | 현재가·입찰 수 갱신 |
| `auction:leader-changed` | `auction:{id}` | 최고 입찰자 갱신 |
| `auction:ended` | `auction:{id}` | 종료·낙찰 결과 |
| `auction:deleted` | `auction:{id}` | 상세·목록에서 제거 |
| `auction:won` | `user:{id}` | 낙찰자 개인 이벤트 |
| `auction:outbid` | `user:{id}` | 이전 최고 입찰자 추월 이벤트 |
| `notification:new` | `user:{id}` | 정규화된 알림 DTO |
| `notification:unread-count` | `user:{id}` | 절대 미확인 개수 |

모든 inbound 요청은 acknowledgement로 `{ success, data }` 또는 `{ success:false, code, message }`를 반환한다.
