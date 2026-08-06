/** 운영 환경에서 실수로 데모 봇이 실행되지 않도록 시작 조건을 한곳에서 검사한다. */
export function isDemoBotAllowed({ nodeEnv, enabled }) {
  return nodeEnv === "development" && enabled === true;
}

/**
 * 서로 겹치지 않는 순차 타이머를 만든다.
 * actionHandlers는 객체 등록 순서대로 한 번씩 순환한다.
 */
export function createDemoBotScheduler({
  nodeEnv,
  enabled,
  intervalMs,
  actionHandlers,
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
  onResult = () => {},
  onError = () => {},
}) {
  const actions = Object.entries(actionHandlers ?? {});
  let timer = null;
  let actionCursor = 0;
  let isRunning = false;

  async function runOnce() {
    if (!isDemoBotAllowed({ nodeEnv, enabled })) {
      return { executed: false, reason: "DISABLED" };
    }

    if (actions.length === 0) {
      return { executed: false, reason: "NO_ACTION" };
    }

    if (isRunning) {
      return { executed: false, reason: "BUSY" };
    }

    const [actionName, action] = actions[actionCursor % actions.length];
    actionCursor += 1;
    isRunning = true;

    try {
      const detail = await action();
      const result = { executed: true, actionName, detail };
      onResult(result);
      return result;
    } catch (error) {
      onError(error, actionName);
      return { executed: false, reason: "FAILED", actionName, error };
    } finally {
      isRunning = false;
    }
  }

  function start() {
    if (!isDemoBotAllowed({ nodeEnv, enabled }) || timer !== null) {
      return false;
    }

    if (!Number.isInteger(intervalMs) || intervalMs < 1_000) {
      throw new Error("DEMO_BOT_INTERVAL_MS는 1000 이상의 정수여야 합니다.");
    }

    timer = setIntervalFn(() => {
      void runOnce();
    }, intervalMs);

    return true;
  }

  function stop() {
    if (timer === null) {
      return false;
    }

    clearIntervalFn(timer);
    timer = null;
    return true;
  }

  return {
    start,
    stop,
    runOnce,
    get isStarted() {
      return timer !== null;
    },
  };
}
