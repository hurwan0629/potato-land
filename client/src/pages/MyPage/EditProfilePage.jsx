import { useNavigate, useParams } from "react-router";

import MemberEditModal from "../../component/modal/MemberEditModal";
import { useAuth } from "../../context/AuthContext";

/** 기존 마이페이지 정보 수정 경로에서 회원정보 수정 모달만 표시한다. */
export default function EditProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  /** 모달을 닫으면 기존 마이페이지 화면으로 돌아간다. */
  function closeModal() { navigate(`/mypage/${id}`, { replace: true }); }

  return <MemberEditModal loginId={user?.loginId} returnPath={`/mypage/${id}`} onClose={closeModal} />;
}
