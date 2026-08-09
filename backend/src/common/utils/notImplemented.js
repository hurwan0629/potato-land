/**
 * api요청시에 값이 존재하지 않으면 501 메시지를 만들어 반환해주게 됩니다.
 */
export function notImplemented(res, featureName = "요청한 기능") {
  return res.status(501).json({
    success: false,
    code: "NOT_IMPLEMENTED",
    message: `${featureName}은 아직 구현되지 않았습니다.`,
  });
}

/**
 * inbound는 만들어졌지만 실제로 반환할 값이 없으면 해당 success: false 및 메시지를 보내주게 됩니다.
 */
export function notImplementedAck(featureName = "요청한 기능") {
  return {
    success: false,
    code: "NOT_IMPLEMENTED",
    message: `${featureName}은 아직 구현되지 않았습니다.`,
  };
}
