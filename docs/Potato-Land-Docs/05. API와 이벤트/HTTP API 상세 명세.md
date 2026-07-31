# HTTP API 상세 명세

> API 상세 문서는 기능별 파일로 분리한다.
> 프론트 API 함수, Express router/controller 구현 시 아래 문서를 기준으로 본다.

## 문서 목록

- [[05. API와 이벤트/HTTP API 상세/00. 공통 규칙 및 상수]]
- [[05. API와 이벤트/HTTP API 상세/01. 인증]]
- [[05. API와 이벤트/HTTP API 상세/02. 사용자 프로필]]
- [[05. API와 이벤트/HTTP API 상세/03. 메인 검색]]
- [[05. API와 이벤트/HTTP API 상세/04. 중고거래]]
- [[05. API와 이벤트/HTTP API 상세/05. 경매]]
- [[05. API와 이벤트/HTTP API 상세/06. 채팅]]
- [[05. API와 이벤트/HTTP API 상세/07. 거래 후기]]
- [[05. API와 이벤트/HTTP API 상세/08. 마이페이지]]
- [[05. API와 이벤트/HTTP API 상세/09. 알림]]
- [[05. API와 이벤트/HTTP API 상세/10. 관리자]]
- [[05. API와 이벤트/HTTP API 상세/11. 구현 검증 포인트]]

## 우선순위

- API별 request/response/exception은 기능별 상세 파일을 따른다.
- 쿠키, JWT claim, 공통 에러, enum/const, Redis key는 [[05. API와 이벤트/HTTP API 상세/00. 공통 규칙 및 상수]]를 따른다.
- Socket payload는 [[05. API와 이벤트/Socket 이벤트 목록]]을 따른다.
- 실제 구현 순서는 [[09. 구현 흐름/00. 구현 흐름 읽는 법]]과 각 흐름 문서를 따른다.

