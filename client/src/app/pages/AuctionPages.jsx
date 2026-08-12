import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Clock3,
  Edit3,
  Eye,
  Gavel,
  Heart,
  History,
  MapPin,
  Trophy,
  Trash2,
  Upload,
} from "lucide-react";

import {
  auctionsApi,
  mainApi,
} from "../../api/appApi";
import { SOCKET_EVENT } from "../../constants/socketEvents";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import {
  formatCurrency,
  formatDate,
  formatRemainingTime,
  formatTime,
} from "../../utils/format";
import {
  Avatar,
  DetailRow,
  ErrorState,
  ImageWithFallback,
  InlineAlert,
  LoadingState,
  ListingTypeSelector,
  Modal,
  PageHeader,
  Pagination,
  Rating,
  StatusBadge,
} from "../components/ui";

const PRODUCT_STATUS_OPTIONS = [
  { value: "NEW", label: "새 상품" },
  { value: "LIKE_NEW", label: "거의 새 상품" },
  { value: "USED", label: "사용감 있음" },
  { value: "DAMAGED", label: "수리·확인 필요" },
];

function useClock(interval = 1000) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), interval);
    return () => globalThis.clearInterval(timer);
  }, [interval]);

  return now;
}

export function AuctionDetailPage() {
  const { listingIdx } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { socket, emitWithAck, isConnected } = useSocket();
  const { notify } = useToast();
  const now = useClock();
  const [selectedImage, setSelectedImage] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [bidPage, setBidPage] = useState(1);
  const [isWorking, setIsWorking] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("판매자가 직접 삭제");

  const loadAuction = useCallback(
    () => auctionsApi.get(listingIdx),
    [listingIdx],
  );
  const loadBids = useCallback(
    () => auctionsApi.bids(listingIdx, { page: bidPage, limit: 10 }),
    [bidPage, listingIdx],
  );

  const auctionRemote = useRemote(loadAuction);
  const bidRemote = useRemote(loadBids, { items: [], page: 1, totalPages: 0 });
  const auction = auctionRemote.data;
  const setAuctionData = auctionRemote.setData;
  const reloadBids = bidRemote.reload;

  useEffect(() => {
    if (!socket || !isConnected) {
      return undefined;
    }

    let active = true;
    emitWithAck(SOCKET_EVENT.AUCTION_JOIN, { listingIdx: Number(listingIdx) })
      .catch((joinError) => {
        if (active) {
          notify(joinError.message, "error");
        }
      });

    const handleBidUpdated = (payload) => {
      if (Number(payload.listingIdx) !== Number(listingIdx)) {
        return;
      }
      setAuctionData((current) => current ? {
        ...current,
        currentPrice: Number(payload.currentPrice),
        minNextBid: Number(payload.minNextBid),
        bidCount: Number(current.bidCount ?? 0) + 1,
      } : current);
      reloadBids();
    };

    const handleLeaderChanged = (payload) => {
      if (Number(payload.listingIdx) !== Number(listingIdx)) {
        return;
      }
      setAuctionData((current) => current ? {
        ...current,
        currentPrice: Number(payload.currentPrice ?? current.currentPrice),
        highestBidder: payload.highestBidderIdx
          ? {
              userIdx: Number(payload.highestBidderIdx),
              nickname: current.highestBidder?.nickname ?? "최고 입찰자",
            }
          : current.highestBidder,
      } : current);
    };

    const handleEnded = (payload) => {
      if (Number(payload.listingIdx) !== Number(listingIdx)) {
        return;
      }
      setAuctionData((current) => current ? {
        ...current,
        status: "FINISHED",
        currentPrice: Number(payload.winningPrice ?? current.currentPrice),
        viewer: {
          ...current.viewer,
          canBid: false,
          canEdit: false,
          canFavorite: false,
        },
      } : current);
      notify("경매가 종료되었습니다.", "info");
    };

    const handleDeleted = (payload) => {
      if (Number(payload.listingIdx) === Number(listingIdx)) {
        notify("삭제된 경매입니다.", "info");
        navigate("/auction", { replace: true });
      }
    };

    socket.on(SOCKET_EVENT.AUCTION_BID_UPDATED, handleBidUpdated);
    socket.on(SOCKET_EVENT.AUCTION_LEADER_CHANGED, handleLeaderChanged);
    socket.on(SOCKET_EVENT.AUCTION_ENDED, handleEnded);
    socket.on(SOCKET_EVENT.AUCTION_DELETED, handleDeleted);

    return () => {
      active = false;
      socket.off(SOCKET_EVENT.AUCTION_BID_UPDATED, handleBidUpdated);
      socket.off(SOCKET_EVENT.AUCTION_LEADER_CHANGED, handleLeaderChanged);
      socket.off(SOCKET_EVENT.AUCTION_ENDED, handleEnded);
      socket.off(SOCKET_EVENT.AUCTION_DELETED, handleDeleted);
      if (socket.connected) {
        emitWithAck(SOCKET_EVENT.AUCTION_LEAVE, { listingIdx: Number(listingIdx) }).catch(() => {});
      }
    };
  }, [emitWithAck, isConnected, listingIdx, navigate, notify, reloadBids, setAuctionData, socket]);

  const handleBid = async (event) => {
    event.preventDefault();
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/auction/${listingIdx}` } });
      return;
    }

    const amount = Number(bidAmount);
    if (!Number.isSafeInteger(amount)) {
      notify("입찰 금액을 정수로 입력해주세요.", "error");
      return;
    }

    setIsWorking(true);
    try {
      const result = await auctionsApi.bid(listingIdx, amount);
      setAuctionData((current) => ({
        ...current,
        currentPrice: Number(result.currentPrice),
        minNextBid: Number(result.minNextBid),
      }));
      setBidAmount("");
      reloadBids();
      notify("입찰이 완료되었습니다.", "success");
    } catch (bidError) {
      notify(bidError.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const handleFavorite = async () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/auction/${listingIdx}` } });
      return;
    }

    setIsWorking(true);
    try {
      const nextFavorite = !auction.viewer.isFavorite;
      const result = nextFavorite
        ? await auctionsApi.favorite(listingIdx)
        : await auctionsApi.unfavorite(listingIdx);
      setAuctionData((current) => ({
        ...current,
        favoriteCount: Number(result.favoriteCount ?? current.favoriteCount),
        viewer: {
          ...current.viewer,
          isFavorite: nextFavorite,
        },
      }));
      notify(nextFavorite ? "관심 경매에 추가했습니다." : "관심 경매에서 제거했습니다.", "success");
    } catch (favoriteError) {
      notify(favoriteError.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    const reason = deleteReason.trim();
    if (!reason) {
      notify("삭제 사유를 입력해주세요.", "error");
      return;
    }

    setIsWorking(true);
    try {
      await auctionsApi.remove(listingIdx, reason);
      setDeleteModalOpen(false);
      notify("경매를 삭제했습니다.", "success");
      navigate("/auction");
    } catch (deleteError) {
      notify(deleteError.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  if (auctionRemote.isLoading) {
    return <div className="page-container"><LoadingState label="경매 정보를 불러오는 중입니다." /></div>;
  }
  if (auctionRemote.error) {
    return <div className="page-container"><ErrorState error={auctionRemote.error} onRetry={auctionRemote.reload} /></div>;
  }
  if (!auction) {
    return null;
  }
  // console.log(JSON.parse(user))
  // console.log(user)

  const images = auction.images ?? [];
  const currentImage = images[selectedImage] ?? images[0];
  const isFinished = auction.status === "FINISHED" || new Date(auction.endsAt).getTime() <= now;

  return (
    <div className="page-container detail-page auction-detail-page">
      <div className="detail-breadcrumb">
        <Link to="/auction">경매</Link>
        <span>/</span>
        <span>{auction.category?.name}</span>
      </div>

      <section className="listing-detail">
        <div className="image-gallery">
          <div className="image-gallery__main image-gallery__main--auction">
            <ImageWithFallback
              key={currentImage?.imageUrl ?? "empty"}
              src={currentImage?.imageUrl}
              alt={auction.title}
              className="image-gallery__main-image"
            />
            <div className={`auction-timer ${isFinished ? "is-finished" : ""}`}>
              <Clock3 size={18} />
              {formatRemainingTime(auction.endsAt, now)}
            </div>
          </div>
          {images.length > 1 && (
            <div className="image-gallery__thumbs">
              {images.map((image, index) => (
                <button
                  key={image.imageIdx ?? image.imageUrl}
                  type="button"
                  className={index === selectedImage ? "is-active" : undefined}
                  onClick={() => setSelectedImage(index)}
                >
                  <ImageWithFallback
                    src={image.imageUrl}
                    alt=""
                    className="image-gallery__thumbnail"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="seller-card">
            <Avatar user={auction.seller} />
            <div>
              <p>판매자</p>
              <Link to={`/mypage/${auction.seller.userIdx}`}>{auction.seller.nickname}</Link>
              <Rating value={auction.seller.averageRating} reviewCount={auction.seller.reviewCount} compact />
            </div>
          </div>
        </div>

        <div className="listing-summary">
          <div className="listing-summary__top">
            <span>{auction.category?.name}</span>
            <StatusBadge status={isFinished ? "FINISHED" : auction.status} />
          </div>
          <h1>{auction.title}</h1>

          <div className="auction-price-panel">
            <div>
              <span>현재가</span>
              <strong>{formatCurrency(auction.currentPrice)}</strong>
            </div>
            <div>
              <span>시작가</span>
              <strong>{formatCurrency(auction.startPrice)}</strong>
            </div>
            <div>
              <span>입찰 수</span>
              <strong>{Number(auction.bidCount)}회</strong>
            </div>
          </div>

          <div className="listing-summary__metrics">
            <span><Eye size={17} />조회 {auction.viewCount}</span>
            <span><Heart size={17} />관심 {auction.favoriteCount}</span>
            <span>{isConnected ? "실시간 연결됨" : "실시간 연결 대기"}</span>
          </div>

          <dl className="detail-list">
            <DetailRow label="상품 상태">
              {PRODUCT_STATUS_OPTIONS.find((item) => item.value === auction.productStatus)?.label
                ?? auction.productStatus}
            </DetailRow>
            <DetailRow label="거래 장소">
              <span className="inline-icon-text">
                <MapPin size={16} />
                {auction.preferredTradeLocation ?? "채팅으로 협의"}
              </span>
            </DetailRow>
            <DetailRow label="종료 시간">{formatDate(auction.endsAt, { withTime: true })}</DetailRow>
          </dl>

          {!auction.viewer.isOwner && (
            <>
              <form className="bid-form" onSubmit={handleBid}>
                <label>
                  <span>입찰 금액</span>
                  <div className="input-suffix">
                    <input
                      type="number"
                      min={auction.minNextBid}
                      step="1"
                      value={bidAmount}
                      disabled={!auction.viewer.canBid || isWorking}
                      placeholder={String(auction.minNextBid)}
                      onChange={(event) => setBidAmount(event.target.value)}
                    />
                    <span>원</span>
                  </div>
                </label>
                <button
                  type="button"
                  className="text-button"
                  disabled={
                      (bidRemote.data?.items?.[0]?.bidderIdx
                        && user?.userIdx
                        && bidRemote.data?.items?.[0]?.bidderIdx == user?.userIdx
                      ) || !auction.viewer.canBid}
                  onClick={() => setBidAmount(String(auction.minNextBid))}
                >
                  최소 입찰가 {formatCurrency(auction.minNextBid)} 입력
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={
                    (bidRemote.data?.items?.[0]?.bidderIdx
                      && user?.userIdx
                      && bidRemote.data?.items?.[0]?.bidderIdx == user?.userIdx) 
                    || !auction.viewer.canBid 
                    || isWorking}
                >
                  <Gavel size={19} />
                  {isFinished ? "경매 종료" : "입찰하기"}
                </button>
              </form>

              <div className="listing-actions">
                <button
                  type="button"
                  className={`button button--secondary ${auction.viewer.isFavorite ? "is-selected" : ""}`}
                  disabled={isWorking || !auction.viewer.canFavorite}
                  onClick={handleFavorite}
                >
                  <Heart size={19} fill={auction.viewer.isFavorite ? "currentColor" : "none"} />
                  {auction.viewer.isFavorite ? "관심 해제" : "관심 경매"}
                </button>
                <InlineAlert type="info">
                  경매가 종료되면 판매자와 낙찰자의 채팅방이 자동으로 연결됩니다.
                </InlineAlert>
              </div>
            </>
          )}

          {auction.viewer.isOwner && (
            <div className="listing-actions">
              <Link
                to={`/auction/${auction.listingIdx}/edit`}
                className={`button button--secondary ${auction.viewer.canEdit ? "" : "is-disabled"}`}
              >
                <Edit3 size={18} />
                수정
              </Link>
              <button
                type="button"
                className="button button--danger"
                disabled={isWorking || !auction.viewer.canDelete}
                onClick={() => setDeleteModalOpen(true)}
              >
                <Trash2 size={18} />
                삭제
              </button>
            </div>
          )}

          <section className="bid-history">
            <header className="section-heading section-heading--compact">
              <div><p className="section-heading__eyebrow">입찰 내역</p><h2>현재 순위</h2></div>
              <History size={22} />
            </header>
            {bidRemote.isLoading && <LoadingState label="입찰 내역을 불러오는 중입니다." />}
            {bidRemote.error && <ErrorState error={bidRemote.error} onRetry={bidRemote.reload} />}
            {!bidRemote.isLoading && !bidRemote.error && (
              <>
                <div className="bid-list">
                  {(bidRemote.data?.items ?? []).map((bid, index) => (
                    <article key={bid.bidIdx} className={index === 0 ? "is-leading" : undefined}>
                      <span className="bid-list__rank">{index === 0 ? <Trophy size={18} /> : index + 1}</span>
                      <div><strong>{bid.bidderNickname}</strong><small>{formatTime(bid.createdAt)}</small></div>
                      <b>{formatCurrency(bid.bidAmount)}</b>
                    </article>
                  ))}
                  {(bidRemote.data?.items ?? []).length === 0 && <p>아직 입찰이 없습니다.</p>}
                </div>
                <Pagination page={bidRemote.data?.page} totalPages={bidRemote.data?.totalPages} onChange={setBidPage} />
              </>
            )}
          </section>
        </div>
      </section>

      {Number(auction.highestBidder?.userIdx) === Number(user?.userIdx) && !isFinished && (
        <InlineAlert tone="success">
          <Trophy size={19} />
          현재 회원님이 최고 입찰자입니다.
        </InlineAlert>
      )}
      <div className="detail-columns page-section">
        <section className="listing-description">
          <PageHeader eyebrow="상품 설명" title="경매 상품 상세 정보" />
          <p>{auction.description}</p>
        </section>

      </div>


      <Modal
        open={deleteModalOpen}
        title="경매 삭제"
        description="삭제 후에는 복구할 수 없으며 모든 입찰자에게 알림이 전송됩니다."
        onClose={() => {
          if (!isWorking) setDeleteModalOpen(false);
        }}
        footer={(
          <>
            <button
              type="button"
              className="button button--secondary"
              disabled={isWorking}
              onClick={() => setDeleteModalOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="button button--danger"
              disabled={isWorking || !deleteReason.trim()}
              onClick={handleDelete}
            >
              {isWorking ? "삭제 중..." : "경매 삭제"}
            </button>
          </>
        )}
      >
        <label className="form-field">
          <span>삭제 사유</span>
          <textarea
            rows={4}
            maxLength={200}
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}

function AuctionFormBody({ categories, auction }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const isEdit = Boolean(auction);
  const [form, setForm] = useState({
    title: auction?.title ?? "",
    description: auction?.description ?? "",
    categoryIdx: auction?.category?.categoryIdx?.toString() ?? "",
    productStatus: auction?.productStatus ?? "USED",
    startPrice: auction?.startPrice?.toString() ?? "",
    preferredTradeLocation: auction?.preferredTradeLocation ?? "",
  });
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const commonPayload = {
        title: form.title,
        description: form.description,
        categoryIdx: Number(form.categoryIdx),
        productStatus: form.productStatus,
        preferredTradeLocation: form.preferredTradeLocation,
      };
      const result = isEdit
        ? await auctionsApi.update(auction.listingIdx, commonPayload, files)
        : await auctionsApi.create({
            ...commonPayload,
            startPrice: Number(form.startPrice),
          }, files);
      const listingIdx = result.listingIdx ?? auction?.listingIdx;
      notify(isEdit ? "경매 정보를 수정했습니다." : "경매를 등록했습니다.", "success");
      navigate(`/auction/${listingIdx}`);
    } catch (submitError) {
      notify(submitError.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="listing-form" onSubmit={handleSubmit}>
      <section className="form-card">
        <header>
          <span>1</span>
          <div>
            <h2>경매 상품 사진</h2>
            <p>최대 4장의 이미지를 등록할 수 있습니다.</p>
          </div>
        </header>
        <label className="upload-box">
          <Upload size={28} />
          <strong>이미지를 선택해주세요</strong>
          <span>등록 후에도 입찰이 시작되기 전 정책 범위에서 수정할 수 있습니다.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files ?? []);

              setFiles((currentFiles) => {
                const mergedFiles = [...currentFiles, ...selectedFiles];
                const uniqueFiles = mergedFiles.filter(
                            (file, index, allFiles) => index === allFiles.findIndex(
                              (candidate) => candidate.name === file.name
                                          && candidate.size === file.size
                                          && candidate.lastModified === file.lastModified,
                            ),
                );

                return uniqueFiles.slice(0, 4);
              });

              // Reset the input so selecting the same file again still emits change.
              event.target.value = "";
            }}
          />
        </label>
        <div className="upload-preview-list">
          {previews.map((preview) => (
            <div key={`${preview.file.name}-${preview.file.lastModified}`}>
              <img src={preview.url} alt={preview.file.name} />
              <span>{preview.file.name}</span>
            </div>
          ))}
          {isEdit && files.length === 0 && auction.images?.map((image) => (
            <div key={image.imageIdx}>
              <ImageWithFallback src={image.imageUrl} alt="기존 경매 이미지" />
              <span>기존 이미지</span>
            </div>
          ))}
        </div>
      </section>

      <section className="form-card">
        <header>
          <span>2</span>
          <div>
            <h2>경매 정보</h2>
            <p>경매는 등록 시점부터 24시간 동안 진행됩니다.</p>
          </div>
        </header>

        <div className="form-grid">
          <label className="field field--wide">
            <span>상품명</span>
            <input
              name="title"
              value={form.title}
              maxLength={200}
              required
              placeholder="경매 상품명을 입력해주세요"
              onChange={updateField}
            />
          </label>

          <label className="field">
            <span>카테고리</span>
            <select name="categoryIdx" value={form.categoryIdx} required onChange={updateField}>
              <option value="">선택해주세요</option>
              {categories.map((category) => (
                <option key={category.categoryIdx} value={category.categoryIdx}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>상품 상태</span>
            <select name="productStatus" value={form.productStatus} onChange={updateField}>
              {PRODUCT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>시작 가격</span>
            <div className="input-suffix">
              <input
                name="startPrice"
                type="number"
                min="0"
                step="1"
                value={form.startPrice}
                required={!isEdit}
                disabled={isEdit}
                onChange={updateField}
              />
              <span>원</span>
            </div>
          </label>

          <label className="field">
            <span>희망 거래 장소</span>
            <input
              name="preferredTradeLocation"
              value={form.preferredTradeLocation}
              placeholder="예: 역삼역 인근"
              onChange={updateField}
            />
          </label>

          <label className="field field--wide">
            <span>상세 설명</span>
            <textarea
              name="description"
              value={form.description}
              required
              rows={8}
              placeholder="상품 상태와 구성품을 자세히 설명해주세요."
              onChange={updateField}
            />
          </label>
        </div>
      </section>

      <InlineAlert>
        <Clock3 size={19} />
        시작 가격과 종료 시각은 등록 후 변경할 수 없습니다. 서버가 24시간 종료 시각과 입찰 단위를 설정합니다.
      </InlineAlert>

      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={() => navigate(-1)}>
          취소
        </button>
        <button type="submit" className="button" disabled={isSubmitting}>
          <Gavel size={18} />
          {isSubmitting ? "저장 중..." : isEdit ? "수정 완료" : "경매 시작"}
        </button>
      </div>
    </form>
  );
}

export function AuctionFormPage() {
  const { listingIdx } = useParams();
  const isEdit = Boolean(listingIdx);

  const loadFormData = useCallback(async () => {
    const [categoryData, auction] = await Promise.all([
      mainApi.categories(),
      isEdit ? auctionsApi.get(listingIdx) : Promise.resolve(null),
    ]);
    return {
      categories: categoryData?.items ?? [],
      auction,
    };
  }, [isEdit, listingIdx]);

  const { data, error, isLoading, reload } = useRemote(loadFormData);

  return (
    <div className="page-container form-page">
      <PageHeader
        eyebrow="실시간 경매"
        title={isEdit ? "경매 수정" : "경매 등록"}
        description="경매에 등록할 상품 정보를 입력해 주세요."
        actions={!isEdit ? <ListingTypeSelector type="AUCTION" /> : undefined}
      />

      {isLoading && <LoadingState label="경매 등록 화면을 준비하는 중입니다." />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <AuctionFormBody
          key={data.auction?.listingIdx ?? "new-auction"}
          categories={data.categories}
          auction={data.auction}
        />
      )}
    </div>
  );
}
