
/**
 * 갈 수 있는 url을 찾지 못하는 경우에는 err가 아니기 때문에 해당 미들웨어가 404 및 NOT_FOUND, 메시지와 body를 넣어줍니다.
 */
export function notFoundMiddleware(req, res) {
  return res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "요청한 API를 찾을 수 없습니다.",
    details: {
      method: req.method,
      path: req.originalUrl,
    },
  });
}
