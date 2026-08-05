/**
 * value에서 필요없는 값을 제외해줍니다.
 * 
 * Error인 경우에는 name, message, stack만 뽑아서 일반 객체 형태로 반환해주며
 * 
 * Array인 경우에는 Object로 출력되지 않게 값을 모두 정상 값으로 변형해줍니다.
 * 
 * 일반적인 값인 경우에는 그냥 출력해주며 object인 경우에는 내부에 민감한 키의 value를 [REDACTED] 로 바꿔주게 됩니다.
 */
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

  // 값을 리스트로 만든 뒤 다시 객체로 만들어줍니다.
  // 객체 안에 key중 민감값이 될 수 있는 키의 경우에는 검열하여 출력해줍니다.
  // 아닌 경우에는 다시 재귀적으로 풀어주게 됩니다.
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

/**
 * 콘솔 객체에 level에 맞는 것이 있다면 그것으로 출력해주고 없으면 일반 console.log 객체를 사용해줍니다.
 * 
 * scope에는 meta값에 scope 값이 있다면 그것을 출력해주고 없으면 defaultScope(4번 인자)를 레벨로 설정해줍니다.
 * 
 * scope가 있다면 출력해주게 됩니다.
 * 
 * 최종적으로 `[ISO시간] [레벨] [scope] {메시지} {meta?}` 를 줄력하게 됩니다.
 */
function write(level, message, meta, defaultScope) {
  const log = console[level] ?? console.log;
  const scope = meta?.scope ?? defaultScope;
  const scopeText = scope ? ` [${scope}]` : "";

  // [시간] [레벨(info/warn/error)] [?scopeText - meta?.scope -> defaultScope -> ""] message + meta(data)
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
 * 
 * 기본적으로 info, warn, error 타입만 존재하게 됩니다.
 * 
 * 사용 방식은 logger.로거()를 사용하여 로깅용 객체를 할당받은 뒤 message와 meta를 넣어 사용할 수 있습니다.
 * EX) log = logger.info("auction controller"); log(message, meta)
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
