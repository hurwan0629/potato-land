import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import ProfileModal from "../../components/modal/profileModal";
export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // =========================
  // 모달 닫기
  // =========================

  const handleClose = () => {
    navigate(-1);
  };
  // =========================
  // 프로필 저장
  // =========================

  const handleSave = async (data) => {

    try {

      console.log(
        "프로필 수정 데이터:",
        data
      );
      /*
        나중에 실제 API 연결

        예:

        await http.patch(
          `/users/${user.id}`,
          data
        );
      */
      // 저장 완료 후 이전 페이지로 이동
      navigate(-1);
    } catch (error) {
      console.error(
        "프로필 수정 실패:",
        error
      )
    }
  }
  return (
    <ProfileModal
      user={user}
      onSave={handleSave}
      onClose={handleClose}
    />
  )
}