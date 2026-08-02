function sanitize(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.includes("password") ||
        normalizedKey.includes("token") ||
        normalizedKey.includes("cookie") ||
        normalizedKey.includes("authorization")
      ) {
        return [key, "[REDACTED]"];
      }

      return [key, sanitize(entryValue)];
    }),
  );
}

function write(level, message, meta) {
  const log = console[level] ?? console.log;
  if (meta === undefined) {
    log(`[${level}] ${message}`);
    return;
  }

  log(`[${level}] ${message}`, sanitize(meta));
}

/**
 * logger.info(메시지, 데이터): `[info] 메시지 데이터`가 작성되게 됨
 * logger.warn(메시지, 데이터): `[warn] 메시지 데이터`가 작성되게 됨
 * logger.error(메시지, 데이터): `[error] 메시지 데이터`가 작성되게 됨
 */
export const logger = Object.freeze({
  info(message, meta) {
    write("info", message, meta);
  },

  warn(message, meta) {
    write("warn", message, meta);
  },

  error(message, meta) {
    write("error", message, meta);
  },
});
