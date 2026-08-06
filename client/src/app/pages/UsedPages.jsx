import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Edit3,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  Trash2,
  Upload,
} from "lucide-react";

import { chatApi, mainApi, usedApi } from "../../api/appApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import { formatCurrency, formatDate } from "../../utils/format";
import {
  Avatar,
  DetailRow,
  ErrorState,
  ImageWithFallback,
  InlineAlert,
  LoadingState,
  ListingTypeSelector,
  PageHeader,
  Rating,
  StatusBadge,
} from "../components/ui";

const PRODUCT_STATUS_OPTIONS = [
  { value: "NEW", label: "새 상품" },
  { value: "LIKE_NEW", label: "거의 새 상품" },
  { value: "USED", label: "사용감 있음" },
  { value: "DAMAGED", label: "수리·확인 필요" },
];

export function UsedDetailPage() {
  const { listingIdx } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { notify } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  const loadListing = useCallback(
    () => usedApi.get(listingIdx),
    [listingIdx],
  );
  const { data: listing, error, isLoading, reload, setData } = useRemote(loadListing);

  const handleFavorite = async () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/products/${listingIdx}` } });
      return;
    }

    setIsWorking(true);
    try {
      const nextFavorite = !listing.viewer.isFavorite;
      const result = nextFavorite
        ? await usedApi.favorite(listingIdx)
        : await usedApi.unfavorite(listingIdx);

      setData((current) => ({
        ...current,
        favoriteCount: Number(result.favoriteCount ?? current.favoriteCount),
        viewer: {
          ...current.viewer,
          isFavorite: nextFavorite,
        },
      }));
      notify(nextFavorite ? "관심상품에 추가했습니다." : "관심상품에서 제거했습니다.", "success");
    } catch (favoriteError) {
      notify(favoriteError.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const handleChat = async () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/products/${listingIdx}` } });
      return;
    }

    setIsWorking(true);
    try {
      const room = await chatApi.create(Number(listingIdx));
      navigate(`/chat/${room.chatRoomIdx}`);
    } catch (chatError) {
      notify(chatError.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = globalThis.confirm("이 중고상품을 삭제할까요?");
    if (!confirmed) {
      return;
    }

    const reason = globalThis.prompt("삭제 사유를 입력해주세요.", "판매자가 직접 삭제") ?? "";
    if (!reason.trim()) {
      return;
    }

    setIsWorking(true);
    try {
      await usedApi.remove(listingIdx, reason.trim());
      notify("상품을 삭제했습니다.", "success");
      navigate("/search");
    } catch (deleteError) {
      notify(deleteError.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading) {
    return <div className="page-container"><LoadingState label="상품 정보를 불러오는 중입니다." /></div>;
  }
  if (error) {
    return <div className="page-container"><ErrorState error={error} onRetry={reload} /></div>;
  }
  if (!listing) {
    return null;
  }

  const images = listing.images ?? [];
  const currentImage = images[selectedImage] ?? images[0];

  return (
    <div className="page-container detail-page">
      <div className="detail-breadcrumb">
        <Link to="/search">중고거래</Link>
        <span>/</span>
        <span>{listing.category?.name}</span>
      </div>

      <section className="listing-detail">
        <div className="image-gallery">
          <div className="image-gallery__main">
            <ImageWithFallback
              key={currentImage?.imageUrl ?? "empty"}
              src={currentImage?.imageUrl}
              alt={listing.title}
              className="image-gallery__main-image"
            />
          </div>
          {images.length > 1 && (
            <div className="image-gallery__thumbs">
              {images.map((image, index) => (
                <button
                  key={image.imageIdx ?? image.imageUrl}
                  type="button"
                  className={index === selectedImage ? "is-active" : undefined}
                  aria-label={`${index + 1}번째 이미지 보기`}
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
        </div>

        <div className="listing-summary">
          <div className="listing-summary__top">
            <span>{listing.category?.name}</span>
            <StatusBadge status={listing.tradeStatus} />
          </div>
          <h1>{listing.title}</h1>
          <strong className="listing-summary__price">{formatCurrency(listing.price)}</strong>

          <div className="listing-summary__metrics">
            <span><Eye size={17} />조회 {listing.viewCount}</span>
            <span><Heart size={17} />관심 {listing.favoriteCount}</span>
            <span>{formatDate(listing.createdAt)}</span>
          </div>

          <dl className="detail-list">
            <DetailRow label="상품 상태">
              {PRODUCT_STATUS_OPTIONS.find((item) => item.value === listing.productStatus)?.label
                ?? listing.productStatus}
            </DetailRow>
            <DetailRow label="거래 장소">
              <span className="inline-icon-text">
                <MapPin size={16} />
                {listing.preferredTradeLocation ?? "채팅으로 협의"}
              </span>
            </DetailRow>
          </dl>

          <div className="seller-card">
            <Avatar user={listing.seller} />
            <div>
              <p>판매자</p>
              <Link to={`/mypage/${listing.seller.userIdx}`}>{listing.seller.nickname}</Link>
              <Rating
                value={listing.seller.averageRating}
                reviewCount={listing.seller.reviewCount}
                compact
              />
            </div>
          </div>

          {!listing.viewer.isOwner && (
            <div className="listing-actions">
              <button
                type="button"
                className={`button button--secondary ${listing.viewer.isFavorite ? "is-selected" : ""}`}
                disabled={isWorking || !listing.viewer.canFavorite}
                onClick={handleFavorite}
              >
                <Heart size={19} fill={listing.viewer.isFavorite ? "currentColor" : "none"} />
                {listing.viewer.isFavorite ? "관심 해제" : "관심상품"}
              </button>
              <button
                type="button"
                className="button"
                disabled={isWorking || !listing.viewer.canChat}
                onClick={handleChat}
              >
                <MessageCircle size={19} />
                판매자와 채팅
              </button>
            </div>
          )}

          {listing.viewer.isOwner && (
            <div className="listing-actions">
              <Link
                to={`/products/${listing.listingIdx}/edit`}
                className={`button button--secondary ${listing.viewer.canEdit ? "" : "is-disabled"}`}
                aria-disabled={!listing.viewer.canEdit}
              >
                <Edit3 size={18} />
                수정
              </Link>
              <button
                type="button"
                className="button button--danger"
                disabled={isWorking || !listing.viewer.canDelete}
                onClick={handleDelete}
              >
                <Trash2 size={18} />
                삭제
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="listing-description page-section">
        <PageHeader
          eyebrow="상품 설명"
          title="판매자가 남긴 상세 정보"
        />
        <p>{listing.description}</p>
      </section>
    </div>
  );
}

function UsedFormBody({ categories, listing }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const isEdit = Boolean(listing);
  const [form, setForm] = useState({
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    categoryIdx: listing?.category?.categoryIdx?.toString() ?? "",
    productStatus: listing?.productStatus ?? "USED",
    price: listing?.price?.toString() ?? "",
    preferredTradeLocation: listing?.preferredTradeLocation ?? "",
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

  const handleFiles = (event) => {
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
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        categoryIdx: Number(form.categoryIdx),
        price: Number(form.price),
      };
      const result = isEdit
        ? await usedApi.update(listing.listingIdx, payload, files)
        : await usedApi.create(payload, files);
      const listingIdx = result.listingIdx ?? listing?.listingIdx;
      notify(isEdit ? "상품 정보를 수정했습니다." : "중고상품을 등록했습니다.", "success");
      navigate(`/products/${listingIdx}`);
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
            <h2>상품 사진</h2>
            <p>최대 4장까지 등록할 수 있습니다.</p>
          </div>
        </header>

        <label className="upload-box">
          <Upload size={28} />
          <strong>이미지를 선택해주세요</strong>
          <span>JPG, PNG, GIF, WEBP · 파일당 서버 설정 용량 이내</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFiles}
          />
        </label>

        <div className="upload-preview-list">
          {previews.map((preview) => (
            <div key={`${preview.file.name}-${preview.file.lastModified}`}>
              <img src={preview.url} alt={preview.file.name} />
              <span>{preview.file.name}</span>
            </div>
          ))}
          {isEdit && files.length === 0 && listing.images?.map((image) => (
            <div key={image.imageIdx}>
              <ImageWithFallback src={image.imageUrl} alt="기존 상품 이미지" />
              <span>기존 이미지</span>
            </div>
          ))}
        </div>
      </section>

      <section className="form-card">
        <header>
          <span>2</span>
          <div>
            <h2>기본 정보</h2>
            <p>구매자가 이해하기 쉽게 정확하게 작성해주세요.</p>
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
              placeholder="예: 거의 새것인 기계식 키보드"
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
            <span>가격</span>
            <div className="input-suffix">
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                required
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
              placeholder="예: 강남역 3번 출구"
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
              placeholder="사용 기간, 하자 여부, 구성품 등을 자세히 적어주세요."
              onChange={updateField}
            />
          </label>
        </div>
      </section>

      <InlineAlert>
        <PackageCheck size={19} />
        실제 상품 상태와 다른 정보를 입력하면 거래 과정에서 문제가 생길 수 있어요.
      </InlineAlert>

      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={() => navigate(-1)}>
          취소
        </button>
        <button type="submit" className="button" disabled={isSubmitting}>
          <ShoppingBag size={18} />
          {isSubmitting ? "저장 중..." : isEdit ? "수정 완료" : "상품 등록"}
        </button>
      </div>
    </form>
  );
}

export function UsedFormPage() {
  const { listingIdx } = useParams();
  const isEdit = Boolean(listingIdx);

  const loadFormData = useCallback(async () => {
    const [categoryData, listing] = await Promise.all([
      mainApi.categories(),
      isEdit ? usedApi.get(listingIdx) : Promise.resolve(null),
    ]);
    return {
      categories: categoryData?.items ?? [],
      listing,
    };
  }, [isEdit, listingIdx]);

  const { data, error, isLoading, reload } = useRemote(loadFormData);

  return (
    <div className="page-container form-page">
      <PageHeader
        eyebrow="중고거래"
        title={isEdit ? "중고 거래 수정" : "중고 거래 등록"}
        description="판매할 상품 정보를 입력해 주세요."
        actions={!isEdit ? <ListingTypeSelector type="USED" /> : undefined}
      />

      {isLoading && <LoadingState label="등록 화면을 준비하는 중입니다." />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <UsedFormBody
          key={data.listing?.listingIdx ?? "new-used-listing"}
          categories={data.categories}
          listing={data.listing}
        />
      )}
    </div>
  );
}
