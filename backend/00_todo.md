1. 실행 기반
- [2026-08-02 13:35:08] 의존성 설치 및 package-lock.json 생성
- [] app.js: Express 앱 구성
- [] server.js: DB·Redis·HTTP·Socket·Scheduler 실행
- [] /health API 작성
- [] 공통 오류 처리 미들웨어
- [] 종료 처리(SIGINT/SIGTERM): 서버·DB·Redis 연결 종료

2. 환경변수
- [2026-08-02 13:35:43] backend/.env.development
- [2026-08-02 13:35:43] backend/.env.development.example
- [] 필요하면 client/.env.example
- [2026-08-02 14:34:21] Docker Compose용 환경변수
- [2026-08-02 14:02:57] env.js에서 환경변수 읽기 및 필수값 검증

```
backend/.env.development
backend/.env.development.example
client/.env
client/.env.example
container/.env
container/.env.example
```

3. Docker Compose
- [2026-08-02 15:00:32] PostgreSQL 서비스
- [2026-08-02 15:00:32] Redis 서비스
- [2026-08-02 15:00:32] 포트·계정·볼륨 설정
- [2026-08-02 15:00:32] healthcheck 설정
- [2026-08-02 14:34:27] 개발용 compose.dev.yml
- [] 테스트용 compose.test.yml
- [] 필요하면 초기 DB 생성 설정

4. PostgreSQL
- [] DB 연결 모듈
- [] 연결 테스트
- [] 트랜잭션 실행 인터페이스
- [] 마이그레이션 실행 방식 결정
- [] 001_initial_schema.sql
- [] 마이그레이션 기록 테이블
- [] Seed 실행 구조
- [] npm run db:migrate 연결

5. Redis
- [] Redis 클라이언트 연결
- [] 연결 및 종료 처리
- [] 키 이름 상수
- [] TTL 처리 공통 함수
- [] 전화 인증용 저장 인터페이스
- [] 경매 입찰 상태용 저장 인터페이스
- [] Socket 사용자 접속 상태용 인터페이스
- [] 필요하면 분산 락 인터페이스

6. Socket.IO
- [] HTTP 서버와 Socket.IO 연결
- [] 소켓 인증 미들웨어
- [] 사용자 room 가입
- [] 채팅 room 가입·퇴장
- [] 경매 room 가입·퇴장
- [] 이벤트 이름 상수
- [] inbound socket handler
- [] outbound emitter
- [] 연결 해제 처리

7. Scheduler

- [2026-08-02 14:43:29] `npm install node-cron`

- [] 경매 하나의 종료 예약: setTimeout
- [] 서버 재시작 후 누락 경매 탐색: node-cron
- [] 실제 종료 처리: auction.service.js의 공통 함수 호출

준비할 것:

- [`2026-08-02 13:10:07`] `auctionRecoveryScheduler.js`
  - [] 스케줄러 시작·종료 함수
  - [] 종료 대상 조회 인터페이스
  - [] 동일 경매 중복 종료 방지 방식

8. 공통 코드
> 필요할 경우에 만들기
- [] 에러 클래스
- [] 에러 코드 상수
- [] HTTP 상태 코드 매핑
- [] 인증 미들웨어
- [] 요청값 검증 방식
- [] 로깅
- [] 비동기 오류 처리
- [] 응답 형식
- [] 날짜·페이지네이션 등 실제 필요한 유틸

9. 모듈 계약
> 필요없으면 생략 가능
- [] `*.controller.js`
- [] `*.service.js`
- [] `*.repository.js`
- [] `*.redis.js`
- [] `*.validator.js`
- [] `*.router.js`

그리고 팀원이 구현할 수 있도록:
> 가능하면 아래 범위도 명시
- [] 함수 이름
- [] 입력값
- [] 반환값
- [] 발생 가능한 에러
- [] DB/Redis 변경사항
- [] 발생시키는 Socket 이벤트

10. 검증과 CI
- [] DB 연결 테스트
- [] Redis 연결 테스트
- [] /health 테스트
- [] Socket 연결 테스트
- [] 마이그레이션 테스트
- [] npm test
- [] Backend CI 수정
- [] PR 생성 후 GitHub Actions 확인