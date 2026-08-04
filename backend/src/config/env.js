// env.js
// 서버 프로젝트에서 모든 설정값을 공통으로 호출 가능하게
// 한곳에서 설정해두는 파일

import { config } from "dotenv"

const nodeEnv = process.env.NODE_ENV ?? "development"

// [2026-08-02 13:39:52] 환경변수 불러와주기
config({
  path: `.env.${nodeEnv}`
})

// [2026-08-02 13:39:58] 환경변수 또는 기본 설정 주입용
function required(key, defaultValue=undefined) {
  const value = process.env[key] ?? defaultValue

  // 설정이 채워지지 못하면 시작 ㄴㄴ
  if(value === undefined || value === "") {
    throw new Error(`can't find env value of [${key}]`)
  }

  return value
}

// [2026-08-02 13:55:33] 선택적 문자열
function optional(key, defaultValue=null) {
  const value = process.env[key]

  return value === undefined || value === ""
          ? defaultValue
          : value
}

// [2026-08-02 13:57:32] 불린 작업
function requiredBoolean(key, defaultValue) {
  // 소문자로 만들어주기
  const value = String(required(key, defaultValue)).toLowerCase()

  if (value === "true") {
    return true
  }
  if (value === "false") {
    return false
  }

  throw new Error(
    `env variable is not true or false: { "${key}": "${value}" }`,
  );
}

// [2026-08-02 13:48:25] 숫자형 환경변수 세팅
function requiredInt(key, defaultValue=undefined) {
  const value = required(key, defaultValue)
  const result = Number(value)
  if (!Number.isInteger(result)) {
    throw new Error(`env value is not type of Int: { "${key}": "${value}" }`)
  }

  return result
}

export const env = {
  nodeEnv,

  server: {
    host: required("HOST", "127.0.0.1"),
    port: requiredInt("PORT", 8080),
  },

  client: {
    origin: required("CLIENT_ORIGIN"),
  },

  database: {
    host: required("DATABASE_HOST", "127.0.0.1"),
    port: requiredInt("DATABASE_PORT", 5432),
    name: required("DATABASE_NAME"),
    user: required("DATABASE_USER"),
    password: required("DATABASE_PASSWORD"),
  },

  redis: {
    host: required("REDIS_HOST", "127.0.0.1"),
    port: requiredInt("REDIS_PORT", 6379),
    password: required("REDIS_PASSWORD"), 
  },

  jwt: {
    accessToken: {
      expiresInSec: requiredInt("ACCESS_TOKEN_EXPIRES_IN_SEC", 900),
      cookiePath: required("ACCESS_TOKEN_COOKIE_PATH", "/"),
      secret: required("ACCESS_TOKEN_SECRET"),
    },

    refreshToken: {
      expiresInSec: requiredInt("REFRESH_TOKEN_EXPIRES_IN_SEC", 604800),
      cookiePath: required("REFRESH_TOKEN_COOKIE_PATH", "/api/auth/refresh"),
      secret: required("REFRESH_TOKEN_SECRET"),
    },
  },

  cookie: {
    secure: requiredBoolean("COOKIE_SECURE", false),
    httpOnly: requiredBoolean("COOKIE_HTTP_ONLY", true),
    sameSite: required("COOKIE_SAME_SITE", "lax"),
  },

  bcrypt: {
    saltRounds: requiredInt("BCRYPT_SALT_ROUNDS", 10),
  },

  uploads: {
    baseDir: required("UPLOAD_BASE_DIR", "uploads"),
    listingImageDir: required("UPLOAD_LISTING_IMG_DIR", "listings"),
    profileImageDir: required("UPLOAD_PROFILE_IMG_DIR", "profiles"),
    chatImageDir: required("UPLOAD_CHAT_IMG_DIR", "chats"),
    maxSizeBytes: requiredInt("UPLOAD_MAX_SIZE_BYTES", 5242880),
  },

  sms: {
    apiKey: optional("SMS_API_KEY"),
    apiSecret: optional("SMS_API_SECRET"),
    phoneFrom: optional("SMS_PHONE_FROM"),
    ownerName: optional("SMS_OWNER_NAME"),
  },

  recoveryScheduler: {
    recoveryCron: required("AUCTION_RECOVERY_CRON", "*/5 * * * *"),
  },
}
