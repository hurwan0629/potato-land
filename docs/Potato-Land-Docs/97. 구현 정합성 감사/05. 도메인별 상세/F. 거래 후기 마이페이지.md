---
title: "거래 후기 마이페이지 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 거래·후기·마이페이지 상세

## 거래

4개 거래 API는 실제 DB transaction을 사용하고 commit 이후 Socket/알림을 보낸다.

장점:
- 참가자·상태 검증
- row lock
- transaction 상태 변경
- 중고 상태 갱신
- SYSTEM/PAYMENT_REQUEST/TRADE_COMPLETE 메시지
- notification 저장·전파

문제:
- 약 500줄 controller 한 파일에 SQL, 정책, DTO, Socket 후처리가 집중
- 상세 응답에서 category와 실제 rating/review 집계 누락
- 도메인 service/repository 없음
- 통합 테스트 없음

## 후기

- `GET /api/reviews/tags`: route 없음
- `POST /api/reviews`: 501
- `GET /api/users/:userIdx/reviews`: 기대 URL 없음
- 실제 `/api/reviews/users/:userIdx`: 잘못된 URL이며 501
- DB에 review tag 테이블/관계 없음

## 마이페이지

5개 모두 501이다. 라우터에 인증 미들웨어도 없다.
