import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { transactionsApi } from "../../api/transactionsApi";
import { useAuth } from "../../context/AuthContext";

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let disposed = false;
    void transactionsApi.detail(id)
      .then((data) => {
        if (!disposed) setTransaction(data);
      })
      .catch((error) => {
        if (!disposed) setErrorMessage(error.message);
      });
    return () => {
      disposed = true;
    };
  }, [id]);

  const complete = async () => {
    setIsSubmitting(true);
    try {
      await transactionsApi.complete(id);
      setTransaction((current) => current ? { ...current, status: "COMPLETED" } : current);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = async () => {
    setIsSubmitting(true);
    try {
      await transactionsApi.cancel(id);
      setTransaction((current) => current ? { ...current, status: "CANCELED" } : current);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (errorMessage) return <p role="alert">{errorMessage}</p>;
  if (!transaction) return <p>송금 정보를 불러오는 중입니다.</p>;

  const currentUserIdx = Number(user?.userIdx ?? user?.id);
  const isBuyer = currentUserIdx === transaction.buyer.userIdx;
  const isSeller = currentUserIdx === transaction.seller.userIdx;
  return (
    <section style={{ padding: 40 }}>
      <h2>송금 요청</h2>
      <p>{transaction.listing.title}</p>
      <p>금액: {transaction.amount.toLocaleString()}원</p>
      <p>상태: {transaction.status}</p>
      {transaction.status === "REQUESTED" && isBuyer && <button type="button" disabled={isSubmitting} onClick={complete}>송금 완료</button>}
      {transaction.status === "REQUESTED" && isSeller && <button type="button" disabled={isSubmitting} onClick={cancel}>송금 요청 취소</button>}
      <button type="button" onClick={() => navigate(-1)}>돌아가기</button>
    </section>
  );
}
