let requestCounter = 0;

function createRequestId(prefix = "ADMIN") {
  const now = new Date();
  const dateText = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");

  requestCounter = (requestCounter + 1) % 10000;

  return `${dateText}-${prefix}-${String(requestCounter).padStart(4, "0")}`;
}

function sendAdminData(res, data, options = {}) {
  res.status(options.statusCode || 200).json({
    code: 0,
    message: options.message || "ok",
    data,
    requestId: options.requestId || createRequestId("ADMIN")
  });
}

function sendAdminError(res, message, options = {}) {
  res.status(options.statusCode || 400).json({
    code: options.code || 50000,
    message: message || "服务异常",
    data: null,
    requestId: options.requestId || createRequestId("ADMIN")
  });
}

module.exports = {
  createRequestId,
  sendAdminData,
  sendAdminError
};
