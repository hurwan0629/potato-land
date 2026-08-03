
/**
 * Error을 상속받아 만들어진 에러 클래스로 해당 클래스는
 * throw new AppError({ status, code, message, details, expose, cause })를 통해서 생성할 수 있습니다.
 * 
 * 기본 값으로는 status는 400~599만 가능하며 code는 반드시 string 타입의 문자열이 있어야합니다.
 */
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
