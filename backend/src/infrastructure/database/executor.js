/**
 * database.query 함수와 PostgreSQL transaction client를 같은 방식으로 실행한다.
 * Service가 transaction 안팎에서 동일한 쿼리 함수를 재사용할 때 사용한다.
 */
export function executeQuery(executor, sql, params = []) {
  if (typeof executor === "function") {
    return executor(sql, params);
  }

  if (executor && typeof executor.query === "function") {
    return executor.query(sql, params);
  }

  throw new TypeError("올바른 데이터베이스 실행 객체가 필요합니다.");
}
