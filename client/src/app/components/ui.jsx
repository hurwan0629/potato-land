import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import listingTypeMenuImage from "../../assets/ui/listing-type-menu.png";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
  Star,
  X,
} from "lucide-react";

import {
  cx,
  formatCurrency,
  formatDate,
  formatRemainingTime,
  listingPath,
  resolveResourceUrl,
} from "../../utils/format";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function ListingTypeSelector({ type }) {
  const [open, setOpen] = useState(false);
  const label = type === "AUCTION" ? "경매 물품 등록" : "중고 거래 등록";

  return (
    <div className="listing-type-selector">
      <button type="button" className="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {label}<span className="listing-type-selector__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="listing-type-selector__menu">
          <img src={listingTypeMenuImage} alt="중고 거래 등록 또는 경매 물품 등록 선택" />
          <Link to="/products/register" aria-label="중고 거래 등록" />
          <Link to="/auction/new" aria-label="경매 물품 등록" />
        </div>
      )}
    </div>
  );
}

export function LoadingState({ label = "불러오는 중입니다." }) {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={30} />
      <strong>{label}</strong>
      <p>잠시만 기다려주세요.</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <AlertTriangle size={32} />
      <strong>{error?.message ?? "문제가 발생했습니다."}</strong>
      <p>서버 실행 상태와 입력값을 확인해주세요.</p>
      {onRetry && (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          <RefreshCw size={17} />
          다시 시도
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "표시할 내용이 없습니다.",
  description = "조건을 바꾸거나 새로운 항목을 등록해보세요.",
  action,
}) {
  return (
    <div className="state-card">
      <PackageOpen size={34} />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ImageWithFallback({ src, alt, className, fallbackLabel = "이미지 없음" }) {
  const [failed, setFailed] = useState(false);
  const resourceUrl = resolveResourceUrl(src);

  if (!resourceUrl || failed) {
    return (
      <div className={cx("image-fallback", className)} aria-label={fallbackLabel}>
        <ImageOff size={30} />
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={resourceUrl}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function Avatar({ user, size = "medium" }) {
  return (
    <span className={`avatar avatar--${size}`}>
      {user?.profileImageUrl ? (
        <ImageWithFallback
          src={user.profileImageUrl}
          alt={`${user.nickname ?? "사용자"} 프로필`}
          className="avatar__image"
          fallbackLabel=""
        />
      ) : (
        <span aria-hidden="true">🥔</span>
      )}
    </span>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status ?? "UNKNOWN").toUpperCase();
  const labels = {
    ON_SALE: "판매 중",
    SOLD: "판매 완료",
    RESERVED: "예약 중",
    ON_GOING: "진행 중",
    FINISHED: "종료",
    REQUESTED: "요청됨",
    COMPLETED: "거래 완료",
    CANCELED: "취소",
    ACTIVE: "정상",
    BANNED: "정지",
    WITHDRAWN: "탈퇴",
  };

  return (
    <span className={`status-badge status-badge--${normalized.toLowerCase()}`}>
      {labels[normalized] ?? normalized}
    </span>
  );
}

export function ProductCard({ item, compact = false }) {
  const isAuction = String(item?.listingType).toUpperCase() === "AUCTION";
  const price = item?.displayPrice ?? item?.currentPrice ?? item?.price ?? 0;

  return (
    <Link
      to={listingPath(item)}
      className={cx("product-card", compact && "product-card--compact")}
    >
      <div className="product-card__media">
        <ImageWithFallback
          src={item?.thumbnailUrl}
          alt={item?.title ?? "상품 이미지"}
          className="product-card__image"
        />
        <span className="product-card__category">
          {item?.category?.name ?? item?.categoryName ?? "카테고리"}
        </span>
        {item?.status && (
          <span className="product-card__status">
            <StatusBadge status={item.status} />
          </span>
        )}
        {isAuction && item?.endsAt && (
          <span className="product-card__timer">{formatRemainingTime(item.endsAt)}</span>
        )}
      </div>

      <div className="product-card__body">
        <h3>{item?.title ?? "제목 없는 상품"}</h3>
        <strong className="product-card__price">{formatCurrency(price)}</strong>

        <div className="product-card__meta">
          <span>{formatDate(item?.createdAt ?? item?.registeredAt ?? item?.created_at)}</span>
          <span>
            <Heart size={15} />
            {Number(item?.favoriteCount ?? 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ items, emptyTitle }) {
  if (!items?.length) {
    return <EmptyState title={emptyTitle ?? "조건에 맞는 상품이 없습니다."} />;
  }

  return (
    <div className="product-grid">
      {items.map((item) => (
        <ProductCard
          key={`${item.listingType}-${item.listingIdx}`}
          item={item}
        />
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        className="icon-button"
        disabled={currentPage <= 1}
        aria-label="이전 페이지"
        onClick={() => onChange(currentPage - 1)}
      >
        <ChevronLeft size={18} />
      </button>

      {pages.map((number) => (
        <button
          key={number}
          type="button"
          className={cx("pagination__number", number === currentPage && "is-active")}
          aria-current={number === currentPage ? "page" : undefined}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}

      <button
        type="button"
        className="icon-button"
        disabled={currentPage >= totalPages}
        aria-label="다음 페이지"
        onClick={() => onChange(currentPage + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export function Rating({ value, reviewCount, compact = false }) {
  const rating = Number(value ?? 0);
  return (
    <span className={cx("rating", compact && "rating--compact")}>
      <Star size={compact ? 15 : 18} fill="currentColor" />
      <strong>{rating.toFixed(1)}</strong>
      {reviewCount !== undefined && <span>후기 {Number(reviewCount)}개</span>}
    </span>
  );
}

export function StatCard({ label, value, description, icon }) {
  return (
    <article className="stat-card">
      <span className="stat-card__icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {description && <small>{description}</small>}
      </div>
    </article>
  );
}

export function Tabs({ items, value, onChange, ariaLabel = "탭" }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={cx("tabs__button", value === item.value && "is-active")}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, title, description, children, onClose, footer, className = "" }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={cx("modal", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="닫기"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function InlineAlert({ children, tone, type }) {
  const variant = tone ?? type ?? "info";
  return (
    <div className={`inline-alert inline-alert--${variant}`} role={variant === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function DetailRow({ label, children }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
