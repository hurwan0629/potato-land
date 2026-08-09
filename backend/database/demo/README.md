# 개발 데모 데이터와 활동 봇

이 폴더는 실제 운영 데이터가 아니라 화면과 실시간 기능을 확인하기 위한 개발 전용 데이터다.

## 데이터 초기화

```bash
npm run db:setup:demo
```

명령 실행 순서:

1. migration 적용
2. 기본 category seed 적용
3. 기존 `demo_` 계정 및 연결 데이터 삭제
4. 관리자 3명, 사용자, 중고글, 경매, 입찰, 거래, 채팅, 알림, 후기 재생성

일반 사용자가 만든 데이터는 삭제하지 않는다. `demo_`로 시작하는 계정 및 연결 데이터만 정리한다.

모든 데모 계정 비밀번호:

```text
Potato123!
```

관리자 계정:

```text
demo_admin
demo_admin_2
demo_admin_3
```

주요 사용자 계정:

```text
demo_seller
demo_seller2
demo_bidder_a
demo_bidder_b
demo_buyer
demo_spectator
```

## 활동 봇

`.env.development`에서 다음 값을 설정한다.

```env
DEMO_BOT_ENABLED=true
DEMO_BOT_INTERVAL_MS=5000
```

서버를 개발 모드로 실행하면 다음 작업이 차례로 반복된다.

1. 진행 중인 데모 경매에 입찰
2. 쓰기 가능한 데모 채팅방에 메시지 전송
3. 완료 거래 중 아직 작성되지 않은 후기 생성

후기 대상이 모두 소진되면 후기 작업만 건너뛴다. 다시 관찰하려면 `npm run db:demo`로 데모 데이터를 초기화한다.

봇은 `NODE_ENV=development`이면서 `DEMO_BOT_ENABLED=true`인 경우에만 시작된다. production과 test 환경에서는 실행되지 않는다.

## 테스트

순수 타이머 테스트:

```bash
npm run test:demo-bot
```

실제 개발 DB와 Redis에서 경매·채팅·후기 작업을 한 번씩 실행:

```bash
npm run demo:bot:once
```

타이머 작업 순환, 중복 실행 방지, 시작·중지, 운영 환경 차단을 검사한다.
