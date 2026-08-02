export function notImplemented(res, featureName = "요청한 기능") {
  return res.status(501).json({
    success: false,
    code: "NOT_IMPLEMENTED",
    message: `${featureName}은 아직 구현되지 않았습니다.`,
  });
}

export function notImplementedAck(featureName = "요청한 기능") {
  return {
    success: false,
    code: "NOT_IMPLEMENTED",
    message: `${featureName}은 아직 구현되지 않았습니다.`,
  };
}
