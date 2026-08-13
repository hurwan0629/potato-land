# 🥔 Potato Land

**감자나라**는 중고거래와 실시간 경매를 중심으로
채팅, 알림, 거래 관리 기능을 제공하는 팀 프로젝트입니다.

## ✨ 주요 기능

* 🛒 중고거래 상품 등록 및 조회
* 🔨 실시간 경매 및 입찰
* 💬 사용자 간 실시간 채팅
* 🔔 실시간 알림
* 👤 마이페이지
* 🛡️ 관리자 기능

## 🛠️ 기술 스택

### Backend

<p>
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-FF4438?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white" />
</p>

### 🔐 Auth

<p>
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" />
</p>

* JWT Access / Refresh Token
* HttpOnly Cookie

### 📦 Upload

* Multer
* Local `/uploads`

## 👥 팀 구성

| 이름  | 담당                        |
| --- | ------------------------- |
| 박건희 | `팀장`, `의견 조율`, `인증/회원`    |
| 심형준 | `피그마 UI`, `탐색/중고거래`       |
| 양수연 | `피그마 UI`, `경매`            |
| 윤재빈 | `피그마 UI`, `채팅/알림`         |
| 최한빈 | `프론트 구조`, `마이페이지/관리자`     |
| 허완  | `설계 및 문서화`, `공통 모듈`, `병합` |

## 📚 프로젝트 문서

상세 설계 문서는 `docs/Potato-Land-Docs`에서 관리합니다.

* 🎨 [피그마](https://www.figma.com/design/ZkBFfMjEJCylZTqQeIONdU/semi_project---%EA%B0%90%EC%9E%90-%EC%A4%91%EA%B3%A0-%EA%B1%B0%EB%9E%98?t=ZzJtjJGcioSYmwdy-0)
* 🗄️ [DB / ERD](https://github.com/hurwan0629/potato-land/tree/main/docs/Potato-Land-Docs/06.%20DB)
* 🌐 [HTTP API](https://github.com/hurwan0629/potato-land/tree/main/docs/Potato-Land-Docs/05.%20API%EC%99%80%20%EC%9D%B4%EB%B2%A4%ED%8A%B8)
* 🔌 [Socket 이벤트](https://github.com/hurwan0629/potato-land/tree/main/docs/Potato-Land-Docs/05.%20API%EC%99%80%20%EC%9D%B4%EB%B2%A4%ED%8A%B8)
* ⚙️ [런타임 상태1](https://github.com/hurwan0629/potato-land/blob/main/docs/Potato-Land-Docs/05.%20API%EC%99%80%20%EC%9D%B4%EB%B2%A4%ED%8A%B8/HTTP%20API%20%EC%83%81%EC%84%B8/00.%20%EA%B3%B5%ED%86%B5%20%EA%B7%9C%EC%B9%99%20%EB%B0%8F%20%EC%83%81%EC%88%98.md)
* ⚙️ [런타임 상태2](https://github.com/hurwan0629/potato-land/tree/main/docs/Potato-Land-Docs/07.%20%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98)
* 📊 [다이어그램](https://github.com/hurwan0629/potato-land/tree/main/docs/Potato-Land-Docs/04.%20%EB%8B%A4%EC%9D%B4%EC%96%B4%EA%B7%B8%EB%9E%A8)

## 🏗️ Architecture

PostgreSQL은 영속 데이터를 관리하고,
Redis는 세션 및 실시간 상태를 관리합니다.

Socket.IO를 통해 경매, 채팅, 알림 이벤트를 실시간으로 전달합니다.

## 🗄️ Database

![db\_erd](https://raw.githubusercontent.com/hurwan0629/potato-land/refs/heads/main/docs/Potato-Land-Docs/06.%20DB/Potato%20Land%20\(4\).png)
