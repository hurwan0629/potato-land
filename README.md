# 🥔 Potato Land

**감자나라**는 중고거래와 실시간 경매를 중심으로
채팅, 알림, 거래 관리 기능을 제공하는 팀 프로젝트입니다.

## 주요 기능

* 중고거래 상품 등록 및 조회
* 실시간 경매 및 입찰
* 사용자 간 실시간 채팅
* 실시간 알림
* 마이페이지
* 관리자 기능

## 기술 스택

**Backend**

* Express
* PostgreSQL
* Redis
* Socket.IO

**Auth**

* JWT Access / Refresh Token
* HttpOnly Cookie

**Upload**

* Multer
* Local `/uploads`

## 팀 구성

| 이름  | 담당                  |
| --- | ------------------- |
| 박건희 | `팀장`, `의견 조율`, `인증/회원`    |
| 심형준 | `피그마 UI`, `탐색/중고거래`     |
| 양수연 | `피그마 UI`, `경매`          |
| 윤재빈 | `피그마 UI`, `채팅/알림`       |
| 최한빈 | `프론트 구조`, `마이페이지/관리자`   |
| 허완  | `설계 및 문서화`, `공통 모듈`, `병합` |

## 프로젝트 문서

상세 설계 문서는 `docs/Potato-Land-Docs`에서 관리합니다.
* [피그마](https://www.figma.com/design/ZkBFfMjEJCylZTqQeIONdU/semi_project---%EA%B0%90%EC%9E%90-%EC%A4%91%EA%B3%A0-%EA%B1%B0%EB%9E%98?t=ZzJtjJGcioSYmwdy-0)
* [DB / ERD](<docs\Potato-Land-Docs\06. DB>)
* [HTTP API](<docs\Potato-Land-Docs\05. API와 이벤트>)
* [Socket 이벤트](<docs\Potato-Land-Docs\05. API와 이벤트>)
* [런타임 상태1](<docs\Potato-Land-Docs\05. API와 이벤트\HTTP API 상세\00. 공통 규칙 및 상수.md>)
* [런타임 상태2](<docs\Potato-Land-Docs\07. 아키텍처\런타임 컨텍스트 상태.md>)
* [다이어그램](<docs\Potato-Land-Docs\04. 다이어그램>)

## Architecture

PostgreSQL은 영속 데이터를 관리하고,
Redis는 세션 및 실시간 상태를 관리합니다.

Socket.IO를 통해 경매, 채팅, 알림 이벤트를 실시간으로 전달합니다.

## DataBase
![alt text](<docs/Potato-Land-Docs/06. DB/Potato Land (4).png>)
