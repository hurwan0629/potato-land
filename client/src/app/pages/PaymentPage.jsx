import { useCallback, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CreditCard,
  MessageCircle,
  ReceiptText,
  Star,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { reviewsApi, transactionsApi } from "../../api/appApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import { formatCurrency, formatDate, listingPath } from "../../utils/format";
import {
  Avatar,
  DetailRow,
  ErrorState,
  ImageWithFallback,
  InlineAlert,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
} from "../components/ui";

export default function PaymentPage() {
  const { transactionIdx } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadTransaction = useCallback(
    () => transactionsApi.get(transactionIdx),
    [transactionIdx],
  );
  const transactionRemote = useRemote(loadTransaction);
  const transaction = transactionRemote.data;

  const isBuyer = Number(transaction?.buyer?.userIdx) === Number(user.userIdx);
  const isSeller = Number(transaction?.seller?.userIdx) === Number(user.userIdx);
  const counterpart = isBuyer ? transaction?.seller : transaction?.buyer;

  const handleComplete = async () => {
    if (!globalThis.confirm("송금을 완료하고 거래를 확정할까요?")) {
      return;
    }

    setIsWorking(true);
    try {
      await transactionsApi.complete(transactionIdx);
      transactionRemote.reload();
      notify("거래가 완료되었습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const handleCancel = async () => {
    if (!globalThis.confirm("이 송금 요청을 취소할까요?")) {
      return;
    }

    setIsWorking(true);
    try {
      await transactionsApi.cancel(transactionIdx);
      transactionRemote.reload();
      notify("송금 요청을 취소했습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  if (transactionRemote.isLoading) {
    return <div className="page-container"><LoadingState label="거래 정보를 불러오는 중입니다." /></div>;
  }
  if (transactionRemote.error) {
    return <div className="page-container"><ErrorState error={transactionRemote.error} onRetry={transactionRemote.reload} /></div>;
  }
  if (!transaction) {
    return null;
  }

  return (
    <div className="page-container payment-page">
      <PageHeader
        eyebrow="안전 거래"
        title="거래 확인"
        description="거래 상대와 상품, 송금 요청 상태를 확인하세요."
        actions={<StatusBadge status={transaction.status} />}
      />

      <div className="payment-layout">
        <section className="content-card payment-summary">
          <div className="payment-product">
            <ImageWithFallback
              src={transaction.listing.thumbnailUrl}
              alt={transaction.listing.title}
              className="payment-product__image"
            />
            <div>
              <span>{transaction.listing.listingType === "AUCTION" ? "경매 낙찰" : "중고거래"}</span>
              <h2>{transaction.listing.title}</h2>
              <Link to={listingPath(transaction.listing)}>상품 상세 보기</Link>
            </div>
          </div>

          <div className="payment-amount">
            <CreditCard size={28} />
            <div>
              <p>송금 요청 금액</p>
              <strong>{formatCurrency(transaction.amount)}</strong>
            </div>
          </div>

          <dl className="detail-list">
            <DetailRow label="거래 번호">#{transaction.transactionIdx}</DetailRow>
            <DetailRow label="요청 시각">{formatDate(transaction.requestedAt, { withTime: true })}</DetailRow>
            {transaction.completedAt && (
              <DetailRow label="완료 시각">{formatDate(transaction.completedAt, { withTime: true })}</DetailRow>
            )}
          </dl>

          {transaction.status === "REQUESTED" && isBuyer && (
            <InlineAlert type="info">
              상품과 거래 내용을 확인한 뒤 송금 완료를 눌러주세요.
            </InlineAlert>
          )}
          {transaction.status === "COMPLETED" && (
            <InlineAlert type="success">거래가 안전하게 완료되었습니다.</InlineAlert>
          )}
          {transaction.status === "CANCELED" && (
            <InlineAlert type="error">취소된 송금 요청입니다.</InlineAlert>
          )}
        </section>

        <aside className="content-card payment-participants">
          <h2>거래 참여자</h2>
          <Participant label="판매자" person={transaction.seller} active={isSeller} />
          <Participant label="구매자" person={transaction.buyer} active={isBuyer} />

          <div className="payment-actions">
            {transaction.status === "REQUESTED" && isBuyer && (
              <button type="button" className="button" disabled={isWorking} onClick={handleComplete}>
                <BadgeCheck size={18} />
                송금 완료
              </button>
            )}
            {transaction.status === "REQUESTED" && isSeller && (
              <button type="button" className="button button--danger" disabled={isWorking} onClick={handleCancel}>
                <Ban size={18} />
                요청 취소
              </button>
            )}
            {transaction.status === "COMPLETED" && counterpart && (
              <button type="button" className="button" onClick={() => setReviewOpen(true)}>
                <Star size={18} />
                거래 후기 남기기
              </button>
            )}
            <button type="button" className="button button--secondary" onClick={() => navigate("/chat")}>
              <MessageCircle size={18} />
              채팅으로 이동
            </button>
          </div>
        </aside>
      </div>

      <ReviewModal
        open={reviewOpen}
        transaction={transaction}
        reviewee={counterpart}
        onClose={() => setReviewOpen(false)}
        onComplete={() => {
          setReviewOpen(false);
          notify("후기를 등록했습니다.", "success");
        }}
      />
    </div>
  );
}

function Participant({ label, person, active }) {
  return (
    <article className={`participant-card ${active ? "is-me" : ""}`}>
      <Avatar user={person} />
      <div>
        <span>{label}{active ? " · 나" : ""}</span>
        <strong>{person.nickname}</strong>
        <small>평점 {Number(person.averageRating ?? 0).toFixed(1)}</small>
      </div>
    </article>
  );
}

function ReviewModal({ open, transaction, reviewee, onClose, onComplete }) {
  const { notify } = useToast();
  const [rating, setRating] = useState(10);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await reviewsApi.create({
        transactionIdx: transaction.transactionIdx,
        revieweeIdx: reviewee.userIdx,
        rating,
        content: content.trim(),
      });
      onComplete();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="거래 후기"
      description={`${reviewee?.nickname ?? "거래 상대"}님과의 거래는 어떠셨나요?`}
      onClose={onClose}
    >
      <form className="review-form" onSubmit={handleSubmit}>
        <div className="review-score">
          <ReceiptText size={28} />
          <div><strong>{rating / 2}점</strong><span>10점 만점 기준 {rating}점</span></div>
        </div>
        <input type="range" min={1} max={10} value={rating} onChange={(event) => setRating(Number(event.target.value))} />
        <label className="form-field"><span>후기 내용</span><textarea rows={5} maxLength={50} value={content} placeholder="거래 경험을 간단히 남겨주세요." onChange={(event) => setContent(event.target.value)} /></label>
        <button type="submit" className="button" disabled={isSubmitting}>{isSubmitting ? "등록 중..." : "후기 등록"}</button>
      </form>
    </Modal>
  );
}
