import { db } from "../../config/db.js";

/** 로그인 아이디로 사용자 인증에 필요한 전체 계정 정보를 조회한다. */
export async function findUserByLoginId(loginId) {
  const result = await db.query(
    `SELECT idx, login_id, password_hash, name, nickname, phone, email,
            profile_image, role, deleted_at, banned_at
       FROM users
      WHERE login_id = $1`,
    [loginId],
  );
  return result.rows[0] ?? null;
}

/** 사용자 식별자로 현재 권한과 활성 상태를 포함한 계정 정보를 조회한다. */
export async function findUserById(userIdx) {
  const result = await db.query(
    `SELECT idx, login_id, nickname, profile_image, role, deleted_at, banned_at
       FROM users
      WHERE idx = $1`,
    [userIdx],
  );
  return result.rows[0] ?? null;
}

/** 휴대전화 번호로 가입된 사용자가 있는지 조회한다. */
export async function findUserByPhone(phone) {
  const result = await db.query("SELECT idx FROM users WHERE phone = $1 LIMIT 1", [phone]);
  return result.rows[0] ?? null;
}

/** 가입 필드 중 이미 사용 중인 값을 찾아 충돌 필드명을 반환한다. */
export async function findSignupConflict({ loginId, nickname, phone, email }) {
  const result = await db.query(
    `SELECT CASE
       WHEN login_id = $1 THEN 'loginId'
       WHEN nickname = $2 THEN 'nickname'
       WHEN phone = $3 THEN 'phone'
       WHEN $4::text IS NOT NULL AND email = $4 THEN 'email'
     END AS field
       FROM users
      WHERE login_id = $1 OR nickname = $2 OR phone = $3
         OR ($4::text IS NOT NULL AND email = $4)
      LIMIT 1`,
    [loginId, nickname, phone, email],
  );
  return result.rows[0]?.field ?? null;
}

/** 비밀번호 hash가 포함된 신규 사용자를 PostgreSQL에 저장한다. */
export async function createUser({ loginId, passwordHash, name, nickname, phone, email }) {
  const result = await db.query(
    `INSERT INTO users (login_id, password_hash, name, nickname, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING idx, login_id, nickname, role, profile_image`,
    [loginId, passwordHash, name, nickname, phone, email],
  );
  return result.rows[0];
}
