import { useState } from "react";

import { checkLoginId, signup } from "../api/auth.api.js";
import { navigate } from "../common/navigation.js";
import { Footer } from "../components/Footer.jsx";
import { Header } from "../components/Header.jsx";

const initialForm = { name: "", nickname: "", loginId: "", password: "", passwordConfirm: "", phone: "", email: "", termsAgreed: false };

/** SMS 인증 없이 기본 회원 정보를 입력받아 계정을 생성한다. */
export function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [idCheck, setIdCheck] = useState({ checked: false, message: "" });
  const [status, setStatus] = useState({ submitting: false, message: "" });

  /** 회원가입 입력 필드 또는 약관 체크 상태를 갱신한다. */
  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    if (name === "loginId") setIdCheck({ checked: false, message: "" });
  }

  /** 입력한 아이디를 서버에 조회해 사용 가능 여부를 보여준다. */
  async function checkId() {
    try {
      const result = await checkLoginId(form.loginId);
      setIdCheck({ checked: result.available, message: result.available ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다." });
    } catch (error) {
      setIdCheck({ checked: false, message: error.message });
    }
  }

  /** 회원가입 API를 호출하고 성공 시 로그인 화면으로 이동한다. */
  async function submitSignup(event) {
    event.preventDefault();
    if (!idCheck.checked) return setStatus({ submitting: false, message: "아이디 중복 확인을 완료해주세요." });
    setStatus({ submitting: true, message: "" });
    try {
      await signup(form);
      window.alert("회원가입이 완료되었습니다. 로그인해주세요.");
      navigate("/login");
    } catch (error) {
      setStatus({ submitting: false, message: error.message });
    }
  }

  return <div className="page-shell signup-page"><Header authPage /><main className="signup-main"><form className="signup-panel" onSubmit={submitSignup}><h1>회원 가입</h1><SignupField label="이름" name="name" value={form.name} onChange={updateField} placeholder="이름을 입력해주세요" /><SignupField label="닉네임" name="nickname" value={form.nickname} onChange={updateField} placeholder="닉네임을 입력해주세요" /><div className="signup-row"><SignupField label="아이디" name="loginId" value={form.loginId} onChange={updateField} placeholder="영문과 숫자 4~20자" /><button className="check-button" type="button" onClick={checkId}>중복확인</button></div>{idCheck.message && <p className={`field-message ${idCheck.checked ? "success" : "error"}`}>{idCheck.message}</p>}<SignupField label="비밀번호" name="password" value={form.password} onChange={updateField} type="password" placeholder="영문·숫자·특수문자 포함 8자 이상" /><SignupField label="비밀번호 확인" name="passwordConfirm" value={form.passwordConfirm} onChange={updateField} type="password" placeholder="비밀번호를 다시 입력해주세요" /><SignupField label="전화번호" name="phone" value={form.phone} onChange={updateField} placeholder="- 없이 입력해주세요" /><SignupField label="이메일" name="email" value={form.email} onChange={updateField} type="email" placeholder="(선택) 이메일을 입력해주세요" /><label className="terms"><input name="termsAgreed" checked={form.termsAgreed} onChange={updateField} type="checkbox" /> 이용약관 및 개인정보 처리방침에 동의합니다</label>{status.message && <p className="form-message error" role="alert">{status.message}</p>}<button className="primary signup-submit" disabled={status.submitting} type="submit">{status.submitting ? "가입 중..." : "회원가입"}</button></form><div className="signup-mascot" aria-hidden="true">🛒<span>🥔</span></div></main><Footer /></div>;
}

/** 회원가입 라벨과 input을 일관된 행 구조로 표시한다. */
function SignupField({ label, ...inputProps }) {
  return <label className="signup-field"><strong>{label}</strong><input {...inputProps} /></label>;
}
