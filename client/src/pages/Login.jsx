import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import Input from "../components/input/Input";
import Button from "../components/button/Button";
import USER_ROLE from "../constants/userRole";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await login({ id, password });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(result.user?.role === USER_ROLE.ADMIN ? "/admin" : "/");
  };

  return (
    <div className="login">
      <h1 className="login-title">🥔 감자나라</h1>
      <p>당신 곁의 감자를 찾아보세요!</p>

      <form className="login-form" onSubmit={handleSubmit}>
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="아이디"
        />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          type="password"
        />
        {error && <p className="login-error">{error}</p>}
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <p className="login-signup-link">
        아직 회원이 아니신가요? <Link to="/signup">회원가입</Link>
      </p>

      <p style={{ fontSize: 12, color: "#aaa" }}>
        * 백엔드 API 연동 전이라 로그인 요청은 아직 실패합니다. (/api/auth/login 미구현)
      </p>
    </div>
  );
}
