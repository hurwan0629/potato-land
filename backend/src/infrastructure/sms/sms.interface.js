import { env } from "../../config/env.js";

let sendWithProvider = null;

/** 객체형 SMS 구현체가 인증번호 발송 함수를 제공하는지 확인한다. */
export function assertSmsService(service) {
  if (!service || typeof service.sendVerificationCode !== "function") {
    throw new TypeError("SMS service must implement sendVerificationCode().");
  }
  return service;
}

/** 
 *  실제 SMS SDK를 고른 뒤 provider 호출 함수만 이 자리에 주입한다.
 */
export function configureSmsProvider(send) {
  if (typeof send !== "function") {
    throw new TypeError("SMS provider 전송 함수가 필요합니다.");
  }
  sendWithProvider = send;
}

/**
 * smsWithProvider과 필요한 키들이 존재하는지 확인해줍니다.
 */
export function isSmsConfigured() {
  return Boolean(
    sendWithProvider &&
      env.sms.apiKey &&
      env.sms.apiSecret &&
      env.sms.phoneFrom,
  );
}

/**
 * sendVerificationCode({ to, code })를 통해 해당 전화번호로 code를 보내줍니다.
 * 
 * 여기에서 사용되는 함수는 sendWithProvider({ apyKey, apiSecret, from, to, text 입니다.})
 * 
 * 이중 apiKey, apiSecret, from은 env.js에서 주입되게 됩니다.
 */
export async function sendVerificationCode({ to, code }) {
  if (!isSmsConfigured()) {
    throw new Error("SMS provider가 설정되지 않았습니다.");
  }

  const normalizedCode = String(code);
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new TypeError("SMS 인증번호는 6자리 숫자여야 합니다.");
  }

  return sendWithProvider({
    apiKey: env.sms.apiKey, 
    apiSecret: env.sms.apiSecret,
    from: env.sms.phoneFrom,
    to,
    text: `[${env.sms.ownerName ?? "감자나라"}] 인증번호는 ${normalizedCode}입니다.`,
  });
}
