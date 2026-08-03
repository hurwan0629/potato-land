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

function write(level, message, meta, defaultScope) {
  const log = console[level] ?? console.log;
  const scope = meta?.scope ?? defaultScope;
  const scopeText = scope ? ` [${scope}]` : "";
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]${scopeText}`;
  if (meta === undefined) {
    log(`${prefix} ${message}`);
    return;
  }

  const { scope: _scope, ...rest } = meta;
  if (Object.keys(rest).length === 0) {
    log(`${prefix} ${message}`);
    return;
  }

  log(`${prefix} ${message}`, sanitize(rest));
}

function createMethods(scope) {
  return Object.freeze({
    info(message, meta) {
      write("info", message, meta, scope);
    },

    warn(message, meta) {
      write("warn", message, meta, scope);
    },

    error(message, meta) {
      write("error", message, meta, scope);
    },
  });
}

/**
 * 모든 로그는 ISO 시각, 단계, 메시지, 선택 메타데이터 순서로 출력한다.
 * 위치는 logger.child("모듈명")으로 고정하거나 meta.scope로 한 번만 지정한다.
 */
export const logger = Object.freeze({
  ...createMethods(),
  child(scope) {
    if (typeof scope !== "string" || scope.trim() === "") {
      throw new TypeError("로그 위치를 나타낼 모듈 이름이 필요합니다.");
    }
    return createMethods(scope.trim());
  },
});
