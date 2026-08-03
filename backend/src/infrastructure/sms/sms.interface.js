/** SMS 구현체가 필수 발송 함수를 제공하는지 확인한다. */
export function assertSmsService(service) {
  if (!service || typeof service.sendVerificationCode !== "function") {
    throw new TypeError("SMS service must implement sendVerificationCode().");
  }
  return service;
}
