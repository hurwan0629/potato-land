# 테스트와 운영

## 로컬 실행 순서

```bash
cd backend
npm ci
npm run db:migrate
npm run db:seed
npm run dev

cd ../client
npm ci
npm run lint
npm run build
npm run dev
```

Vite proxy 기본 대상은 `http://localhost:8080`이다. 백엔드가 없거나 시작 중 종료되면 `/api`와 `/socket.io`에서 `ECONNREFUSED` 또는 `ECONNRESET`이 나타난다.

```powershell
Test-NetConnection 127.0.0.1 -Port 8080
curl.exe http://127.0.0.1:8080/health
```

필요하면 `client/.env.local`에 다음을 지정한 뒤 Vite를 재시작한다.

```env
VITE_API_TARGET=http://127.0.0.1:8080
```

## 자동 테스트

```bash
cd backend
npm test
npm run test:fixtures
npm run test:integration
npm run test:server
```

통합 fixture는 다음 조건에서만 DB를 초기화한다.

- `NODE_ENV=test`
- 현재 DB 이름이 `_test`로 끝남

fixture에는 관리자, 판매자, 입찰자 A/B, 구매자, 관전자, 정지 회원, 탈퇴 회원과 경매 세 종류가 포함된다.
Socket 시나리오는 `npm run test:server`로 테스트 DB에 연결된 서버를 별도로 실행한 뒤 진행한다.

## 핵심 시나리오

1. 이미지 네 장 경매 생성과 `post_images` 네 행 확인
2. 동일 사용자의 반복 입찰 원본 보존과 사용자별 최고가 순위 확인
3. 경매 미접속 입찰자에게 삭제 DB 알림 생성
4. 종료 시 낙찰 거래와 판매자-낙찰자 채팅방 생성
5. 온라인 user room Socket 수신과 오프라인 재로그인 알림 조회
6. 관리자 계정으로 통계·회원·상품·낙찰 화면 확인

## 로깅

| 수준 | 대상 |
|---|---|
| `info` | 경매 등록·수정·입찰·삭제·종료, 채팅방·메시지 저장, 서버 시작·종료 |
| `warn` | DB commit 이후 Redis·Socket·SMS 후처리 실패 |
| `error` | 중앙 error middleware가 처리하는 예상하지 못한 오류 |

로그에는 비밀번호, JWT, cookie, Refresh Token, 운영 SMS 본문, 인증번호, 요청 body 전체를 넣지 않는다. 개발·테스트 SMS console provider의 출력 여부는 실행 환경 정책으로 관리한다.
