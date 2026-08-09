const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor({ status = 0, code = "NETWORK_ERROR", message, details = null, cause }) {
    super(message ?? "요청을 처리하지 못했습니다.", { cause });
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler = null;
let refreshPromise = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ApiError({
      status: response.status,
      code: "INVALID_SERVER_RESPONSE",
      message: "서버 응답을 읽지 못했습니다.",
      cause,
    });
  }
}

async function rawRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers,
    signal,
  } = options;

  const hasBody = body !== undefined && body !== null;
  const formDataBody = isFormData(body);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        Accept: "application/json",
        ...(hasBody && !formDataBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: hasBody ? (formDataBody ? body : JSON.stringify(body)) : undefined,
    });
  } catch (cause) {
    if (cause?.name === "AbortError") {
      throw cause;
    }

    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "서버에 연결하지 못했습니다. 백엔드 실행 상태를 확인해주세요.",
      cause,
    });
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.code ?? `HTTP_${response.status}`,
      message: payload?.message ?? `요청에 실패했습니다. (${response.status})`,
      details: payload?.details ?? null,
    });
  }

  return payload;
}

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rawRequest("/auth/refresh", { method: "POST" }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function isRefreshCandidate(path) {
  return ![
    "/auth/login",
    "/auth/signup",
    "/auth/refresh",
    "/auth/refresh/logout",
    "/auth/phone/send",
    "/auth/phone/verify",
    "/auth/find-id",
    "/auth/password/reset",
  ].some((authPath) => path.startsWith(authPath));
}

async function request(path, options = {}, retried = false) {
  try {
    return await rawRequest(path, options);
  } catch (error) {
    if (
      error instanceof ApiError
      && error.status === 401
      && !retried
      && isRefreshCandidate(path)
    ) {
      try {
        await refreshAccessToken();
        return await request(path, options, true);
      } catch (refreshError) {
        unauthorizedHandler?.();
        throw refreshError;
      }
    }

    throw error;
  }
}

export function unwrap(response) {
  return response?.data ?? response;
}

export function toQueryString(parameters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(parameters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function createFormData(values, files = []) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value === "object" && !(value instanceof Blob)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });

  files.forEach((file) => formData.append("images", file));
  return formData;
}

export const http = {
  get(path, options = {}) {
    return request(path, options);
  },

  post(path, body, options = {}) {
    return request(path, { ...options, method: "POST", body });
  },

  patch(path, body, options = {}) {
    return request(path, { ...options, method: "PATCH", body });
  },

  delete(path, body, options = {}) {
    return request(path, { ...options, method: "DELETE", body });
  },
};
