import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 비동기 조회의 loading/data/error 상태와 재조회 함수를 한 곳에서 관리한다.
 * effect 본문에서는 외부 요청만 예약하고, 상태 변경은 Promise callback에서 수행한다.
 */
export function useRemote(loader, initialData = null) {
  const requestIdRef = useRef(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [state, setState] = useState({
    data: initialData,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let active = true;

    Promise.resolve()
      .then(() => {
        if (active && requestIdRef.current === requestId) {
          setState((current) => ({
            ...current,
            error: null,
            isLoading: true,
          }));
        }
        return loader();
      })
      .then((data) => {
        if (!active || requestIdRef.current !== requestId) {
          return;
        }

        setState({
          data,
          error: null,
          isLoading: false,
        });
      })
      .catch((error) => {
        if (!active || requestIdRef.current !== requestId || error?.name === "AbortError") {
          return;
        }

        setState((current) => ({
          ...current,
          error,
          isLoading: false,
        }));
      });

    return () => {
      active = false;
    };
  }, [loader, reloadVersion]);

  const reload = useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const setData = useCallback((updater) => {
    setState((current) => ({
      ...current,
      data: typeof updater === "function" ? updater(current.data) : updater,
    }));
  }, []);

  return {
    ...state,
    reload,
    setData,
  };
}
