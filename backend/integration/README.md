# 통합 시나리오 테스트

이 테스트는 실제 PostgreSQL을 사용하며 데이터베이스를 초기화합니다.

## 안전 조건

- `NODE_ENV=test`여야 합니다.
- 연결된 데이터베이스 이름이 반드시 `_test`로 끝나야 합니다.
- 카테고리 migration/seed가 먼저 적용되어 있어야 합니다.

## 실행

```bash
npm run test:fixtures
npm run test:integration
```

기본 테스트 계정의 비밀번호는 `Potato123!`이며 테스트 DB에서만 생성됩니다.
fixture에는 관리자, 판매자, 입찰자 2명, 구매자, 관전자, 정지 회원,
탈퇴 회원이 포함됩니다.

## 실제 Socket 다중 사용자 시나리오

테스트 DB와 Redis를 준비하고 서버도 `NODE_ENV=test`로 실행한 상태에서 다음 순서로 확인한다.
개발 서버(`npm run dev`)를 사용하면 개발 DB를 바라볼 수 있으므로 이 시나리오에는 사용하지 않는다.

```powershell
cd backend
$env:TEST_FIXTURE_OUTPUT = "$env:TEMP\potato-land-scenario-fixture.json"
npm run test:fixtures
npm run test:server

# 별도 PowerShell
cd ..\client
$env:TEST_FIXTURE_FILE = "$env:TEMP\potato-land-scenario-fixture.json"
npm run test:socket-scenario
```

이 시나리오는 실제 multipart 경매 등록에서 이미지 네 장이 저장되는지 확인한 뒤,
판매자가 경매를 삭제했을 때 경매 화면에 들어가 있지 않은 입찰자 두 명의
개인 Socket room으로 `LISTING_DELETED` 알림이 오는지 확인한다.
테스트가 끝나면 `%TEMP%/potato-land-scenario-fixture.json`을 삭제한다.
