import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Gavel,
  Info,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { auctionsApi, mainApi, usedApi } from "../../api/appApi";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import {
  ErrorState,
  ImageWithFallback,
  ListingTypeSelector,
  LoadingState,
  PageHeader,
} from "../components/ui";

const PRODUCT_STATUS_OPTIONS = [
  { value: "NEW", label: "새 상품" },
  { value: "LIKE_NEW", label: "거의 새 상품" },
  { value: "USED", label: "사용감 있음" },
  { value: "DAMAGED", label: "수리·확인 필요" },
];

function fileIdentity(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function mergeImageFiles(currentFiles, selectedFiles) {
  const fileMap = new Map();

  [...currentFiles, ...selectedFiles].forEach((file) => {
    fileMap.set(fileIdentity(file), file);
  });

  return [...fileMap.values()].slice(0, 4);
}

function ListingImagePicker({ files, setFiles, existingImages = [], notify }) {
  const inputRef = useRef(null);
  const previews = useMemo(
    () => files.map((file) => ({
      kind: "file",
      key: fileIdentity(file),
      file,
      url: URL.createObjectURL(file),
    })),
    [files],
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const displayedImages = files.length > 0
    ? previews
    : existingImages.slice(0, 4).map((image) => ({
        kind: "existing",
        key: `existing-${image.imageIdx ?? image.imageUrl}`,
        url: image.imageUrl,
      }));

  const openPicker = () => inputRef.current?.click();

  const handleFiles = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    setFiles((currentFiles) => {
      const mergedFiles = mergeImageFiles(currentFiles, selectedFiles);
      if (currentFiles.length + selectedFiles.length > 4) {
        notify("이미지는 최대 4장까지 등록할 수 있습니다.", "info");
      }
      return mergedFiles;
    });

    // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 input 값을 비운다.
    event.target.value = "";
  };

  const removeFile = (fileKey) => {
    setFiles((currentFiles) => currentFiles.filter(
      (file) => fileIdentity(file) !== fileKey,
    ));
  };

  return (
    <div className="listing-image-picker">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        hidden
        onChange={handleFiles}
      />

      <div className="listing-image-grid">
        {Array.from({ length: 4 }, (_, index) => {
          const image = displayedImages[index];

          if (image) {
            const isSelectedFile = image.kind === "file";
            return (
              <button
                key={image.key}
                type="button"
                className={`listing-image-slot is-filled ${isSelectedFile ? "is-removable" : "is-existing"}`}
                aria-label={isSelectedFile ? `${index + 1}번째 이미지 삭제` : `${index + 1}번째 기존 이미지`}
                onClick={() => {
                  if (isSelectedFile) {
                    removeFile(image.key);
                  } else {
                    openPicker();
                  }
                }}
              >
                {isSelectedFile ? (
                  <img src={image.url} alt={`${index + 1}번째 선택 이미지`} />
                ) : (
                  <ImageWithFallback
                    src={image.url}
                    alt={`${index + 1}번째 기존 이미지`}
                    className="listing-image-slot__image"
                  />
                )}
                {isSelectedFile ? (
                  <span className="listing-image-slot__remove" aria-hidden="true">
                    <X size={16} />
                  </span>
                ) : (
                  <span className="listing-image-slot__existing">기존</span>
                )}
              </button>
            );
          }

          return (
            <button
              key={`empty-${index}`}
              type="button"
              className={`listing-image-slot is-empty ${index === 0 ? "is-primary" : ""}`}
              aria-label={`${index + 1}번째 이미지 추가`}
              onClick={openPicker}
            >
              {index === 0 ? <Camera size={26} /> : <Plus size={21} />}
              {index === 0 && <span>사진 추가</span>}
            </button>
          );
        })}
      </div>

      <p className="listing-image-help">
        <Info size={15} />
        첫 번째 사진이 대표 이미지로 등록됩니다. 선택한 이미지는 눌러서 삭제할 수 있습니다.
      </p>
      {existingImages.length > 0 && files.length === 0 && (
        <p className="listing-image-help listing-image-help--secondary">
          새 이미지를 선택하면 기존 이미지 전체가 새 선택 이미지로 교체됩니다.
        </p>
      )}
    </div>
  );
}

function ListingEditor({ type, categories, listing }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const isAuction = type === "AUCTION";
  const isEdit = Boolean(listing);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    categoryIdx: listing?.category?.categoryIdx?.toString() ?? "",
    productStatus: listing?.productStatus ?? "USED",
    price: listing?.price?.toString() ?? "",
    startPrice: listing?.startPrice?.toString() ?? "",
    preferredTradeLocation: listing?.preferredTradeLocation ?? "",
  });

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isEdit && files.length === 0) {
      notify("상품 이미지를 한 장 이상 등록해주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const commonPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryIdx: Number(form.categoryIdx),
        productStatus: form.productStatus,
        preferredTradeLocation: form.preferredTradeLocation.trim(),
      };

      let result;
      if (isAuction) {
        result = isEdit
          ? await auctionsApi.update(listing.listingIdx, commonPayload, files)
          : await auctionsApi.create({
              ...commonPayload,
              startPrice: Number(form.startPrice),
            }, files);
      } else {
        const payload = {
          ...commonPayload,
          price: Number(form.price),
        };
        result = isEdit
          ? await usedApi.update(listing.listingIdx, payload, files)
          : await usedApi.create(payload, files);
      }

      const listingIdx = result.listingIdx ?? listing?.listingIdx;
      notify(isEdit ? "상품 정보를 수정했습니다." : "상품을 등록했습니다.", "success");
      navigate(isAuction ? `/auction/${listingIdx}` : `/products/${listingIdx}`);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="listing-editor" onSubmit={handleSubmit}>
      <h2 className="listing-editor__title">상품 정보</h2>

      <div className="listing-editor__columns">
        <section className="listing-editor__column listing-editor__column--left">
          <label className="field">
            <span>상품명</span>
            <input
              name="title"
              value={form.title}
              maxLength={200}
              required
              placeholder="상품명을 입력해 주세요"
              onChange={updateField}
            />
          </label>

          <label className="field">
            <span>카테고리</span>
            <select
              name="categoryIdx"
              value={form.categoryIdx}
              required
              onChange={updateField}
            >
              <option value="">카테고리를 선택해 주세요</option>
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
            <span>{isAuction ? "경매 시작 가격" : "판매 가격"}</span>
            <div className="input-suffix listing-editor__price">
              <input
                name={isAuction ? "startPrice" : "price"}
                type="number"
                min="0"
                step="1"
                value={isAuction ? form.startPrice : form.price}
                required={!isAuction || !isEdit}
                disabled={isAuction && isEdit}
                onChange={updateField}
              />
              <span>원</span>
            </div>
          </label>

          <div className="listing-editor__image-field">
            <div className="listing-editor__label-row">
              <strong>상품 이미지</strong>
              <small>최대 4장</small>
            </div>
            <ListingImagePicker
              files={files}
              setFiles={setFiles}
              existingImages={listing?.images ?? []}
              notify={notify}
            />
          </div>
        </section>

        <section className="listing-editor__column listing-editor__column--right">
          <label className="field listing-editor__description">
            <span>상품 설명</span>
            <textarea
              name="description"
              value={form.description}
              required
              rows={12}
              placeholder="상품의 상태, 구매 시기, 구성품 등을 자세히 적어주세요."
              onChange={updateField}
            />
          </label>

          <label className="field">
            <span>거래 희망 지역</span>
            <input
              name="preferredTradeLocation"
              value={form.preferredTradeLocation}
              placeholder="예: 서울시 강남구"
              onChange={updateField}
            />
          </label>
        </section>
      </div>

      <div className="listing-editor__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => navigate(-1)}
        >
          취소
        </button>
        <button type="submit" className="button" disabled={isSubmitting}>
          {isAuction ? <Gavel size={18} /> : <ShoppingBag size={18} />}
          {isSubmitting ? "저장 중..." : isEdit ? "수정하기" : "등록하기"}
        </button>
      </div>
    </form>
  );
}

function ListingFormPage({ type }) {
  const { listingIdx } = useParams();
  const isAuction = type === "AUCTION";
  const isEdit = Boolean(listingIdx);

  const loadFormData = useCallback(async () => {
    const [categoryData, listing] = await Promise.all([
      mainApi.categories(),
      isEdit
        ? (isAuction ? auctionsApi.get(listingIdx) : usedApi.get(listingIdx))
        : Promise.resolve(null),
    ]);

    return {
      categories: categoryData?.items ?? [],
      listing,
    };
  }, [isAuction, isEdit, listingIdx]);

  const { data, error, isLoading, reload } = useRemote(loadFormData);
  const title = isAuction ? "경매 물품" : "중고 거래";

  return (
    <div className="page-container form-page listing-editor-page">
      <PageHeader
        title={`${title} ${isEdit ? "수정" : "등록"}`}
        description="판매할 상품 정보를 입력해 주세요."
        actions={!isEdit ? <ListingTypeSelector type={type} /> : undefined}
      />

      {isLoading && <LoadingState label="상품 등록 화면을 준비하는 중입니다." />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <ListingEditor
          key={data.listing?.listingIdx ?? `new-${type}`}
          type={type}
          categories={data.categories}
          listing={data.listing}
        />
      )}
    </div>
  );
}

export function UsedFormPage() {
  return <ListingFormPage type="USED" />;
}

export function AuctionFormPage() {
  return <ListingFormPage type="AUCTION" />;
}
