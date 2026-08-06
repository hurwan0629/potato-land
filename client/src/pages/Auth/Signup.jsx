import { Link } from "react-router";

export default function Signup() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>회원 가입</h2>
      <p>아이디/비밀번호/닉네임/연락처 입력 폼이 들어갈 페이지입니다.</p>
      <p>
        이미 계정이 있으신가요? <Link to="/login">로그인 하러가기</Link>
      </p>
    </div>
  );
}
