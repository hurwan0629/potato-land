import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { authApi } from "../../api/authApi";
import signupPotato from "../../assets/potato/signup-potato.png";
import "./Signup.css";

const initialForm = { name: "", nickname: "", loginId: "", password: "", passwordConfirm: "", phone: "", verificationCode: "", email: "", termsAgreed: false };
const initialPhoneAuth = { phoneVerificationId: "", verified: false, isSending: false, isVerifying: false, resendSeconds: 0, message: "" };

/** 비밀번호가 8~20자이며 영문·숫자·특수문자 중 두 종류 이상인지 확인한다. */
function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) return false;
  return [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length >= 2;
}

/** 입력한 휴대전화 번호에서 숫자 이외의 문자를 제거한다. */
function normalizePhone(phone) { return phone.replace(/[^\d]/g, ""); }

/** 회원가입 입력, 실시간 검증과 휴대전화 인증 흐름을 관리한다. */
export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [idCheck, setIdCheck] = useState({ checked: false, message: "" });
  const [phoneAuth, setPhoneAuth] = useState(initialPhoneAuth);
  const [status, setStatus] = useState({ isSubmitting: false, message: "" });
  const passwordValid = isValidPassword(form.password);
  const passwordConfirmMatches = form.passwordConfirm === form.password;

  /** 재발송 제한시간을 화면에서 1초마다 줄인다. */
  useEffect(() => {
    if (phoneAuth.resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setPhoneAuth((current) => ({ ...current, resendSeconds: Math.max(current.resendSeconds - 1, 0) })), 1000);
    return () => window.clearInterval(timer);
  }, [phoneAuth.resendSeconds]);

  /** 입력값 또는 약관 체크 상태를 갱신하고 관련 인증 상태를 초기화한다. */
  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (name === "loginId") setIdCheck({ checked: false, message: "" });
    if (name === "phone") setPhoneAuth(initialPhoneAuth);
  }

  /** 서버에서 아이디 사용 가능 여부를 확인한다. */
  async function handleCheckLoginId() {
    try {
      const result = await authApi.checkLoginId(form.loginId);
      setIdCheck({ checked: result.available, message: result.available ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다." });
    } catch (error) { setIdCheck({ checked: false, message: error.message }); }
  }

  /** SOLAPI 문자 인증번호 발송을 요청하고 서버가 발급한 인증 식별자를 저장한다. */
  async function handleSendPhoneCode() {
    setPhoneAuth((current) => ({ ...current, isSending: true, message: "" }));
    try {
      const result = await authApi.sendPhoneCode(normalizePhone(form.phone));
      setPhoneAuth({ phoneVerificationId: result.phoneVerificationId, verified: false, isSending: false, isVerifying: false, resendSeconds: result.resendAfterSeconds, message: "인증번호를 발송했습니다." });
    } catch (error) { setPhoneAuth((current) => ({ ...current, isSending: false, message: error.message })); }
  }

  /** 사용자가 입력한 6자리 인증번호를 서버에서 검증한다. */
  async function handleVerifyPhoneCode() {
    setPhoneAuth((current) => ({ ...current, isVerifying: true, message: "" }));
    try {
      await authApi.verifyPhoneCode({ phone: normalizePhone(form.phone), phoneVerificationId: phoneAuth.phoneVerificationId, code: form.verificationCode });
      setPhoneAuth((current) => ({ ...current, verified: true, isVerifying: false, message: "휴대전화 인증이 완료되었습니다." }));
    } catch (error) { setPhoneAuth((current) => ({ ...current, verified: false, isVerifying: false, message: error.message })); }
  }

  /** 검증된 회원가입 정보를 서버에 저장하고 로그인 페이지로 이동한다. */
  async function handleSubmit(event) {
    event.preventDefault();
    if (!idCheck.checked) return setStatus({ isSubmitting: false, message: "아이디 중복 확인을 완료해주세요." });
    if (!passwordValid || !passwordConfirmMatches) return setStatus({ isSubmitting: false, message: "비밀번호 입력을 확인해주세요." });
    if (!phoneAuth.verified) return setStatus({ isSubmitting: false, message: "휴대전화 인증을 완료해주세요." });
    setStatus({ isSubmitting: true, message: "" });
    try {
      const signupForm = { name: form.name, nickname: form.nickname, loginId: form.loginId, password: form.password, passwordConfirm: form.passwordConfirm, phone: normalizePhone(form.phone), email: form.email, termsAgreed: form.termsAgreed, phoneVerificationId: phoneAuth.phoneVerificationId };
      await authApi.signup(signupForm);
      navigate("/login", { replace: true, state: { signupComplete: true } });
    } catch (error) { setStatus({ isSubmitting: false, message: error.message }); }
  }

  return (
    <section className="auth-signup">
      <form className="auth-signup-panel" onSubmit={handleSubmit}>
        <h1>회원가입</h1>
        <SignupField label="이름" name="name" value={form.name} onChange={updateField} placeholder="이름을 입력해주세요" />
        <SignupField label="닉네임" name="nickname" value={form.nickname} onChange={updateField} placeholder="닉네임을 입력해주세요" />
        <div className="auth-signup-row"><SignupField label="아이디" name="loginId" value={form.loginId} onChange={updateField} placeholder="영문과 숫자 4~20자" /><button className="auth-check-button" type="button" onClick={handleCheckLoginId}>중복확인</button></div>
        {idCheck.message && <p className={`auth-field-message ${idCheck.checked ? "success" : "error"}`}>{idCheck.message}</p>}
        <SignupField label="비밀번호" name="password" value={form.password} onChange={updateField} type="password" placeholder="영문·숫자·특수문자 2가지 이상 조합" />
        {form.password && <p className={`auth-password-guide ${passwordValid ? "success" : "error"}`}>{passwordValid ? "✓" : "X"} 영문/숫자/특수문자 2가지 이상 조합(8~20자)</p>}
        <SignupField label="비밀번호 확인" name="passwordConfirm" value={form.passwordConfirm} onChange={updateField} type="password" placeholder="비밀번호를 다시 입력해주세요" />
        {form.passwordConfirm && <p className={`auth-password-guide ${passwordConfirmMatches ? "success" : "error"}`}>{passwordConfirmMatches ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}</p>}
        <div className="auth-signup-row"><SignupField label="휴대전화" name="phone" value={form.phone} onChange={updateField} disabled={phoneAuth.verified} placeholder="- 없이 입력해주세요" /><button className="auth-check-button" type="button" disabled={phoneAuth.isSending || phoneAuth.resendSeconds > 0 || phoneAuth.verified} onClick={handleSendPhoneCode}>{phoneAuth.isSending ? "발송 중" : phoneAuth.resendSeconds > 0 ? `${phoneAuth.resendSeconds}초` : "본인인증"}</button></div>
        {phoneAuth.phoneVerificationId && !phoneAuth.verified && <div className="auth-signup-row"><SignupField label="인증번호" name="verificationCode" value={form.verificationCode} onChange={updateField} inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" /><button className="auth-check-button" type="button" disabled={phoneAuth.isVerifying} onClick={handleVerifyPhoneCode}>{phoneAuth.isVerifying ? "확인 중" : "인증확인"}</button></div>}
        {phoneAuth.message && <p className={`auth-field-message ${phoneAuth.verified ? "success" : "phone-info"}`}>{phoneAuth.message}</p>}
        <SignupField label="이메일" name="email" value={form.email} onChange={updateField} type="email" placeholder="(선택) 이메일을 입력해주세요" />
        <label className="auth-terms"><input name="termsAgreed" checked={form.termsAgreed} onChange={updateField} type="checkbox" /> 이용약관 및 개인정보 처리방침에 동의합니다.</label>
        {status.message && <p className="auth-form-message error" role="alert">{status.message}</p>}
        <button className="auth-signup-submit" disabled={status.isSubmitting} type="submit">{status.isSubmitting ? "가입 중..." : "회원가입"}</button>
      </form>
      <div className="auth-signup-mascot" aria-hidden="true"><img src={signupPotato} alt="" /></div>
    </section>
  );
}

/** 회원가입 라벨과 입력창을 공통 구조로 표시한다. */
function SignupField({ label, ...inputProps }) { return <label className="auth-signup-field"><strong>{label}</strong><input {...inputProps} /></label>; }
