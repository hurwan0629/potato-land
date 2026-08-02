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
