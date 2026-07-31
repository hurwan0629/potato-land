# A. 인증 및 계정

## 1. 목적

사용자가 감자나라 계정을 만들고, 로그인 상태를 유지하며, 정지/탈퇴 상태에 따라 접근이 제한되도록 한다.

## 2. 주요 기능

- 회원가입
- 전화번호 인증
- 아이디/닉네임/이메일 중복 확인
- 로그인
- 로그아웃
- JWT 인증/인가
- Access Token 재발급
- 아이디 찾기
- 비밀번호 찾기/재설정
- 프로필 조회 및 수정
- 회원 탈퇴
- 정지 사용자 접근 차단

## 3. 인증 정책

- Access Token과 Refresh Token은 모두 HttpOnly 쿠키로 전달한다.
- Access Token 만료 시간은 15분이다.
- Refresh Token 만료 시간은 7일이다.
- Access Token 쿠키 path는 `/`로 둔다.
- Refresh Token 쿠키 path는 `/api/auth/refresh`로 제한한다.
- Access Token claim은 `sub`, `sid`, `jti`, `type=access`, `role`, `iat`, `exp`를 사용한다.
- Refresh Token claim은 `sub`, `sid`, `jti`, `type=refresh`, `iat`, `exp`를 사용한다.
- Refresh Token 유효성은 Redis `session:{sub}:{sid}` TTL key로 관리한다.
- Refresh Token rotation 시 Redis의 `currentRefreshJti`와 token `jti`를 비교한다.
- 로그아웃 시 access/refresh 쿠키를 모두 만료시키고 Redis refresh key를 삭제한다.
- 정지 사용자와 탈퇴 사용자는 토큰 재발급을 차단한다.
- 회원가입 성공 후 자동 로그인하지 않는다. 로그인 API를 호출해야 access/refresh token을 발급한다.

## 4. 권한

| 권한 | 설명 |
|---|---|
| 비회원 | 회원가입, 로그인, 아이디/비밀번호 찾기 |
| USER | 상품 조회, 글 작성, 입찰, 채팅, 마이페이지 |
| ADMIN | 관리자 페이지, 사용자 영구정지, 관리 목록 조회 |

## 5. 보안

- 비밀번호는 단방향 해시로 저장한다.
- 인증번호와 비밀번호는 로그에 출력하지 않는다.
- Refresh Token 원문은 Redis에 저장하지 않고 hash 또는 token id 기준으로 관리한다.
- 쿠키는 배포 환경에서 Secure 옵션을 적용한다.
- CSRF 위험을 고려해 SameSite 옵션을 적용한다.

## 6. 관련 문서

- [[01. 기능 명세/A. 인증 계정/A-01 회원가입]]
- [[01. 기능 명세/A. 인증 계정/A-03 전화번호 인증]]
- [[03. 상태와 정책/도메인 상태 목록]]
- [[05. API와 이벤트/HTTP API 목록]]
- [[04. 다이어그램/A-02 로그인 토큰 재발급 시퀀스]]

## 7. 구현 체크리스트

- [x] 회원가입 입력값 검증
- [x] 비밀번호 해시 저장
- [x] 전화번호 인증 Redis TTL 적용
- [x] 로그인 성공 시 access/refresh 쿠키 발급
- [x] refresh token Redis session key 저장
- [x] refresh token rotation과 jti 비교
- [x] access token 만료 시 refresh API로 재발급
- [x] 로그아웃 시 쿠키 만료와 Redis key 삭제
- [x] 정지/탈퇴 사용자 접근 차단
- [x] 관리자 권한 middleware 구현
