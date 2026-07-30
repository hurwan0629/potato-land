# G. 관리자

## 1. 목적

관리자가 서비스 상태를 확인하고, 회원과 중고거래/경매 게시글을 관리하며, 문제가 있는 사용자를 영구정지할 수 있게 한다.

## 2. 액터

- 관리자
- 일반 사용자
- Socket.IO 서버

## 3. 접근 권한

- `users.role = ADMIN`인 사용자만 관리자 API와 관리자 페이지에 접근할 수 있다.
- 정지된 관리자는 관리자 API에 접근할 수 없다.

## 4. 주요 화면

- 관리자 대시보드
- 회원 관리
- 회원 상세 조회
- 경매 관리
- 중고거래 관리
- 낙찰 관리
- 회원 삭제 확인 모달
- 회원 삭제 완료 모달
- 게시물/경매글 삭제 확인 모달
- 게시물/경매글 삭제 완료 모달

## 5. 대시보드

대시보드는 기존 테이블 count/group by 수준으로 구현한다.

- 총 회원 수
- 총 글 수
- 총 거래 수
- 총 거래 금액
- 일별 게시물 등록 추이
- 일별 완료된 거래 추이

## 6. 회원 관리

1. 관리자가 회원 관리 페이지에 접근한다.
2. 서버는 회원 목록을 가입일 포함으로 조회한다.
3. 관리자는 검색어로 회원번호, 아이디, 닉네임을 검색할 수 있다.
4. 관리자는 회원 상세를 조회한다.
5. 관리자는 UI에서 회원 삭제를 실행할 수 있다.
6. 서버는 회원 삭제를 실제 row 삭제가 아니라 영구정지로 처리한다.
7. 정지 시 `users.banned_at`, `users.ban_reason`을 저장한다.
8. 관리자는 회원 상세에서 `admin_memo`를 저장할 수 있다.

## 7. 회원 삭제 UI와 영구정지 영향

- 관리자 UI의 회원 삭제는 내부적으로 영구정지다.
- 사용자는 로그인, 토큰 재발급, Socket 연결, 글 작성, 입찰, 채팅이 차단된다.
- 정지된 사용자의 login_id, phone, email은 재사용할 수 없다.
- 정지 사용자의 공개 프로필은 일반 사용자에게 노출하지 않는다.
- 정지 사유는 일반 사용자에게 노출하지 않는다.

## 8. 경매 관리

- 전체 경매 목록 조회
- 상품명 또는 판매자 검색
- 상태별 조회
- 낙찰 상품, 판매자, 낙찰자, 최종 낙찰가, 낙찰 날짜 조회
- 관리자 권한으로 경매글 삭제
- 삭제는 `listings.deleted_at`, `deleted_by`, `delete_reason`으로 처리한다.
- 삭제된 경매는 일반 사용자 화면에서 조회되지 않는다.

## 9. 중고거래 관리

- 전체 중고거래 목록 조회
- 상품명 또는 판매자 검색
- 상태별 조회
- 관리자 권한으로 중고거래 글 삭제
- 삭제는 `listings.deleted_at`, `deleted_by`, `delete_reason`으로 처리한다.
- 삭제된 중고글은 일반 사용자 화면에서 조회되지 않는다.

## 10. 관련 DB

- `users`
- `listings`
- `used_posts`
- `auction_posts`
- `auction_bids`
- `transactions`
- `notifications`

## 11. 관련 API

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/users/:userIdx`
- `PATCH /api/admin/users/:userIdx/ban`
- `PATCH /api/admin/users/:userIdx/memo`
- `GET /api/admin/used`
- `DELETE /api/admin/used/:listingIdx`
- `GET /api/admin/auctions`
- `DELETE /api/admin/auctions/:listingIdx`
- `GET /api/admin/auctions/winners`

## 12. 구현 체크리스트

- [ ] 관리자 인증 middleware
- [ ] 대시보드 통계 API
- [ ] 회원 목록 조회
- [ ] 회원 상세 조회
- [ ] 회원 삭제 UI를 영구정지 처리로 연결
- [ ] 회원 admin_memo 저장
- [ ] 경매 관리 목록/검색
- [ ] 중고거래 관리 목록/검색
- [ ] 관리자 게시물/경매글 삭제
- [ ] 낙찰 관리 조회
