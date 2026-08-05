import { SolapiMessageService } from "solapi";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";
import { assertSmsService, configureSmsProvider } from "./sms.interface.js";

let messageService;

/** 환경변수를 확인하고 SOLAPI SDK 클라이언트를 한 번만 생성한다. */
function getMessageService() {
  if (!env.sms.apiKey || !env.sms.apiSecret || !env.sms.phoneFrom) {
    throw new AppError({ status: 503, code: "SMS_CONFIGURATION_ERROR", message: "SMS 발송 설정이 완료되지 않았습니다." });
  }
  messageService ??= new SolapiMessageService(env.sms.apiKey, env.sms.apiSecret);
  return messageService;
}

// export function configureSolApiSmsService() {
//   configureSmsProvider(getMessageService)
// }

/** SOLAPI를 통해 회원가입용 6자리 인증번호 문자메시지를 발송한다. */
async function sendVerificationCode({ to, code }) {
  try {
    return await getMessageService().send
    ({
      to,
      from: env.sms.phoneFrom.replace(/[^\d]/g, ""),
      text: `[감자나라] 인증번호는 ${code}입니다. 3분 안에 입력해주세요.`,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError({ status: 502, code: "SMS_SEND_FAILED", message: "인증번호 발송에 실패했습니다." });
  }
}

export const solapiSmsService = assertSmsService({ sendVerificationCode });


