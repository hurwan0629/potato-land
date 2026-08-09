# HTTP API 최종 명세

> canonical 업무 API는 **67개**다. `/health`와 인증 session 관리 보조 URL은 별도다.

| # | 도메인 | Method | URL | 인증 | 실제 실행 경로 |
|---:|---|---|---|---|---|
| 1 | 인증 | `POST` | `/api/auth/signup` | 공개 | `auth.router → auth.controller.signup → auth.service.signupUser` |
| 2 | 인증 | `GET` | `/api/auth/check-id` | 공개 | `auth.router → checkLoginId → checkLoginIdAvailability` |
| 3 | 인증 | `POST` | `/api/auth/phone/send` | 공개 | `sendPhoneCode → sendPhoneVerification → Redis/SMS` |
| 4 | 인증 | `POST` | `/api/auth/phone/verify` | 공개 | `verifyPhoneCode → verifyPhoneVerification → Redis proof` |
| 5 | 인증 | `GET` | `/api/auth/phone/status` | 공개 | `getPhoneStatus → getPhoneVerificationStatus` |
| 6 | 인증 | `POST` | `/api/auth/login` | 공개 | `login → loginUser → DB/bcrypt/JWT/Redis session` |
| 7 | 인증 | `POST` | `/api/auth/refresh` | Refresh cookie | `refresh → refreshLoginSession → Redis rotation` |
| 8 | 인증 | `POST` | `/api/auth/refresh/logout` | Refresh cookie | `logout → Redis session 삭제 → cookie 삭제` |
| 9 | 인증 | `GET` | `/api/auth/me` | 필수 | `requireAuth → getMe → DB 현재 사용자` |
| 10 | 인증 | `POST` | `/api/auth/find-id` | 전화 인증 | `findLoginId → FIND_ID proof 소비 → DB` |
| 11 | 인증 | `POST` | `/api/auth/password/reset` | 전화 인증 | `resetPassword → RESET_PASSWORD proof 소비 → bcrypt/DB/session 삭제` |
| 12 | 사용자 | `GET` | `/api/users/:userIdx/profile` | 공개 | `users.controller.getUserProfile → users.service.getPublicProfile → repository` |
| 13 | 사용자 | `GET` | `/api/users/me` | 필수 | `requireAuth → getMyProfile → getMyAccount` |
| 14 | 사용자 | `PATCH` | `/api/users/me/profile` | 필수+image | `profileImageUpload → updateMyPublicProfile` |
| 15 | 사용자 | `POST` | `/api/users/me/verify-password` | 필수 | `verifyAccountPassword → bcrypt → editToken` |
| 16 | 사용자 | `PATCH` | `/api/users/me` | 필수+editToken | `updateMyAccount → phone proof/중복/bcrypt/DB` |
| 17 | 사용자 | `DELETE` | `/api/users/me` | 필수+editToken | `withdrawMyAccount → withdrawUserCascade → session/Timer/Redis` |
| 18 | 메인 | `GET` | `/api/main` | 공개 | `main.controller.getMain → main.service.getMain → 4개 section SQL` |
| 19 | 메인 | `GET` | `/api/categories` | 공개 | `listCategories → findActiveCategories` |
| 20 | 중고 | `GET` | `/api/used` | 선택 | `optionalAuth → listUsedListings → findUsedListings` |
| 21 | 중고 | `POST` | `/api/used` | 필수+images | `listingImageUpload → createUsedListing → DB transaction` |
| 22 | 중고 | `GET` | `/api/used/:listingIdx` | 선택 | `optionalAuth → getUsedListing → detail/stats/viewer` |
| 23 | 중고 | `PATCH` | `/api/used/:listingIdx` | 필수+images | `updateUsedListing → owner/status → transaction` |
| 24 | 중고 | `DELETE` | `/api/used/:listingIdx` | 필수 | `deleteUsedListing → owner/admin → soft delete` |
| 25 | 중고 | `POST` | `/api/used/:listingIdx/favorite` | 필수 | `addUsedFavorite → target 검증 → INSERT ON CONFLICT` |
| 26 | 중고 | `DELETE` | `/api/used/:listingIdx/favorite` | 필수 | `removeUsedFavorite → DELETE 멱등` |
| 27 | 경매 | `GET` | `/api/auctions` | 선택 | `optionalAuth → getAuctions → viewer bid/favorite SQL` |
| 28 | 경매 | `POST` | `/api/auctions` | 필수+images | `listingImageUpload → createAuction → DB → Timer/Redis` |
| 29 | 경매 | `GET` | `/api/auctions/:listingIdx` | 선택 | `getAuction → detail/stats/viewer → view count` |
| 30 | 경매 | `PATCH` | `/api/auctions/:listingIdx` | 필수+images | `updateAuction → owner/ON_GOING → transaction` |
| 31 | 경매 | `DELETE` | `/api/auctions/:listingIdx` | 필수 | `deleteAuction → soft delete → Timer/Redis/Socket` |
| 32 | 경매 | `POST` | `/api/auctions/:listingIdx/bids` | 필수 | `createAuctionBid → FOR UPDATE → DB commit → Redis/Socket` |
| 33 | 경매 | `GET` | `/api/auctions/:listingIdx/bids` | 선택 | `listAuctionBids → pagination SQL` |
| 34 | 경매 | `POST` | `/api/auctions/:listingIdx/favorite` | 필수 | `addAuctionFavorite → INSERT ON CONFLICT` |
| 35 | 경매 | `DELETE` | `/api/auctions/:listingIdx/favorite` | 필수 | `removeAuctionFavorite → DELETE 멱등` |
| 36 | 채팅 | `GET` | `/api/chats` | 필수 | `chats controller/service → participant list SQL` |
| 37 | 채팅 | `POST` | `/api/chats` | 필수 | `create chat → unique room → Socket room:new` |
| 38 | 채팅 | `GET` | `/api/chats/:chatRoomIdx` | 필수 | `participant check → room detail` |
| 39 | 채팅 | `GET` | `/api/chats/:chatRoomIdx/messages` | 필수 | `participant check → cursor/page messages` |
| 40 | 채팅 | `POST` | `/api/chats/:chatRoomIdx/messages/images` | 필수+images | `chatImageUpload → message DB → Socket` |
| 41 | 거래 | `POST` | `/api/transactions/payment-requests` | 필수 | `participant/state → transaction → message/notification/Socket` |
| 42 | 거래 | `GET` | `/api/transactions/:transactionIdx` | 필수 | `participant check → transaction detail` |
| 43 | 거래 | `PATCH` | `/api/transactions/:transactionIdx/complete` | 필수 | `FOR UPDATE → COMPLETED/SOLD → system message/Socket` |
| 44 | 거래 | `PATCH` | `/api/transactions/:transactionIdx/cancel` | 필수 | `FOR UPDATE → CANCELED → notification/Socket` |
| 45 | 후기 | `POST` | `/api/reviews` | 필수 | `createReview → transaction lock → review/notification → Socket` |
| 46 | 후기 | `GET` | `/api/users/:userIdx/reviews` | 공개 | `listUserReviews → listReceivedReviews` |
| 47 | 마이페이지 | `GET` | `/api/mypage/me/listings` | 필수 | `listMyListings → findListingsBySeller` |
| 48 | 마이페이지 | `GET` | `/api/mypage/me/favorites` | 필수 | `listMyFavorites → findFavoritesByUser` |
| 49 | 마이페이지 | `GET` | `/api/mypage/me/history` | 필수 | `listMyHistory → transaction/active bid UNION` |
| 50 | 마이페이지 | `GET` | `/api/mypage/me/reviews` | 필수 | `listMyReviews → written/received filter` |
| 51 | 마이페이지 | `GET` | `/api/mypage/:userIdx/listings` | 공개 | `listUserListings → findListingsBySeller` |
| 52 | 알림 | `GET` | `/api/notifications` | 필수 | `notifications list → pagination` |
| 53 | 알림 | `PATCH` | `/api/notifications/:notificationIdx/read` | 필수 | `owner notification → read_at/is_read → unread Socket` |
| 54 | 알림 | `PATCH` | `/api/notifications/read-all` | 필수 | `receiver unread rows 일괄 update → Socket` |
| 55 | 알림 | `GET` | `/api/notifications/unread-count` | 필수 | `receiver unread COUNT` |
| 56 | 관리자 | `GET` | `/api/admin/dashboard` | ADMIN | `findDashboard → summary/time series SQL` |
| 57 | 관리자 | `GET` | `/api/admin/users` | ADMIN | `listUsers → search/status/page` |
| 58 | 관리자 | `GET` | `/api/admin/users/:userIdx` | ADMIN | `getUser → account/summary SQL` |
| 59 | 관리자 | `GET` | `/api/admin/users/:userIdx/transactions` | ADMIN | `listTransactions → user activity SQL` |
| 60 | 관리자 | `GET` | `/api/admin/users/:userIdx/reviews` | ADMIN | `listReviews → written/received activity SQL` |
| 61 | 관리자 | `PATCH` | `/api/admin/users/:userIdx/ban` | ADMIN | `banUser → DB cascade → session/Timer/Redis` |
| 62 | 관리자 | `PATCH` | `/api/admin/users/:userIdx/memo` | ADMIN | `updateUserMemo → users.admin_memo` |
| 63 | 관리자 | `GET` | `/api/admin/used` | ADMIN | `listAdminListings(USED)` |
| 64 | 관리자 | `DELETE` | `/api/admin/used/:listingIdx` | ADMIN | `used.service.deleteUsedListing 재사용` |
| 65 | 관리자 | `GET` | `/api/admin/auctions` | ADMIN | `listAdminListings(AUCTION)` |
| 66 | 관리자 | `DELETE` | `/api/admin/auctions/:listingIdx` | ADMIN | `auctions.service.deleteAuction 재사용` |
| 67 | 관리자 | `GET` | `/api/admin/auctions/winners` | ADMIN | `findAuctionWinners` |

## 호환 및 보조 URL

- `PATCH /api/users/me/password`: `PATCH /api/users/me`의 deprecated 입력 호환 alias다. canonical 67개에는 포함하지 않는다.
- 인증 session 관리 URL(`logout-all`, `sessions`)은 운영 보조 API이며 canonical 업무 67개와 별도로 유지한다.
- `GET /health`: 프로세스 상태 확인용이다.
