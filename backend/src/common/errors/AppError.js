/** 기존 위치 인자와 새 객체 인자를 모두 지원하는 공통 API 오류 객체다. */
export class AppError extends Error {
  constructor(statusOrOptions, code, message, details) {
    const options = typeof statusOrOptions === "object" && statusOrOptions !== null
      ? statusOrOptions
      : { status: statusOrOptions, code, message, details };
    super(options.message, { cause: options.cause });

    if (!Number.isInteger(options.status) || options.status < 400 || options.status > 599) {
      throw new TypeError("AppError status는 400~599 정수여야 합니다.");
    }
    if (typeof options.code !== "string" || options.code.trim() === "") {
      throw new TypeError("AppError code가 필요합니다.");
    }

    this.name = "AppError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.expose = options.expose ?? true;
  }
}
