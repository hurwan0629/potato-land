import { useEffect, useState } from "react";

import { authApi } from "../../api/authApi";
import "./AccountRecoveryModal.css";

const initialForm = { name: "", loginId: "", phone: "", code: "", password: "", passwordConfirm: "" };

/** 입력한 전화번호에서 숫자 이외의 문자를 제거한다. */
function normalizePhone(phone) { return phone.replace(/[^\d]/g, ""); }

/** 비밀번호가 8~20자이며 영문·숫자·특수문자 중 두 종류 이상인지 확인한다. */
function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) return false;
  return [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length >= 2;
}

/** 계정 확인 API 오류를 사용자가 확인해야 하는 입력 필드별 문구로 변환한다. */
function getAccountCheckMessage(error) {
  const field = error.data?.details?.field;
  if (field === "name") return "이름을 확인해주세요.";
  if (field === "loginId") return "아이디를 확인해주세요.";
  if (field === "phone") return "전화번호를 확인해주세요.";
  return error.message;
}

/** 아이디 찾기와 비밀번호 재설정의 본인인증 모달 단계를 관리한다. */
export default function AccountRecoveryModal({ type, onClose }) {
  const isFindId = type === "findId";
  const purpose = isFindId ? "FIND_ID" : "RESET_PASSWORD";
  const [form, setForm] = useState(initialForm);
  const [stage, setStage] = useState("verify");
  const [phoneVerificationId, setPhoneVerificationId] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resultLoginId, setResultLoginId] = useState("");
  const [status, setStatus] = useState({ loading: false, message: "", success: false });
  const passwordValid = isValidPassword(form.password);
  const passwordMatches = form.password === form.passwordConfirm;

  /** 모달이 열린 동안 Escape 키를 누르면 모달을 닫는다. */
  useEffect(() => {
    function closeOnEscape(event) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  /** 인증번호 재발송 제한시간을 1초마다 줄인다. */
  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  /** 폼 입력값을 갱신하고 전화번호 변경 시 기존 인증 식별자를 초기화한다. */
  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setStatus({ loading: false, message: "", success: false });
    if (name === "phone") setPhoneVerificationId("");
  }

  /** 현재 전화번호로 목적에 맞는 SOLAPI 인증번호 발송을 요청한다. */
  async function sendCode() {
    setStatus({ loading: true, message: "", success: false });
    try {
      const account = isFindId ? { name: form.name } : { name: form.name, loginId: form.loginId };
      const result = await authApi.sendPhoneCode(normalizePhone(form.phone), purpose, account);
      setPhoneVerificationId(result.phoneVerificationId);
      setResendSeconds(result.resendAfterSeconds);
      setStatus({ loading: false, message: "인증번호를 발송했습니다.", success: true });
    } catch (error) { setStatus({ loading: false, message: getAccountCheckMessage(error), success: false }); }
  }

  /** 인증번호를 검증하고 아이디 결과 또는 비밀번호 재설정 단계로 이동한다. */
  async function verifyCode() {
    setStatus({ loading: true, message: "", success: false });
    try {
      const phone = normalizePhone(form.phone);
      await authApi.verifyPhoneCode({ phone, phoneVerificationId, code: form.code, purpose });
      if (isFindId) {
        const result = await authApi.findLoginId({ name: form.name, phone, phoneVerificationId });
        setResultLoginId(result.loginId);
        setStage("result");
      } else {
        setStage("reset");
      }
      setStatus({ loading: false, message: "", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 본인인증한 계정의 비밀번호를 새 비밀번호로 변경한다. */
  async function resetPassword(event) {
    event.preventDefault();
    if (!passwordValid || !passwordMatches) return setStatus({ loading: false, message: "새 비밀번호 입력을 확인해주세요.", success: false });
    setStatus({ loading: true, message: "", success: false });
    try {
      await authApi.resetPassword({ loginId: form.loginId, name: form.name, phone: normalizePhone(form.phone), phoneVerificationId, password: form.password, passwordConfirm: form.passwordConfirm });
      setStage("complete");
      setStatus({ loading: false, message: "비밀번호가 재설정되었습니다.", success: true });
    } catch (error) { setStatus({ loading: false, message: error.message, success: false }); }
  }

  /** 반투명 배경 자체를 클릭했을 때만 모달을 닫는다. */
  function closeFromBackdrop(event) { if (event.target === event.currentTarget) onClose(); }

  return (
    <div className="recovery-backdrop" onMouseDown={closeFromBackdrop} role="presentation">
      <section className="recovery-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <button className="recovery-close" type="button" aria-label="닫기" onClick={onClose}>×</button>
        {stage === "verify" && <>
          <h2 id="recovery-title">{isFindId ? "아이디 찾기" : "비밀번호 찾기"}</h2>
          <RecoveryField label="이름" name="name" value={form.name} onChange={updateField} placeholder="이름을 입력해주세요" />
          {!isFindId && <RecoveryField label="아이디" name="loginId" value={form.loginId} onChange={updateField} placeholder="아이디를 입력해주세요" />}
          <div className="recovery-action-row"><RecoveryField label="휴대전화" name="phone" value={form.phone} onChange={updateField} placeholder="- 없이 입력해주세요" /><button type="button" disabled={status.loading || resendSeconds > 0} onClick={sendCode}>{resendSeconds > 0 ? `${resendSeconds}초` : "본인인증"}</button></div>
          {phoneVerificationId && <div className="recovery-action-row"><RecoveryField label="인증번호" name="code" value={form.code} onChange={updateField} inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" /><button type="button" disabled={status.loading} onClick={verifyCode}>인증확인</button></div>}
          {status.message && <p className={`recovery-message ${status.success ? "success" : "error"}`}>{status.message}</p>}
        </>}
        {stage === "result" && <div className="recovery-result"><h2 id="recovery-title">아이디 찾기</h2><p>회원님의 아이디는</p><strong>{resultLoginId}</strong><p>입니다.</p><button type="button" onClick={onClose}>로그인 하러가기</button></div>}
        {stage === "reset" && <form onSubmit={resetPassword}><h2 id="recovery-title">비밀번호 재설정</h2><RecoveryField label="새 비밀번호" name="password" value={form.password} onChange={updateField} type="password" placeholder="비밀번호를 입력해주세요" /><p className={`recovery-guide ${form.password && passwordValid ? "success" : "error"}`}>{form.password && passwordValid ? "✓" : "X"} 영문/숫자/특수문자 2가지 이상 조합(8~20자)</p><RecoveryField label="새 비밀번호 확인" name="passwordConfirm" value={form.passwordConfirm} onChange={updateField} type="password" placeholder="비밀번호를 다시 입력해주세요" />{form.passwordConfirm && <p className={`recovery-guide ${passwordMatches ? "success" : "error"}`}>{passwordMatches ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}</p>} {status.message && <p className="recovery-message error">{status.message}</p>}<button className="recovery-submit" disabled={status.loading} type="submit">비밀번호 변경</button></form>}
        {stage === "complete" && <div className="recovery-result"><h2 id="recovery-title">비밀번호 재설정</h2><p>비밀번호 재설정이 완료되었습니다.</p><button type="button" onClick={onClose}>로그인 하기</button></div>}
      </section>
    </div>
  );
}

/** 계정 복구 모달의 라벨과 입력창을 공통 구조로 표시한다. */
function RecoveryField({ label, ...inputProps }) { return <label className="recovery-field"><strong>{label}</strong><input {...inputProps} /></label>; }
