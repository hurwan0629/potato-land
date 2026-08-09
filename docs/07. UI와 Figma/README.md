# UI와 Figma

## 정본 우선순위

1. Figma 화면과 컴포넌트 상태
2. 이 문서의 URL·상태 연결표
3. 구현 CSS

Figma 파일 링크와 주요 `node-id`는 프로젝트 README 또는 이 문서 상단에 등록한다. 링크가 등록되기 전에는 픽셀 단위 일치를 완료로 판단하지 않는다.

## URL과 화면

| URL | 화면 | 핵심 상태 |
|---|---|---|
| `/` | 메인 | 추천 중고·경매·카테고리 |
| `/search` | 통합 상품 검색 | 검색·필터·정렬·페이지 |
| `/auction` | 경매 목록 | 현재가·입찰 수·종료 실시간 갱신 |
| `/auction/:listingIdx` | 경매 상세 | 이미지 gallery, 입찰, 삭제 Modal |
| `/chat/:chatRoomIdx` | 채팅 | 목록·메시지·읽음·이미지·읽기 전용 |
| `/payment/:transactionIdx` | 거래 | 완료·취소·후기 |
| `/mypage/:userIdx` | 프로필 | 상품·관심·거래·후기 |
| `/mypage/me/edit` | 계정 수정 | 선택 프로필 이미지 즉시 preview |
| `/admin` | 관리자 | 통계 차트·회원·상품·낙찰 관리 |

## CSS 규칙

- 전역 reset과 design token만 `index.css` 최상단에 둔다.
- 화면별 클래스는 BEM 형태의 고유 block 이름을 사용한다.
- 전역 `input`, `button`, `h1` 규칙이 특정 화면 크기를 강제하지 않게 한다.
- Header는 desktop, tablet, mobile 세 구간에서 검색창과 사용자 메뉴 겹침을 확인한다.
- Modal은 브라우저 `alert`, `confirm`, `prompt`를 대체한다.
- 이미지 선택 UI는 파일 수, preview, 교체 정책을 저장 전에 보여준다.

## 필수 회귀 화면

- 헤더 검색창이 1024px·768px·390px에서 넘치지 않는지
- 회원가입 필드와 인증 버튼이 겹치지 않는지
- 경매 이미지 네 장이 등록·상세·수정 화면에 보이는지
- 경매 카드가 입찰·종료·삭제 이벤트에 반응하는지
- 관리자 차트가 빈 데이터와 다건 데이터에서 모두 렌더되는지
