import { useState } from "react";

import { login } from "../api/auth.api.js";
import { navigate } from "../common/navigation.js";
import { Footer } from "../components/Footer.jsx";
import { Header } from "../components/Header.jsx";

/** 로그인 폼을 제출하고 성공 시 비로그인 메인 경로로 이동한다. */
export function LoginPage() {
  const [form, setForm] = useState(() => ({ loginId: localStorage.getItem("rememberedLoginId") ?? "", password: "", rememberLoginId: Boolean(localStorage.getItem("rememberedLoginId")) }));
  const [status, setStatus] = useState({ submitting: false, message: "" });

  /** 입력 필드와 아이디 저장 체크 상태를 갱신한다. */
  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  /** 서버 로그인 API를 호출하고 아이디 저장 및 이동을 처리한다. */
  async function submitLogin(event) {
    event.preventDefault();
    if (!form.loginId || !form.password) return setStatus({ submitting: false, message: "아이디와 비밀번호를 입력해주세요." });
    setStatus({ submitting: true, message: "" });
    try {
      await login(form);
      if (form.rememberLoginId) localStorage.setItem("rememberedLoginId", form.loginId);
      else localStorage.removeItem("rememberedLoginId");
      navigate("/");
    } catch (error) {
      setStatus({ submitting: false, message: error.message });
    }
  }

  return <div className="page-shell login-page"><Header authPage /><main className="login-main"><div className="login-mascot" aria-hidden="true">🥔<span>⚖</span></div><form className="login-panel" onSubmit={submitLogin}><h1>감자 나라</h1><p>귀여운 감자와 함께하는 안전한 중고거래!</p><label><span className="sr-only">아이디</span><input name="loginId" value={form.loginId} onChange={updateField} placeholder="아이디" autoComplete="username" /></label><label><span className="sr-only">비밀번호</span><input name="password" value={form.password} onChange={updateField} type="password" placeholder="비밀번호" autoComplete="current-password" /></label><label className="remember"><input name="rememberLoginId" checked={form.rememberLoginId} onChange={updateField} type="checkbox" /> 아이디 저장</label>{status.message && <p className="form-message error" role="alert">{status.message}</p>}<button className="primary" disabled={status.submitting} type="submit">{status.submitting ? "로그인 중..." : "로그인"}</button><div className="divider"><span>또는</span></div><button className="signup" type="button" onClick={() => navigate("/signup")}>회원가입</button><div className="account-links"><button className="inactive" type="button">아이디 찾기</button><i /><button className="inactive" type="button">비밀번호 찾기</button></div></form></main><Footer /></div>;
}
