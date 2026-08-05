/** 비동기 Controller 오류를 Express 오류 미들웨어로 전달한다. */
export function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    return Promise.resolve(handler(req, res, next)).catch(next);
  };
}