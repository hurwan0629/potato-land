/** 브라우저 기록을 갱신하고 현재 React 화면에 경로 변경을 알린다. */
export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
