# API와 Socket

- [HTTP API 목록](./HTTP%20API%20목록.md)
- [Socket 이벤트 계약](./Socket%20이벤트%20계약.md)

HTTP 표의 `실제 실행 경로`는 요약이다. DB transaction, Redis, 알림, Socket의 상세 순서는 `05. 실행 흐름`을 함께 확인한다.

## 공통 응답

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "사용자에게 표시할 메시지",
  "details": null
}
```

인증 API는 HttpOnly cookie를 사용한다. 프런트는 `credentials: "include"`로 요청하고 401 발생 시 Refresh를 한 번 수행한 뒤 원 요청을 재시도한다.
