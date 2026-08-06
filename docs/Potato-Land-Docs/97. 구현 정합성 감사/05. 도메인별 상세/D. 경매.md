---
title: "경매 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 경매 상세

## 구현된 외형

- 목록
- 등록
- 상세
- 수정
- 삭제
- validator
- listing/auction/image repository
- 단일 timer registry

## 빠진 핵심

- 입찰 생성
- 입찰 목록
- 관심 추가·해제
- Socket `auction:join`, `auction:leave`
- 원자적 최고가 갱신
- 낙찰자 선정 및 `winning_bid_idx`
- 거래 생성
- 낙찰/유찰 알림
- 시스템 메시지
- Redis 경매 상태 정리
- 서버 부팅 시 복구 scheduler 시작

## 구현 오류

1. 등록·수정 route에 multer가 없어 `req.files`가 실제로 채워지지 않는다.
2. image URL은 `/resources/listings/...`를 만들지만 Express는 `/uploads`를 제공한다.
3. 목록의 `hasMyBid`, `myBidAmount`, 상세의 평점·관심 여부가 고정값이다.
4. 삭제 시 입찰자 알림 수가 0으로 고정된다.
5. repository `finishAuction`은 상태만 `FINISHED`로 바꾼다.
6. `startAuctionRecoveryScheduler()`가 서버 시작 시 호출되지 않는다.
7. 문서가 사용하지 않기로 한 `auction:*:bidders` Redis key를 삭제한다.

경매는 파일 수와 코드 줄 수보다 **입찰·종료·복구의 원자성**이 완성 기준이므로 정합 점수가 낮다.
