# Potato Land

감자나라 중고거래/경매 서비스 프로젝트 작업 공간입니다.

## Overview

이 프로젝트는 중고거래, 경매, 채팅, 알림, 마이페이지, 관리자 기능을 포함합니다.

현재 설계 문서는 Obsidian vault 형태로 관리합니다.

- 문서 위치: `docs/Potato-Land-Docs`
- 핵심 문서: `00. 홈/프로젝트 홈.md`
- DB 문서: `06. DB/ERD.md`
- API 문서: `05. API와 이벤트/HTTP API 목록.md`
- Socket 문서: `05. API와 이벤트/Socket 이벤트 목록.md`

## Planned Stack

- Backend: Express
- Database: PostgreSQL
- Cache/Realtime State: Redis
- Realtime: Socket.IO
- Upload: multer local `/uploads`
- Auth: JWT access/refresh token with HttpOnly cookies

## Team

| Role | Name | Responsibility |
|---|---|---|
| Team Lead | 박건희 | 의견 조율 |
| Member 1 | 심형준 | 피그마 UI |
| Member 2 | 양수연 | 피그마 UI |
| Member 3 | 윤재빈 | 피그마 UI |
| Member 4 | 최한빈 | 프론트 구조 |
| Member 5 | 허완 | 설계 및 문서화 |

## Notes

- DB 설계 문서는 PostgreSQL 기준입니다.
- S3, Load Balancer, Redis Stream/Worker, TypeScript는 확장 후보입니다.
- 상세 구현 체크리스트는 Obsidian 문서의 `00. 홈/개발 체크리스트.md`를 기준으로 합니다.
