import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  MessageSquareText,
  Phone,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

import { authApi } from "../../api/appApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { normalizePhone } from "../../utils/format";
import { InlineAlert, Modal, Tabs } from "../components/ui";

const INITIAL_SIGNUP_FORM = {
  name: "",
  nickname: "",
  loginId: "",
  password: "",
  passwordConfirm: "",
  phone: "",
  verificationCode: "",
  email: "",
  termsAgreed: false,
};

const INITIAL_PHONE_STATE = {
  phoneVerificationId: "",
  verified: false,
  resendSeconds: 0,
  message: "",
};

function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) {
    return false;
  }

  return [
    /[A-Za-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z\d]/.test(password),
  ].filter(Boolean).length >= 2;
}

function PasswordInput({ name, value, placeholder, onChange, required = true }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete={name === "password" ? "current-password" : "new-password"}
        onChange={onChange}
      />
      <button
        type="button"
        className="icon-button icon-button--small"
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { notify } = useToast();
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    loginId: localStorage.getItem("rememberedLoginId") ?? "",
    password: "",
    rememberLoginId: Boolean(localStorage.getItem("rememberedLoginId")),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(form);
      if (form.rememberLoginId) {
        localStorage.setItem("rememberedLoginId", form.loginId);
      } else {
        localStorage.removeItem("rememberedLoginId");
      }

      notify("반갑습니다! 로그인되었습니다.", "success");
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Link to="/" className="auth-back-link">
          <ArrowLeft size={17} />
          홈으로 돌아가기
        </Link>
        <div className="auth-visual__content">
          <span className="auth-potato" aria-hidden="true">🥔</span>
          <p>다시 만나서 반가워요</p>
          <h1>감자나라에서<br />좋은 거래를 시작해요.</h1>
          <ul>
            <li><ShieldCheck size={18} />HttpOnly 쿠키 기반 안전한 로그인</li>
            <li><MessageSquareText size={18} />실시간 채팅과 알림</li>
            <li><KeyRound size={18} />Redis 세션 관리</li>
          </ul>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-panel__heading">
            <p>Welcome back</p>
            <h2>로그인</h2>
            <span>아이디와 비밀번호를 입력해주세요.</span>
          </div>

          {location.state?.signupComplete && (
            <InlineAlert tone="success">
              <Check size={18} />
              회원가입이 완료되었습니다. 로그인해주세요.
            </InlineAlert>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>아이디</span>
              <input
                value={form.loginId}
                required
                autoComplete="username"
                placeholder="아이디를 입력해주세요"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  loginId: event.target.value,
                }))}
              />
            </label>

            <label className="field">
              <span>비밀번호</span>
              <PasswordInput
                name="password"
                value={form.password}
                placeholder="비밀번호를 입력해주세요"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))}
              />
            </label>

            <div className="auth-form__options">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.rememberLoginId}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    rememberLoginId: event.target.checked,
                  }))}
                />
                아이디 저장
              </label>
              <button type="button" className="text-button" onClick={() => setRecoveryOpen(true)}>
                아이디·비밀번호 찾기
              </button>
            </div>

            <button type="submit" className="button button--large" disabled={isSubmitting}>
              <LogIn size={19} />
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="auth-switch">
            아직 계정이 없나요?
            <Link to="/signup">회원가입</Link>
          </p>
        </div>
      </section>

      <RecoveryModal open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </div>
  );
}

function RecoveryModal({ open, onClose }) {
  const [mode, setMode] = useState("FIND_ID");
  const [form, setForm] = useState({
    name: "",
    loginId: "",
    phone: "",
    code: "",
    password: "",
    passwordConfirm: "",
  });
  const [verification, setVerification] = useState(INITIAL_PHONE_STATE);
  const [result, setResult] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (verification.resendSeconds <= 0) {
      return undefined;
    }

    const timer = globalThis.setInterval(() => {
      setVerification((current) => ({
        ...current,
        resendSeconds: Math.max(0, current.resendSeconds - 1),
      }));
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, [verification.resendSeconds]);

  const reset = (nextMode = mode) => {
    setMode(nextMode);
    setForm({
      name: "",
      loginId: "",
      phone: "",
      code: "",
      password: "",
      passwordConfirm: "",
    });
    setVerification(INITIAL_PHONE_STATE);
    setResult(null);
  };

  const sendCode = async () => {
    setIsWorking(true);
    try {
      const response = await authApi.sendPhoneCode({
        name: form.name,
        loginId: mode === "RESET_PASSWORD" ? form.loginId : undefined,
        phone: normalizePhone(form.phone),
        purpose: mode,
      });
      setVerification({
        phoneVerificationId: response.phoneVerificationId,
        verified: false,
        resendSeconds: Number(response.resendAfterSeconds ?? 0),
        message: "인증번호를 발송했습니다.",
      });
    } catch (error) {
      setVerification((current) => ({ ...current, message: error.message }));
    } finally {
      setIsWorking(false);
    }
  };

  const verifyCode = async () => {
    setIsWorking(true);
    try {
      await authApi.verifyPhoneCode({
        phone: normalizePhone(form.phone),
        purpose: mode,
        phoneVerificationId: verification.phoneVerificationId,
        code: form.code,
      });
      setVerification((current) => ({
        ...current,
        verified: true,
        message: "본인인증이 완료되었습니다.",
      }));
    } catch (error) {
      setVerification((current) => ({ ...current, verified: false, message: error.message }));
    } finally {
      setIsWorking(false);
    }
  };

  const finishRecovery = async (event) => {
    event.preventDefault();
    setIsWorking(true);
    try {
      if (mode === "FIND_ID") {
        const response = await authApi.findLoginId({
          name: form.name,
          phone: normalizePhone(form.phone),
          phoneVerificationId: verification.phoneVerificationId,
        });
        setResult({
          title: "아이디를 찾았습니다.",
          value: response.loginId,
        });
      } else {
        await authApi.resetPassword({
          loginId: form.loginId,
          name: form.name,
          phone: normalizePhone(form.phone),
          phoneVerificationId: verification.phoneVerificationId,
          password: form.password,
          passwordConfirm: form.passwordConfirm,
        });
        setResult({
          title: "비밀번호가 변경되었습니다.",
          value: "새 비밀번호로 로그인해주세요.",
        });
      }
    } catch (error) {
      setResult({ title: "처리하지 못했습니다.", value: error.message, error: true });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal
      open={open}
      title="계정 찾기"
      description="가입할 때 인증한 휴대전화로 본인확인을 진행합니다."
      onClose={onClose}
    >
      <Tabs
        items={[
          { value: "FIND_ID", label: "아이디 찾기" },
          { value: "RESET_PASSWORD", label: "비밀번호 재설정" },
        ]}
        value={mode}
        onChange={reset}
      />

      {result ? (
        <div className={`recovery-result ${result.error ? "is-error" : ""}`}>
          <span aria-hidden="true">{result.error ? "⚠️" : "🥔"}</span>
          <strong>{result.title}</strong>
          <p>{result.value}</p>
          <button type="button" className="button" onClick={() => reset(mode)}>다시 진행</button>
        </div>
      ) : (
        <form className="auth-form recovery-form" onSubmit={finishRecovery}>
          <label className="field">
            <span>이름</span>
            <input
              value={form.name}
              required
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          {mode === "RESET_PASSWORD" && (
            <label className="field">
              <span>아이디</span>
              <input
                value={form.loginId}
                required
                onChange={(event) => setForm((current) => ({ ...current, loginId: event.target.value }))}
              />
            </label>
          )}

          <div className="field-row">
            <label className="field">
              <span>휴대전화</span>
              <input
                value={form.phone}
                required
                disabled={verification.verified}
                inputMode="tel"
                placeholder="01012345678"
                onChange={(event) => {
                  setForm((current) => ({ ...current, phone: event.target.value }));
                  setVerification(INITIAL_PHONE_STATE);
                }}
              />
            </label>
            <button
              type="button"
              className="button button--secondary field-row__button"
              disabled={isWorking || verification.resendSeconds > 0 || verification.verified}
              onClick={sendCode}
            >
              <Phone size={17} />
              {verification.resendSeconds > 0 ? `${verification.resendSeconds}초` : "인증번호"}
            </button>
          </div>

          {verification.phoneVerificationId && !verification.verified && (
            <div className="field-row">
              <label className="field">
                <span>인증번호</span>
                <input
                  value={form.code}
                  required
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                />
              </label>
              <button
                type="button"
                className="button button--secondary field-row__button"
                disabled={isWorking}
                onClick={verifyCode}
              >
                인증 확인
              </button>
            </div>
          )}

          {verification.message && (
            <InlineAlert tone={verification.verified ? "success" : "info"}>
              {verification.message}
            </InlineAlert>
          )}

          {mode === "RESET_PASSWORD" && verification.verified && (
            <>
              <label className="field">
                <span>새 비밀번호</span>
                <PasswordInput
                  name="newPassword"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>새 비밀번호 확인</span>
                <PasswordInput
                  name="newPasswordConfirm"
                  value={form.passwordConfirm}
                  onChange={(event) => setForm((current) => ({ ...current, passwordConfirm: event.target.value }))}
                />
              </label>
            </>
          )}

          <button
            type="submit"
            className="button button--large"
            disabled={isWorking || !verification.verified}
          >
            {mode === "FIND_ID" ? "아이디 확인" : "비밀번호 변경"}
          </button>
        </form>
      )}
    </Modal>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState(INITIAL_SIGNUP_FORM);
  const [loginIdCheck, setLoginIdCheck] = useState({ checked: false, message: "" });
  const [phoneState, setPhoneState] = useState(INITIAL_PHONE_STATE);
  const [isWorking, setIsWorking] = useState(false);

  const passwordValid = useMemo(() => isValidPassword(form.password), [form.password]);
  const passwordMatches = form.password === form.passwordConfirm;

  useEffect(() => {
    if (phoneState.resendSeconds <= 0) {
      return undefined;
    }

    const timer = globalThis.setInterval(() => {
      setPhoneState((current) => ({
        ...current,
        resendSeconds: Math.max(0, current.resendSeconds - 1),
      }));
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, [phoneState.resendSeconds]);

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "loginId") {
      setLoginIdCheck({ checked: false, message: "" });
    }
    if (name === "phone") {
      setPhoneState(INITIAL_PHONE_STATE);
    }
  };

  const checkLoginId = async () => {
    setIsWorking(true);
    try {
      const response = await authApi.checkLoginId(form.loginId);
      setLoginIdCheck({
        checked: Boolean(response.available),
        message: response.available ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다.",
      });
    } catch (error) {
      setLoginIdCheck({ checked: false, message: error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const sendPhoneCode = async () => {
    setIsWorking(true);
    try {
      const response = await authApi.sendPhoneCode({
        phone: normalizePhone(form.phone),
        purpose: "SIGNUP",
      });
      setPhoneState({
        phoneVerificationId: response.phoneVerificationId,
        verified: false,
        resendSeconds: Number(response.resendAfterSeconds ?? 0),
        message: "인증번호를 발송했습니다.",
      });
    } catch (error) {
      setPhoneState((current) => ({ ...current, message: error.message }));
    } finally {
      setIsWorking(false);
    }
  };

  const verifyPhoneCode = async () => {
    setIsWorking(true);
    try {
      await authApi.verifyPhoneCode({
        phone: normalizePhone(form.phone),
        purpose: "SIGNUP",
        phoneVerificationId: phoneState.phoneVerificationId,
        code: form.verificationCode,
      });
      setPhoneState((current) => ({
        ...current,
        verified: true,
        message: "휴대전화 인증이 완료되었습니다.",
      }));
    } catch (error) {
      setPhoneState((current) => ({ ...current, verified: false, message: error.message }));
    } finally {
      setIsWorking(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!loginIdCheck.checked) {
      notify("아이디 중복 확인을 완료해주세요.", "error");
      return;
    }
    if (!passwordValid || !passwordMatches) {
      notify("비밀번호 입력을 확인해주세요.", "error");
      return;
    }
    if (!phoneState.verified) {
      notify("휴대전화 인증을 완료해주세요.", "error");
      return;
    }

    setIsWorking(true);
    try {
      await authApi.signup({
        name: form.name,
        nickname: form.nickname,
        loginId: form.loginId,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        phone: normalizePhone(form.phone),
        phoneVerificationId: phoneState.phoneVerificationId,
        email: form.email,
        termsAgreed: form.termsAgreed,
      });
      navigate("/login", { replace: true, state: { signupComplete: true } });
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-page__visual" aria-hidden="true">
        <span>🥔</span>
        <p>감자나라 주민이<br />되어보세요!</p>
      </div>

      <section className="signup-panel">
        <Link to="/login" className="auth-back-link">
          <ArrowLeft size={17} />
          로그인으로 돌아가기
        </Link>
        <header>
          <p>Join Potato Land</p>
          <h1>회원가입</h1>
          <span>필수 정보와 휴대전화 인증을 완료해주세요.</span>
        </header>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>이름</span>
              <input name="name" value={form.name} required onChange={updateField} />
            </label>
            <label className="field">
              <span>닉네임</span>
              <input name="nickname" value={form.nickname} required onChange={updateField} />
            </label>

            <div className="field field--wide">
              <span>아이디</span>
              <div className="field-inline">
                <input
                  name="loginId"
                  value={form.loginId}
                  required
                  pattern="[A-Za-z0-9]{4,20}"
                  placeholder="영문과 숫자 4~20자"
                  onChange={updateField}
                />
                <button type="button" className="button button--secondary" disabled={isWorking} onClick={checkLoginId}>
                  중복 확인
                </button>
              </div>
              {loginIdCheck.message && (
                <small className={loginIdCheck.checked ? "field-message--success" : "field-message--error"}>
                  {loginIdCheck.message}
                </small>
              )}
            </div>

            <label className="field">
              <span>비밀번호</span>
              <PasswordInput name="password" value={form.password} onChange={updateField} />
              <small className={form.password && !passwordValid ? "field-message--error" : undefined}>
                영문·숫자·특수문자 중 2가지 이상, 8~20자
              </small>
            </label>
            <label className="field">
              <span>비밀번호 확인</span>
              <PasswordInput name="passwordConfirm" value={form.passwordConfirm} onChange={updateField} />
              {form.passwordConfirm && (
                <small className={passwordMatches ? "field-message--success" : "field-message--error"}>
                  {passwordMatches ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
                </small>
              )}
            </label>

            <div className="field field--wide">
              <span>휴대전화</span>
              <div className="field-inline">
                <input
                  name="phone"
                  value={form.phone}
                  required
                  disabled={phoneState.verified}
                  inputMode="tel"
                  placeholder="01012345678"
                  onChange={updateField}
                />
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={isWorking || phoneState.resendSeconds > 0 || phoneState.verified}
                  onClick={sendPhoneCode}
                >
                  <Phone size={17} />
                  {phoneState.resendSeconds > 0 ? `${phoneState.resendSeconds}초` : "본인인증"}
                </button>
              </div>
            </div>

            {phoneState.phoneVerificationId && !phoneState.verified && (
              <div className="field field--wide">
                <span>인증번호</span>
                <div className="field-inline">
                  <input
                    name="verificationCode"
                    value={form.verificationCode}
                    required
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6자리 인증번호"
                    onChange={updateField}
                  />
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={isWorking}
                    onClick={verifyPhoneCode}
                  >
                    인증 확인
                  </button>
                </div>
              </div>
            )}

            {phoneState.message && (
              <div className="field field--wide">
                <InlineAlert tone={phoneState.verified ? "success" : "info"}>
                  {phoneState.message}
                </InlineAlert>
              </div>
            )}

            <label className="field field--wide">
              <span>이메일 <small>(선택)</small></span>
              <input name="email" type="email" value={form.email} onChange={updateField} />
            </label>
          </div>

          <label className="terms-card">
            <input
              name="termsAgreed"
              type="checkbox"
              checked={form.termsAgreed}
              required
              onChange={updateField}
            />
            <span>
              <strong>이용약관 및 개인정보 처리방침에 동의합니다.</strong>
              <small>서비스 이용과 거래 알림 제공을 위해 필요한 동의입니다.</small>
            </span>
          </label>

          <button type="submit" className="button button--large" disabled={isWorking}>
            <UserRoundPlus size={19} />
            {isWorking ? "처리 중..." : "회원가입 완료"}
          </button>
        </form>
      </section>
    </div>
  );
}
