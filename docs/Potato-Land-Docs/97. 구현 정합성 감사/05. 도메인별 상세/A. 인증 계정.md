---
title: "인증 계정 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 인증 계정 상세

## 구현된 흐름

- SMS 발송·검증, purpose별 proof, cooldown/rate limit
- 회원가입 중복 검증, bcrypt, DB transaction
- 로그인, JWT access/refresh, Redis session
- Refresh Token Rotation
- 현재/전체/지정 세션 로그아웃
- 아이디 찾기, 비밀번호 재설정

## 문서 대비 정확성

실행 가능한 11/11이지만 전부 부분 구현으로 분류했다. 이유는 동일 기능이 동작해도 API 계약과 보안·인가 기반이 완전히 맞지 않기 때문이다.

### 잘못된 부분

1. [`backend/src/modules/auth/auth.service.js`](https://github.com/hurwan0629/potato-land/blob/061e78c2bcd039191277b211a51fd08bb1669feb/backend/src/modules/auth/auth.service.js) · `sendPhoneVerification`에서 인증번호 `code`와 `payload`를 logger에 남긴다.
2. [`backend/src/server.js`](https://github.com/hurwan0629/potato-land/blob/061e78c2bcd039191277b211a51fd08bb1669feb/backend/src/server.js) · `configureSmsProvider`의 개발 provider도 SMS `text` 전체를 로그에 남긴다.
3. [`backend/src/common/middlewares/auth.middleware.js`](https://github.com/hurwan0629/potato-land/blob/061e78c2bcd039191277b211a51fd08bb1669feb/backend/src/common/middlewares/auth.middleware.js) · `requireAuth`는 DB 사용자 상태를 확인하지 않는다.
4. 문서의 phone send/verify/status 응답 DTO와 실제 반환값이 다르다.
5. 문서 명세 밖 세션 API 3개가 추가됐으나 API 목록/상위 주석이 갱신되지 않았다.

## 실제 경로 예시

### 로그인

`auth.router.login → auth.controller.login → validateLogin → auth.service.loginUser → auth.repository.findUserByLoginId → bcrypt.compare → auth.token → auth.redis.createSession → cookie response`

### 재발급

`auth.router.refresh → auth.controller.refresh → auth.service.refreshLoginSession → verifyRefreshToken → Redis session 조회/rotation → access/refresh 재발급 → cookie response`
