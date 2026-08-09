---
title: "메인 중고거래 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 메인·중고거래 상세

## 메인

`GET /api/main`, `GET /api/categories` 모두 controller가 `notImplemented()`를 호출한다.

카테고리 seed SQL이 존재해도 조회 API가 없으므로 사용자 관점 구현도는 0%다.

## 중고거래

7개 URL 모두 라우터와 주석만 있고 실제 SQL/service/repository/auth가 없다.

- 목록
- 등록
- 상세
- 수정
- 삭제
- 관심 추가
- 관심 해제

거래 controller가 중고 게시글 상태를 갱신하는 부분은 존재하지만, 중고 게시글 자체 CRUD가 없으므로 전체 사용자 흐름은 시작할 수 없다.
