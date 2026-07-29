# A-12 JWT 인증 인가

## 목적

쿠키 기반 JWT로 사용자 인증과 권한 검사를 수행한다.

## 정책

- Access Token: 15분
- Refresh Token: 7일
- 둘 다 HttpOnly 쿠키
- Refresh Token은 Redis key로 유효성 관리
- 관리자 권한은 `users.role = ADMIN`으로 확인

## 흐름

1. 보호 API에서 access token을 검증한다.
2. 만료되었으면 프론트는 refresh API를 호출한다.
3. 서버는 refresh token과 Redis key를 확인한다.
4. 사용자가 정지/탈퇴 상태가 아니면 새 access token을 발급한다.

## 체크리스트

- [x] access 검증 middleware
- [x] refresh API
- [x] Redis key 확인
- [x] role 기반 관리자 인가
