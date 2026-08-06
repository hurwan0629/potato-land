import { useState } from "react";
import { useNavigate } from "react-router";

import AccountRecoveryModal from "../features/Auth/AccountRecoveryModal";
import { useAuth } from "../context/AuthContext";
import loginPotato from "../assets/potato/login-potato.png";
import "./Login.css";

/** 로그인 폼과 계정 찾기 모달의 표시 상태를 관리한다. */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ loginId: localStorage.getItem("rememberedLoginId") ?? "", password: "", rememberLoginId: Boolean(localStorage.getItem("rememberedLoginId")) }));
  const [status, setStatus] = useState({ isSubmitting: false, message: "" });
  const [recoveryType, setRecoveryType] = useState(null);

  /** 로그인 입력값 또는 아이디 저장 체크 상태를 갱신한다. */
  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  /** 인증 Context를 통해 로그인하고 아이디 저장 여부를 반영한다. */
  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ isSubmitting: true, message: "" });
    const result = await login(form);
    if (!result.ok) return setStatus({ isSubmitting: false, message: result.message });
    if (form.rememberLoginId) localStorage.setItem("rememberedLoginId", form.loginId);
    else localStorage.removeItem("rememberedLoginId");
    navigate("/");
  }

  return (
    <section className="auth-login">
      <div className="auth-login-mascot" aria-hidden="true"><img src={loginPotato} alt="" /></div>
      <form className="auth-login-panel" onSubmit={handleSubmit}>
        <h1>감자 나라</h1>
        <p className="auth-login-copy">귀여운 감자와 함께하는 안전한 중고거래!</p>
        <label className="auth-sr-only" htmlFor="loginId">아이디</label>
        <input id="loginId" name="loginId" value={form.loginId} onChange={updateField} placeholder="아이디" autoComplete="username" />
        <label className="auth-sr-only" htmlFor="password">비밀번호</label>
        <input id="password" name="password" value={form.password} onChange={updateField} type="password" placeholder="비밀번호" autoComplete="current-password" />
        <label className="auth-remember"><input name="rememberLoginId" checked={form.rememberLoginId} onChange={updateField} type="checkbox" /> 아이디 저장</label>
        {status.message && <p className="auth-message error" role="alert">{status.message}</p>}
        <button className="auth-primary" disabled={status.isSubmitting} type="submit">{status.isSubmitting ? "로그인 중..." : "로그인"}</button>
        <div className="auth-divider"><span>또는</span></div>
        <button className="auth-signup-button" type="button" onClick={() => navigate("/signup")}>회원가입</button>
        <div className="auth-account-links"><button type="button" onClick={() => setRecoveryType("findId")}>아이디 찾기</button><i /><button type="button" onClick={() => setRecoveryType("resetPassword")}>비밀번호 찾기</button></div>
      </form>
      {recoveryType && <AccountRecoveryModal key={recoveryType} type={recoveryType} onClose={() => setRecoveryType(null)} />}
    </section>
  );
}
