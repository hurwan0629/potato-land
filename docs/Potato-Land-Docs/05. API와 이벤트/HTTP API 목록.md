# HTTP API 목록

> Prefix 후보는 `/api`이다. 실제 구현 시 팀 라우터 스타일에 맞춰 경로명은 조정할 수 있다.

## 1. 공통 응답 규칙

### 성공

```json
{
  "success": true,
  "data": {}
}
```

### 실패

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "사용자에게 보여줄 수 있는 메시지"
}
```

## 2. 인증

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `POST` | `/api/auth/signup` | 회원가입 | 비회원 |
| `GET` | `/api/auth/check-id` | 아이디 중복 확인 | 비회원 |
| `GET` | `/api/auth/check-nickname` | 닉네임 중복 확인 | 비회원 |
| `GET` | `/api/auth/check-email` | 이메일 중복 확인 | 비회원 |
| `POST` | `/api/auth/phone/send` | 전화번호 인증번호 발송 | 비회원 |
| `POST` | `/api/auth/phone/verify` | 전화번호 인증번호 검증 | 비회원 |
| `GET` | `/api/auth/phone/status` | 전화번호 인증 상태 조회 | 비회원 |
| `DELETE` | `/api/auth/phone/status` | 전화번호 인증 완료 상태 초기화 | 비회원 |
| `POST` | `/api/auth/login` | 로그인 및 쿠키 발급 | 비회원 |
| `POST` | `/api/auth/logout` | 로그아웃 및 쿠키 만료 | USER |
| `POST` | `/api/auth/refresh` | Access Token 재발급 | refresh cookie |
| `GET` | `/api/auth/me` | 내 인증 정보 조회 | USER |
| `POST` | `/api/auth/find-id` | 아이디 찾기 | 비회원 |
| `POST` | `/api/auth/find-password` | 비밀번호 찾기 요청 | 비회원 |
| `PATCH` | `/api/auth/password` | 비밀번호 재설정 | 비회원/토큰 |

## 3. 사용자/프로필

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/users/:userIdx/profile` | 공개 프로필 조회 | optional |
| `GET` | `/api/users/me` | 내 회원 정보 조회 | USER |
| `PATCH` | `/api/users/me` | 내 회원 정보 수정 | USER |
| `DELETE` | `/api/users/me` | 회원 탈퇴 | USER |

## 4. 메인/검색

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/main` | 메인 페이지 데이터 | optional |
| `GET` | `/api/categories` | 카테고리 목록 | optional |
| `GET` | `/api/search` | 통합 검색 | optional |

## 5. 중고거래

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/used` | 중고거래 목록/검색 | optional |
| `POST` | `/api/used` | 중고거래 글 작성 | USER |
| `GET` | `/api/used/:listingIdx` | 중고거래 상세 | optional |
| `PATCH` | `/api/used/:listingIdx` | 중고거래 글 수정 | 판매자 |
| `PATCH` | `/api/used/:listingIdx/cancel` | 중고거래 글 취소 | 판매자 |
| `POST` | `/api/used/:listingIdx/favorite` | 관심 등록 | USER |
| `DELETE` | `/api/used/:listingIdx/favorite` | 관심 해제 | USER |

## 6. 경매

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/auctions` | 경매 목록/검색 | optional |
| `POST` | `/api/auctions` | 경매 글 작성 | USER |
| `GET` | `/api/auctions/:listingIdx` | 경매 상세 | optional |
| `PATCH` | `/api/auctions/:listingIdx` | 경매 글 수정 | 판매자 |
| `PATCH` | `/api/auctions/:listingIdx/cancel` | 경매 취소 | 판매자 |
| `POST` | `/api/auctions/:listingIdx/bids` | 입찰 | USER |
| `GET` | `/api/auctions/:listingIdx/bids` | 입찰 내역 조회 | optional |
| `POST` | `/api/auctions/:listingIdx/favorite` | 관심 등록 | USER |
| `DELETE` | `/api/auctions/:listingIdx/favorite` | 관심 해제 | USER |

## 7. 채팅

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/chats` | 내 채팅방 목록 | USER |
| `POST` | `/api/chats` | 상품 기준 채팅방 생성/조회 | USER |
| `GET` | `/api/chats/:chatRoomIdx` | 채팅방 상세 | 참여자 |
| `GET` | `/api/chats/:chatRoomIdx/messages` | 메시지 목록 | 참여자 |
| `POST` | `/api/chats/:chatRoomIdx/messages` | 메시지 전송 | 참여자 |

## 8. 거래/후기

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `POST` | `/api/transactions` | 거래 요청 생성 | USER |
| `GET` | `/api/transactions/:transactionIdx` | 거래 상세 | 참여자 |
| `PATCH` | `/api/transactions/:transactionIdx/complete` | 거래 완료 | 참여자 |
| `PATCH` | `/api/transactions/:transactionIdx/cancel` | 거래 취소 | 참여자 |
| `POST` | `/api/reviews` | 후기 작성 | 거래 참여자 |
| `GET` | `/api/users/:userIdx/reviews` | 사용자 후기 목록 | optional |

## 9. 마이페이지

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/mypage/me/listings` | 내 판매 상품 | USER |
| `GET` | `/api/mypage/me/favorites` | 내 관심 품목 | USER |
| `GET` | `/api/mypage/me/history` | 내 거래 내역 | USER |
| `GET` | `/api/mypage/me/reviews` | 내 후기 | USER |
| `GET` | `/api/mypage/:userIdx/listings` | 상대방 판매 상품 | optional |
| `GET` | `/api/mypage/:userIdx/reviews` | 상대방 후기 | optional |

## 10. 알림

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/notifications` | 내 알림 목록 | USER |
| `PATCH` | `/api/notifications/:notificationIdx/read` | 알림 1건 읽음 | USER |
| `PATCH` | `/api/notifications/read-all` | 전체 읽음 | USER |
| `GET` | `/api/notifications/unread-count` | 안읽은 알림 수 | USER |

## 11. 업로드

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `POST` | `/api/uploads/images` | 이미지 업로드 | USER |

## 12. 관리자

| Method | Path | 설명 | Auth |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | 대시보드 통계 | ADMIN |
| `GET` | `/api/admin/users` | 회원 목록/검색 | ADMIN |
| `GET` | `/api/admin/users/:userIdx` | 회원 상세 | ADMIN |
| `PATCH` | `/api/admin/users/:userIdx/ban` | 회원 영구정지 | ADMIN |
| `PATCH` | `/api/admin/users/:userIdx/unban` | 회원 정지 해제 후보 | ADMIN |
| `GET` | `/api/admin/used` | 중고거래 관리 목록 | ADMIN |
| `GET` | `/api/admin/auctions` | 경매 관리 목록 | ADMIN |
| `GET` | `/api/admin/auctions/winners` | 낙찰 관리 목록 | ADMIN |
| `PATCH` | `/api/admin/auctions/:listingIdx/cancel` | 관리자 경매 취소 | ADMIN |

## 13. 공통 에러 코드 후보

| 코드 | 의미 |
|---|---|
| `UNAUTHORIZED` | 로그인 필요 |
| `FORBIDDEN` | 권한 없음 |
| `BANNED_USER` | 정지 사용자 |
| `VALIDATION_ERROR` | 입력값 오류 |
| `NOT_FOUND` | 대상 없음 |
| `CONFLICT` | 중복 또는 상태 충돌 |
| `AUCTION_CLOSED` | 종료된 경매 |
| `AUCTION_CANCELED` | 취소된 경매 |
| `BID_TOO_LOW` | 입찰가 부족 |
| `REDIS_UNAVAILABLE` | Redis 장애로 처리 불가 |
| `UPLOAD_FAILED` | 업로드 실패 |

## 14. 구현 체크리스트

- [ ] API prefix 확정
- [ ] 인증 middleware 적용 범위 확인
- [ ] 관리자 middleware 적용 범위 확인
- [ ] 목록 API 페이지네이션 규격 통일
- [ ] 에러 코드 규격 통일
- [ ] 파일 업로드 응답 규격 확정
- [ ] API별 request/response 상세 작성
