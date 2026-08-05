import { useEffect, useState } from "react";

import { authApi } from "../../api/authApi";
import { usersApi } from "../../api/usersApi";
import "./MemberEditModal.css";

/** 전화번호에서 숫자 이외의 문자를 제거한다. */
function normalizePhone(phone) { return phone.replace(/[^\d]/g, ""); }

/** 비밀번호가 회원가입과 같은 8~20자 및 두 종류 이상 조합인지 확인한다. */
function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) return false;
  return [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length >= 2;
}

/** 회원정보 수정의 비밀번호 확인, 수정, 탈퇴 단계를 하나의 모달에서 관리한다. */
export default function MemberEditModal({ loginId, returnPath, onClose }) {
  const [stage, setStage] = useState("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [editToken, setEditToken] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [form, setForm] = useState({ loginId: "", nickname: "", phone: "", code: "", email: "", password: "", passwordConfirm: "" });
  const [phoneAuth, setPhoneAuth] = useState({ phoneVerificationId: "", verified: false, resendSeconds: 0 });
  const [status, setStatus] = useState({ loading: false, message: "", success: false });
  const [requiresLogin, setRequiresLogin] = useState(false);
  const passwordValid = !form.password || isValidPassword(form.password);
  const passwordMatches = form.password === form.passwordConfirm;
  const phoneChanged = normalizePhone(form.phone) !== originalPhone;

  /** Escape 키로 현재 모달을 닫는다. */
  useEffect(() => {
    function closeOnEscape(event) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  /** 휴대전화 인증번호 재발송 제한시간을 1초마다 줄인다. */
  useEffect(() => {
    if (phoneAuth.resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setPhoneAuth((current) => ({ ...current, resendSeconds: Math.max(current.resendSeconds - 1, 0) })), 1000);
    return () => window.clearInterval(timer);
  }, [phoneAuth.resendSeconds]);

  /** 입력값을 갱신하고 전화번호가 변경되면 이전 전화번호 인증을 초기화한다. */
  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setStatus({ loading: false, message: "", success: false });
    if (name === "phone") setPhoneAuth({ phoneVerificationId: "", verified: false, resendSeconds: 0 });
  }

  /** 현재 비밀번호를 검증하고 성공하면 서버 회원정보로 수정 폼을 초기화한다. */
  async function verifyPassword(event) {
    event.preventDefault();
    setStatus({ loading: true, message: "", success: false });
    try {
      // 1. 현재 비밀번호를 서버에서 확인하고 10분짜리 회원정보 수정 토큰을 받는다.
      const result = await usersApi.verifyPassword(currentPassword);

      // 2. 서버의 최신 회원정보로 수정 폼을 초기화한다.
      setEditToken(result.editToken);
      setOriginalPhone(result.profile.phone);
      setForm((current) => ({ ...current, loginId: result.profile.loginId, nickname: result.profile.nickname, phone: result.profile.phone, email: result.profile.email ?? "" }));
      // 3. 검증이 끝난 뒤에만 실제 회원정보 수정 화면을 노출한다.
      setStage("edit");
      setStatus({ loading: false, message: "", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 변경할 휴대전화 번호로 SOLAPI 인증번호 발송을 요청한다. */
  async function sendPhoneCode() {
    setStatus({ loading: true, message: "", success: false });
    try {
      // 변경할 번호를 정규화하고 CHANGE_PHONE 전용 인증번호 발송을 요청한다.
      const result = await authApi.sendPhoneCode(normalizePhone(form.phone), "CHANGE_PHONE");

      // 서버가 반환한 인증 식별자와 재발송 제한 시간을 현재 모달에 보관한다.
      setPhoneAuth({ phoneVerificationId: result.phoneVerificationId, verified: false, resendSeconds: result.resendAfterSeconds });
      setStatus({ loading: false, message: "인증번호를 발송했습니다.", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 변경할 휴대전화 번호로 받은 6자리 인증번호를 검증한다. */
  async function verifyPhoneCode() {
    setStatus({ loading: true, message: "", success: false });
    try {
      // 발송 때 받은 식별자와 사용자가 입력한 6자리 코드를 서버에서 비교한다.
      await authApi.verifyPhoneCode({ phone: normalizePhone(form.phone), phoneVerificationId: phoneAuth.phoneVerificationId, code: form.code, purpose: "CHANGE_PHONE" });

      // 인증 완료 여부는 저장 요청 전에 전화번호 변경을 허용하는 조건으로 사용한다.
      setPhoneAuth((current) => ({ ...current, verified: true }));
      setStatus({ loading: false, message: "휴대전화 인증이 완료되었습니다.", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 닉네임, 연락처, 이메일과 선택적인 새 비밀번호를 서버에 저장한다. */
  async function saveAccount(event) {
    event.preventDefault();

    // 1. 즉시 확인 가능한 입력은 API 요청 전에 검증해 불필요한 요청을 줄인다.
    if (form.nickname.trim().length < 2 || form.nickname.trim().length > 12) return setStatus({ loading: false, message: "닉네임은 2~12자로 입력해주세요.", success: false });
    if (!passwordValid || !passwordMatches) return setStatus({ loading: false, message: "새 비밀번호 입력을 확인해주세요.", success: false });
    if (phoneChanged && !phoneAuth.verified) return setStatus({ loading: false, message: "변경할 휴대전화 인증을 완료해주세요.", success: false });
    setStatus({ loading: true, message: "", success: false });
    try {
      // 2. 비밀번호 확인 토큰과 선택적으로 완료된 전화번호 인증 식별자를 함께 전달한다.
      const result = await usersApi.updateMe({ editToken, nickname: form.nickname, phone: normalizePhone(form.phone), phoneVerificationId: phoneAuth.phoneVerificationId, email: form.email, password: form.password, passwordConfirm: form.passwordConfirm });

      // 3. 비밀번호 변경 시 서버가 모든 세션을 폐기하므로 로그인 화면 이동을 준비한다.
      setRequiresLogin(result.requiresLogin);
      setStage("saved");
      setStatus({ loading: false, message: result.requiresLogin ? "비밀번호가 변경되어 다시 로그인해야 합니다." : "회원정보가 수정되었습니다.", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 확인된 수정 토큰만 전달하여 현재 사용자를 탈퇴 처리한다. */
  async function withdrawAccount() {
    setStatus({ loading: true, message: "", success: false });
    try {
      // 비밀번호 확인 단계에서 받은 수정 토큰만 전달해 추가 개인정보 노출을 피한다.
      await usersApi.withdrawMe(editToken);
      setStage("withdrawn");
      setStatus({ loading: false, message: "", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 배경 자체를 클릭했을 때만 모달을 닫는다. */
  function closeFromBackdrop(event) { if (event.target === event.currentTarget) onClose(); }

  /** 완료 상태를 닫고 갱신된 인증·회원정보를 다시 불러오도록 페이지를 이동한다. */
  function finish() { window.location.assign(stage === "withdrawn" ? "/" : requiresLogin ? "/login" : returnPath); }

  return <div className="member-modal-backdrop" onMouseDown={closeFromBackdrop} role="presentation"><section className={`member-modal ${stage === "edit" ? "member-modal-large" : ""}`} role="dialog" aria-modal="true"><button className="member-modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
    {stage === "password" && <form onSubmit={verifyPassword}><h2>비밀번호 확인</h2><ModalField label="아이디" value={loginId ?? "현재 로그인 계정"} readOnly /><ModalField label="비밀번호" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" placeholder="비밀번호를 입력해주세요" />{status.message && <p className="member-modal-message error">{status.message}</p>}<div className="member-modal-divider" /><button className="member-modal-primary" disabled={status.loading} type="submit">확인</button></form>}
    {stage === "edit" && <form onSubmit={saveAccount}><h2>회원 정보 수정</h2><ModalField label="닉네임" name="nickname" value={form.nickname} onChange={updateField} /><p className="member-modal-guide">2~12자 이내</p><ModalField label="현재 비밀번호" value={currentPassword} type="password" readOnly /><ModalField label="새 비밀번호" name="password" value={form.password} onChange={updateField} type="password" placeholder="변경할 때만 입력해주세요" />{form.password && <p className={`member-modal-guide ${passwordValid ? "success" : "error"}`}>{passwordValid ? "✓" : "X"} 영문/숫자/특수문자 2가지 이상 조합(8~20자)</p>}<ModalField label="새 비밀번호 확인" name="passwordConfirm" value={form.passwordConfirm} onChange={updateField} type="password" placeholder="비밀번호를 다시 입력해주세요" />{form.passwordConfirm && <p className={`member-modal-guide ${passwordMatches ? "success" : "error"}`}>{passwordMatches ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}</p>}<div className="member-modal-action-row"><ModalField label="전화번호" name="phone" value={form.phone} onChange={updateField} /><button type="button" disabled={!phoneChanged || status.loading || phoneAuth.resendSeconds > 0} onClick={sendPhoneCode}>{phoneAuth.resendSeconds > 0 ? `${phoneAuth.resendSeconds}초` : "휴대폰 인증"}</button></div>{phoneAuth.phoneVerificationId && phoneChanged && <div className="member-modal-action-row"><ModalField label="인증번호" name="code" value={form.code} onChange={updateField} maxLength={6} inputMode="numeric" /><button type="button" disabled={status.loading || phoneAuth.verified} onClick={verifyPhoneCode}>{phoneAuth.verified ? "인증완료" : "인증확인"}</button></div>}<ModalField label="이메일" name="email" value={form.email} onChange={updateField} type="email" />{status.message && <p className={`member-modal-message ${status.success ? "success" : "error"}`}>{status.message}</p>}<p className="member-modal-notice">◆ 비밀번호 변경 시 다시 로그인해야 합니다.</p><div className="member-modal-divider" /><div className="member-modal-buttons"><button className="member-modal-secondary" type="button" onClick={() => setStage("withdraw")}>탈퇴하기</button><button className="member-modal-primary" disabled={status.loading} type="submit">저장하기</button></div></form>}
    {stage === "withdraw" && <div className="member-modal-confirm"><h2>회원 탈퇴</h2><strong>정말 탈퇴하시겠습니까?</strong>{status.message && <p className="member-modal-message error">{status.message}</p>}<div className="member-modal-divider" /><div className="member-modal-buttons"><button className="member-modal-secondary" type="button" onClick={() => setStage("edit")}>취소</button><button className="member-modal-primary" disabled={status.loading} type="button" onClick={withdrawAccount}>탈퇴하기</button></div></div>}
    {stage === "withdrawn" && <div className="member-modal-confirm"><h2>회원 탈퇴</h2><strong>회원 탈퇴가 완료되었습니다.</strong><div className="member-modal-divider" /><button className="member-modal-primary" type="button" onClick={finish}>닫기</button></div>}
    {stage === "saved" && <div className="member-modal-confirm"><h2>회원 정보 수정</h2><strong>{status.message}</strong><div className="member-modal-divider" /><button className="member-modal-primary" type="button" onClick={finish}>닫기</button></div>}
  </section></div>;
}

/** 회원정보 수정 모달의 라벨과 입력창을 공통 구조로 표시한다. */
function ModalField({ label, ...inputProps }) { return <label className="member-modal-field"><strong>{label}</strong><input {...inputProps} /></label>; }
