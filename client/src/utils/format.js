const RESOURCE_PREFIX = "/resources/";

/**
 * 서버가 저장한 상대 경로를 브라우저가 사용할 수 있는 정적 리소스 URL로 바꾼다.
 * 개발 환경에서는 Vite의 `/resources` proxy를 사용하고, 절대 URL은 그대로 둔다.
 */
export function resolveResourceUrl(value) {
  if (!value) {
    return "";
  }

  const source = String(value).trim().replaceAll("\\", "/");
  if (!source) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(source)) {
    return source;
  }

  const resourceIndex = source.indexOf("/resources/");
  if (resourceIndex >= 0) {
    return source.slice(resourceIndex).replace(/\/+/g, "/");
  }

  const normalized = source.replace(/^\/+/, "");
  return `${RESOURCE_PREFIX}${normalized}`.replace(/\/+/g, "/");
}

export function formatCurrency(value) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toLocaleString("ko-KR") : "0"}원`;
}

export function formatDate(value, options = {}) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: options.year ?? "numeric",
    month: options.month ?? "2-digit",
    day: options.day ?? "2-digit",
    ...(options.withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
}

export function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value, now) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  if (!Number.isFinite(now)) {
    return formatDate(value, { withTime: true });
  }

  const diffSeconds = Math.round((timestamp - now) / 1000);
  const divisions = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

  let duration = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return new Intl.RelativeTimeFormat("ko-KR", { numeric: "auto" }).format(
        Math.round(duration),
        division.unit,
      );
    }
    duration /= division.amount;
  }

  return "";
}

function padTime(value) {
  return String(value).padStart(2, "0");
}

export function formatRemainingTime(endsAt, now) {
  const endTime = new Date(endsAt).getTime();
  if (Number.isNaN(endTime)) {
    return "종료 시간 미정";
  }

  const currentTime = Number.isFinite(now) ? now : Date.now();
  const remaining = Math.max(0, endTime - currentTime);
  if (remaining === 0) {
    return "종료됨";
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;

  return days > 0 ? `${days}일 ${clock}` : clock;
}

export function normalizePhone(value) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

export function asPositiveInteger(value, fallback = null) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function cx(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

export function listingPath(item) {
  const listingIdx = Number(item?.listingIdx ?? item?.idx);
  const type = String(item?.listingType ?? "USED").toUpperCase();
  return type === "AUCTION" ? `/auction/${listingIdx}` : `/products/${listingIdx}`;
}
