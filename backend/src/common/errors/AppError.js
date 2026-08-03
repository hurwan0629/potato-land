/** API에서 상태 코드와 오류 코드를 일관된 형식으로 전달하는 오류 객체다. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
