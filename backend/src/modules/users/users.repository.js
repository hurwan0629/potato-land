import { db } from "../../config/db.js";

/** 사용자 식별자로 회원정보 수정에 필요한 전체 계정 정보를 조회한다. */
export async function findEditableUser(userIdx) {
  const result = await db.query("SELECT idx, login_id, password_hash, name, nickname, phone, email, profile_image, role, deleted_at, banned_at FROM users WHERE idx = $1", [userIdx]);
  return result.rows[0] ?? null;
}

/** 닉네임·전화번호·이메일 중 다른 사용자가 이미 사용하는 필드를 찾는다. */
export async function findProfileConflict(userIdx, { nickname, phone, email }) {
  const result = await db.query(`SELECT CASE WHEN nickname = $2 THEN 'nickname' WHEN phone = $3 THEN 'phone' WHEN $4::text IS NOT NULL AND email = $4 THEN 'email' END AS field FROM users WHERE idx <> $1 AND (nickname = $2 OR phone = $3 OR ($4::text IS NOT NULL AND email = $4)) LIMIT 1`, [userIdx, nickname, phone, email]);
  return result.rows[0]?.field ?? null;
}

/** 검증된 사용자의 닉네임·전화번호·이메일과 선택적인 새 비밀번호를 저장한다. */
export async function updateUserAccount(userIdx, { nickname, phone, email, passwordHash }) {
  const result = await db.query(`UPDATE users SET nickname = $2, phone = $3, email = $4, password_hash = COALESCE($5, password_hash), updated_at = NOW() WHERE idx = $1 RETURNING idx, login_id, name, nickname, phone, email, profile_image, role`, [userIdx, nickname, phone, email, passwordHash]);
  return result.rows[0];
}

/** 현재 사용자를 소프트 삭제 상태로 변경한다. */
export async function softDeleteUser(userIdx) {
  await db.query("UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE idx = $1 AND deleted_at IS NULL", [userIdx]);
}
