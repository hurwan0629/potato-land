---
title: "관리자 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 관리자 상세

관리자 12개 URL은 모두 501이다.

더 중요한 문제는 [`backend/src/modules/admin/admin.router.js`](https://github.com/hurwan0629/potato-land/blob/061e78c2bcd039191277b211a51fd08bb1669feb/backend/src/modules/admin/admin.router.js)에 `requireAuth` 또는 `requireAdmin`이 없다는 점이다. 현재는 controller가 501이라 데이터 유출이 발생하지 않지만, controller만 구현하면 관리자 API가 공개될 위험이 있다.

## 구현 전 최소 조건

1. DB-validating auth middleware 하나로 통일
2. 매 요청 현재 DB role 확인
3. 관리자 자기 자신/마지막 관리자 보호 정책 확정
4. 영구정지 시 세션·Socket·경매·거래·게시글 정리
5. 강제 삭제 시 원 작성자·입찰자·거래 상대 알림
6. 감사 로그
