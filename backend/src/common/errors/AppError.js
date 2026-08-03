export class AppError extends Error {
  constructor({ status, code, message, details, expose = true, cause }) {
    super(message, { cause });

    if (!Number.isInteger(status) || status < 400 || status > 599) {
      throw new TypeError("AppError status는 400~599 정수여야 합니다.");
    }
    if (typeof code !== "string" || code.trim() === "") {
      throw new TypeError("AppError code가 필요합니다.");
    }

    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}
